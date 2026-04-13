import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/dashboard/summary - Get dashboard summary stats
router.get("/summary", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Meter stats
    const meterStats = await connection.request().query(`
      SELECT 
        COUNT(*) as totalMeters,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as activeMeters,
        SUM(CASE WHEN STATUS = 0 THEN 1 ELSE 0 END) as inactiveMeters
      FROM WM_WATER_METER
    `);

    // Gateway stats
    const gatewayStats = await connection.request().query(`
      SELECT 
        COUNT(*) as totalGateways,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as onlineGateways,
        SUM(CASE WHEN STATUS = 0 THEN 1 ELSE 0 END) as offlineGateways
      FROM WM_GATEWAY
    `);

    // Customer stats
    const customerStats = await connection.request().query(`
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as activeCustomers
      FROM WM_CUSTOMER
    `);

    // Invoice stats - this month
    const invoiceStats = await connection.request().query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(CASE WHEN STATUS = 3 THEN TOTAL_AMOUNT ELSE 0 END) as collectedAmount,
        SUM(CASE WHEN STATUS = 1 THEN TOTAL_AMOUNT ELSE 0 END) as pendingAmount,
        SUM(CASE WHEN STATUS = 2 THEN TOTAL_AMOUNT ELSE 0 END) as overdueAmount
      FROM WM_INVOICE
      WHERE MONTH(INVOICE_DATE) = MONTH(GETDATE()) AND YEAR(INVOICE_DATE) = YEAR(GETDATE())
    `);

    // Today's consumption
    const consumptionStats = await connection.request().query(`
      SELECT 
        SUM(READING_VALUE) as todayConsumption,
        (SELECT SUM(READING_VALUE) FROM WM_READING WHERE READING_DATE >= DATEADD(day, -1, GETDATE()) AND READING_DATE < GETDATE()) as yesterdayConsumption,
        (SELECT SUM(READING_VALUE) FROM WM_READING WHERE READING_DATE >= DATEADD(month, -1, GETDATE())) as monthlyConsumption
      FROM WM_READING
      WHERE READING_DATE >= CAST(GETDATE() AS DATE)
    `);

    // Recent alerts
    const alertsResult = await connection.request().query(`
      SELECT TOP 10
        ALERT_ID as id,
        ALERT_TYPE as alertType,
        ALERT_MESSAGE as message,
        ALERT_TIME as time,
        CASE WHEN IS_READ = 1 THEN 'read' ELSE 'unread' END as status
      FROM WM_ALERT
      ORDER BY ALERT_TIME DESC
    `);

    res.json({
      success: true,
      data: {
        meters: meterStats.recordset[0],
        gateways: gatewayStats.recordset[0],
        customers: customerStats.recordset[0],
        invoices: invoiceStats.recordset[0],
        consumption: consumptionStats.recordset[0],
        alerts: alertsResult.recordset
      }
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/consumption-chart - Get consumption chart data
router.get("/consumption-chart", async (req, res) => {
  try {
    const { type = "daily", fromDate, toDate } = req.query;
    const connection = await pool.connect();

    let dateFormat, dateDiff;

    switch (type) {
      case "hourly":
        dateFormat = "CONVERT(varchar, READING_DATE, 24)";
        dateDiff = "hour";
        break;
      case "monthly":
        dateFormat = "FORMAT(READING_DATE, 'yyyy-MM')";
        dateDiff = "month";
        break;
      default: // daily
        dateFormat = "CONVERT(varchar, READING_DATE, 23)";
        dateDiff = "day";
    }

    const result = await connection.request().query(`
      SELECT 
        ${dateFormat} as date,
        SUM(READING_VALUE) as consumption
      FROM WM_READING
      WHERE READING_DATE >= DATEADD(month, -1, GETDATE())
      GROUP BY ${dateFormat}
      ORDER BY date
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get consumption chart error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/zone-consumption - Get consumption by zone
router.get("/zone-consumption", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT TOP 10
        z.ZONE_NAME as name,
        COUNT(wm.WATER_METER_ID) as meterCount,
        SUM(r.READING_VALUE) as consumption
      FROM WM_ZONE z
      LEFT JOIN WM_WATER_METER wm ON z.ZONE_ID = wm.ZONE_ID
      LEFT JOIN WM_READING r ON wm.WATER_METER_ID = r.WATER_METER_ID
        AND r.READING_DATE >= DATEADD(month, -1, GETDATE())
      GROUP BY z.ZONE_ID, z.ZONE_NAME
      ORDER BY consumption DESC
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get zone consumption error:", error);
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
          WHEN STATUS = 1 THEN 'Hoạt động'
          WHEN STATUS = 0 THEN 'Ngừng'
          WHEN STATUS = 2 THEN 'Lỗi'
          ELSE 'Không xác định'
        END as name,
        COUNT(*) as value,
        '#10b981' as color
      FROM WM_WATER_METER
      GROUP BY STATUS
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

    // Get latest readings
    const latestReadings = await connection.request().query(`
      SELECT TOP 50
        wm.WATER_METER_ID as id,
        wm.METER_CODE as meterCode,
        wm.LAST_READING as currentReading,
        wm.STATUS as status,
        wm.LAST_READING_DATE as lastUpdate,
        c.CUSTOMER_NAME as customerName
      FROM WM_WATER_METER wm
      JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
      WHERE wm.STATUS = 1
      ORDER BY wm.LAST_READING_DATE DESC
    `);

    // Get active gateways
    const activeGateways = await connection.request().query(`
      SELECT 
        GATEWAY_ID as id,
        GATEWAY_CODE as code,
        GATEWAY_NAME as name,
        LAST_ONLINE as lastOnline,
        SIGNAL_STRENGTH as signal
      FROM WM_GATEWAY
      WHERE STATUS = 1
      ORDER BY LAST_ONLINE DESC
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
