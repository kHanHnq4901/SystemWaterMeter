import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/dashboard/stats — Tổng hợp số liệu dashboard
router.get("/stats", async (req, res) => {
  try {
    const connection = await pool.connect();

    // 1. Thống kê đồng hồ theo trạng thái
    const meterStats = await connection.request().query(`
      SELECT
        COUNT(*)                                          as total,
        SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END)       as active,
        SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END)       as notInstalled,
        SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END)       as broken,
        SUM(CASE WHEN STATE = 3 THEN 1 ELSE 0 END)       as removed
      FROM INFO_METER
    `);

    // 2. Thống kê gateway
    const gatewayStats = await connection.request().query(`
      SELECT
        COUNT(*)                                                                          as total,
        SUM(CASE WHEN LASTTIME_CONNECT >= DATEADD(hour, -24, GETDATE()) THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN LASTTIME_CONNECT <  DATEADD(hour, -24, GETDATE()) OR LASTTIME_CONNECT IS NULL THEN 1 ELSE 0 END) as offline
      FROM INFO_GATEWAY
    `);

    // 3. Số bản ghi đọc hôm nay
    const todayReadings = await connection.request().query(`
      SELECT COUNT(*) as count
      FROM HIS_INSTANT_METER
      WHERE CAST(CREATED as DATE) = CAST(GETDATE() as DATE)
    `);

    // 4. Thống kê loại đồng hồ
    const meterTypeStats = await connection.request().query(`
      SELECT
        ISNULL(CAST(METER_TYPE as VARCHAR), 'N/A') as meterType,
        COUNT(*) as count
      FROM INFO_METER
      GROUP BY METER_TYPE
      ORDER BY count DESC
    `);

    // 5. Xu hướng 7 ngày (số lần đọc + đồng hồ duy nhất)
    const weeklyTrend = await connection.request().query(`
      SELECT
        CONVERT(varchar, CREATED, 23)     as date,
        COUNT(*)                          as readingCount,
        COUNT(DISTINCT METER_NO)          as uniqueMeters,
        AVG(CAST(SIGNAL as FLOAT))        as avgSignal
      FROM HIS_INSTANT_METER
      WHERE CREATED >= DATEADD(day, -6, CAST(GETDATE() as DATE))
      GROUP BY CONVERT(varchar, CREATED, 23)
      ORDER BY date ASC
    `);

    // 6. Đồng hồ không gửi dữ liệu 24h (ngoại tuyến)
    const offlineMeters = await connection.request().query(`
      SELECT TOP 10
        m.METER_NO  as meterNo,
        m.METER_NAME as meterName,
        m.ADDRESS   as address,
        m.CUSTOMER_CODE as customerCode,
        hi.lastSeen
      FROM INFO_METER m
      OUTER APPLY (
        SELECT MAX(CREATED) as lastSeen
        FROM HIS_INSTANT_METER
        WHERE METER_NO = m.METER_NO
      ) hi
      WHERE m.STATE = 1
        AND (hi.lastSeen IS NULL OR hi.lastSeen < DATEADD(hour, -24, GETDATE()))
      ORDER BY hi.lastSeen DESC
    `);

    // 7. Đồng hồ theo nhóm (GROUP_ID)
    const groupStats = await connection.request().query(`
      SELECT TOP 8
        ISNULL(CAST(GROUP_ID as VARCHAR), 'Chưa phân nhóm') as groupName,
        COUNT(*)                                              as total,
        SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END)           as active
      FROM INFO_METER
      GROUP BY GROUP_ID
      ORDER BY total DESC
    `);

    res.json({
      code: 0,
      data: {
        meters:        meterStats.recordset[0],
        gateways:      gatewayStats.recordset[0],
        todayReadings: todayReadings.recordset[0].count,
        meterTypeStats: meterTypeStats.recordset,
        weeklyTrend:   weeklyTrend.recordset,
        offlineMeters: offlineMeters.recordset,
        groupStats:    groupStats.recordset
      }
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
