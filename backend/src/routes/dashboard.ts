import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/dashboard/summary - Get dashboard summary stats
router.get("/summary", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Meter stats from INFO_METER
    const meterStats = await connection.request().query(`
      SELECT
        COUNT(*) as totalMeters,
        SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) as activeMeters,
        SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END) as inactiveMeters,
        SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END) as errorMeters
      FROM INFO_METER
    `);

    // Gateway stats: distinct GATEWAY_NO from HIS_INSTANT_METER (last 24h = online)
    const gatewayStats = await connection.request().query(`
      SELECT
        COUNT(DISTINCT GATEWAY_NO) as totalGateways,
        COUNT(DISTINCT CASE WHEN CREATED >= DATEADD(hour, -24, GETDATE()) THEN GATEWAY_NO END) as onlineGateways,
        COUNT(DISTINCT CASE WHEN CREATED < DATEADD(hour, -24, GETDATE()) THEN GATEWAY_NO END) as offlineGateways
      FROM HIS_INSTANT_METER
      WHERE GATEWAY_NO IS NOT NULL AND GATEWAY_NO != ''
    `);

    // Customer stats: distinct CUSTOMER_CODE from INFO_METER
    const customerStats = await connection.request().query(`
      SELECT
        COUNT(DISTINCT CUSTOMER_CODE) as totalCustomers,
        COUNT(DISTINCT CASE WHEN STATE = 1 THEN CUSTOMER_CODE END) as activeCustomers
      FROM INFO_METER
      WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''
    `);

    // Recent alerts from HIS_DATA_MESSAGE
    const alertsResult = await connection.request().query(`
      SELECT TOP 10
        MESSAGE_ID as id,
        MESSAGE_TYPE as alertType,
        MESSAGE_CONTENT as message,
        CREATED as time,
        CASE WHEN READ_STATUS = 1 THEN 'read' ELSE 'unread' END as status,
        METER_NO as meterNo
      FROM HIS_DATA_MESSAGE
      ORDER BY CREATED DESC
    `);

    // Unread alert count
    const unreadAlerts = await connection.request().query(`
      SELECT COUNT(*) as unreadCount FROM HIS_DATA_MESSAGE WHERE READ_STATUS = 0
    `);

    // Recent readings from HIS_INSTANT_METER
    const latestReadings = await connection.request().query(`
      SELECT TOP 10
        hi.METER_NO as meterNo,
        m.METER_NAME as meterName,
        hi.REALTIME as currentReading,
        hi.SIGNAL as signal,
        hi.VOLTAGE as voltage,
        hi.REMAIN_BATTERY as remainBattery,
        hi.CREATED as lastUpdate,
        hi.GATEWAY_NO as gatewayNo
      FROM HIS_INSTANT_METER hi
      LEFT JOIN INFO_METER m ON hi.METER_NO = m.METER_NO
      ORDER BY hi.CREATED DESC
    `);

    res.json({
      success: true,
      data: {
        meters: meterStats.recordset[0],
        gateways: gatewayStats.recordset[0],
        customers: customerStats.recordset[0],
        alerts: alertsResult.recordset,
        unreadAlerts: unreadAlerts.recordset[0].unreadCount,
        latestReadings: latestReadings.recordset
      }
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/consumption-chart - Get reading chart data
router.get("/consumption-chart", async (req, res) => {
  try {
    const { type = "daily" } = req.query;
    const connection = await pool.connect();

    let dateFormat: string;

    switch (type) {
      case "hourly":
        dateFormat = "CONVERT(varchar, CREATED, 24)";
        break;
      case "monthly":
        dateFormat = "FORMAT(CREATED, 'yyyy-MM')";
        break;
      default: // daily
        dateFormat = "CONVERT(varchar, CREATED, 23)";
    }

    const result = await connection.request().query(`
      SELECT
        ${dateFormat} as date,
        COUNT(*) as readingCount,
        AVG(CAST(SIGNAL as float)) as avgSignal,
        AVG(CAST(VOLTAGE as float)) as avgVoltage
      FROM HIS_INSTANT_METER
      WHERE CREATED >= DATEADD(month, -1, GETDATE())
      GROUP BY ${dateFormat}
      ORDER BY date
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get chart data error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/group-consumption - Get meters by group
router.get("/zone-consumption", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT TOP 10
        CAST(m.GROUP_ID as varchar) as name,
        COUNT(m.METER_NO) as meterCount,
        SUM(CASE WHEN m.STATE = 1 THEN 1 ELSE 0 END) as activeCount
      FROM INFO_METER m
      WHERE m.GROUP_ID IS NOT NULL
      GROUP BY m.GROUP_ID
      ORDER BY meterCount DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get group data error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/meter-status - Get meter status distribution
router.get("/meter-status", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        CASE
          WHEN STATE = 1 THEN 'Hoạt động'
          WHEN STATE = 0 THEN 'Ngừng'
          WHEN STATE = 2 THEN 'Lỗi'
          ELSE 'Không xác định'
        END as name,
        COUNT(*) as value
      FROM INFO_METER
      GROUP BY STATE
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get meter status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/realtime - Get real-time data
router.get("/realtime", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Latest readings per meter (last 24h)
    const latestReadings = await connection.request().query(`
      SELECT TOP 50
        hi.METER_NO as meterNo,
        m.METER_NAME as meterName,
        m.CUSTOMER_CODE as customerCode,
        hi.REALTIME as currentReading,
        hi.SIGNAL as signal,
        hi.VOLTAGE as voltage,
        hi.REMAIN_BATTERY as remainBattery,
        hi.CREATED as lastUpdate,
        hi.GATEWAY_NO as gatewayNo,
        hi.STATUS as status
      FROM HIS_INSTANT_METER hi
      LEFT JOIN INFO_METER m ON hi.METER_NO = m.METER_NO
      WHERE hi.CREATED >= DATEADD(hour, -24, GETDATE())
      ORDER BY hi.CREATED DESC
    `);

    // Active gateways (sent data in last 24h)
    const activeGateways = await connection.request().query(`
      SELECT
        GATEWAY_NO as code,
        COUNT(DISTINCT METER_NO) as meterCount,
        MAX(CREATED) as lastOnline,
        AVG(CAST(SIGNAL as float)) as avgSignal
      FROM HIS_INSTANT_METER
      WHERE CREATED >= DATEADD(hour, -24, GETDATE())
        AND GATEWAY_NO IS NOT NULL AND GATEWAY_NO != ''
      GROUP BY GATEWAY_NO
      ORDER BY lastOnline DESC
    `);

    res.json({
      success: true,
      data: {
        meters: latestReadings.recordset,
        gateways: activeGateways.recordset
      }
    });
  } catch (error) {
    console.error("Get realtime data error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
