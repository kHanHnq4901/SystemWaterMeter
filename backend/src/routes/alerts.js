import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/alerts - Get all alerts
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      type,
      status,
      fromDate,
      toDate
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (type) {
      params.push({ name: "type", value: parseInt(type) });
      whereClause += " AND a.ALERT_TYPE = @type";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND a.IS_READ = @status";
    }
    if (fromDate) {
      params.push({ name: "fromDate", value: fromDate });
      whereClause += " AND a.ALERT_TIME >= @fromDate";
    }
    if (toDate) {
      params.push({ name: "toDate", value: toDate });
      whereClause += " AND a.ALERT_TIME <= @toDate";
    }

    const connection = await pool.connect();

    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total FROM WM_ALERT a ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        a.ALERT_ID as id,
        a.ALERT_TYPE as alertType,
        a.ALERT_MESSAGE as message,
        a.ALERT_TIME as time,
        a.IS_READ as isRead,
        a.RELATED_ID as relatedId,
        a.RELATED_TYPE as relatedType,
        CASE 
          WHEN a.ALERT_TYPE = 1 THEN 'Cảnh báo mất kết nối'
          WHEN a.ALERT_TYPE = 2 THEN 'Cảnh báo pin yếu'
          WHEN a.ALERT_TYPE = 3 THEN 'Cảnh báo tiêu thụ bất thường'
          WHEN a.ALERT_TYPE = 4 THEN 'Cảnh báo rò rỉ nước'
          WHEN a.ALERT_TYPE = 5 THEN 'Thông báo'
          ELSE 'Không xác định'
        END as alertTypeName,
        CASE 
          WHEN a.RELATED_TYPE = 'meter' THEN 'Đồng hồ'
          WHEN a.RELATED_TYPE = 'gateway' THEN 'Gateway'
          ELSE 'Hệ thống'
        END as relatedTypeName
      FROM WM_ALERT a
      ${whereClause}
      ORDER BY a.ALERT_TIME DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(pageSize)} ROWS ONLY
    `);

    res.json({
      success: true,
      data: {
        list: result.recordset,
        total: countResult.recordset[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/:id - Get single alert
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`SELECT * FROM WM_ALERT WHERE ALERT_ID = @id`);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Cảnh báo không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get alert error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/:id/read - Mark alert as read
router.put("/:id/read", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`UPDATE WM_ALERT SET IS_READ = 1 WHERE ALERT_ID = @id`);

    res.json({ success: true, message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    console.error("Mark alert read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/read-all - Mark all alerts as read
router.put("/read-all", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .query(`UPDATE WM_ALERT SET IS_READ = 1 WHERE IS_READ = 0`);

    res.json({ success: true, message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    console.error("Mark all alerts read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`DELETE FROM WM_ALERT WHERE ALERT_ID = @id`);

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete alert error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        COUNT(*) as totalAlerts,
        SUM(CASE WHEN IS_READ = 0 THEN 1 ELSE 0 END) as unreadCount,
        SUM(CASE WHEN ALERT_TYPE = 1 THEN 1 ELSE 0 END) as connectionAlerts,
        SUM(CASE WHEN ALERT_TYPE = 2 THEN 1 ELSE 0 END) as batteryAlerts,
        SUM(CASE WHEN ALERT_TYPE = 3 THEN 1 ELSE 0 END) as consumptionAlerts,
        SUM(CASE WHEN ALERT_TYPE = 4 THEN 1 ELSE 0 END) as leakAlerts
      FROM WM_ALERT
      WHERE ALERT_TIME >= DATEADD(day, -30, GETDATE())
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get alert stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
