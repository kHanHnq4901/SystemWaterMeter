import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/alerts
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
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE 1=1";
    const params: { name: string; type: any; value: any }[] = [];

    if (type) {
      params.push({ name: "type", type: mssql.Int, value: parseInt(type as string) });
      whereClause += " AND a.MESSAGE_TYPE = @type";
    }
    if (status !== undefined && status !== "") {
      params.push({ name: "status", type: mssql.Int, value: parseInt(status as string) });
      whereClause += " AND a.READ_STATUS = @status";
    }
    if (fromDate) {
      params.push({ name: "fromDate", type: mssql.NVarChar, value: fromDate });
      whereClause += " AND a.CREATED >= @fromDate";
    }
    if (toDate) {
      params.push({ name: "toDate", type: mssql.NVarChar, value: toDate });
      whereClause += " AND a.CREATED <= @toDate";
    }

    const connection = await pool.connect();

    const addParams = (r: mssql.Request) => {
      params.forEach(p => r.input(p.name, p.type, p.value));
      return r;
    };

    const dataReq = addParams(connection.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, parseInt(pageSize as string));

    const [countResult, result] = await Promise.all([
      addParams(connection.request()).query(
        `SELECT COUNT(*) as total FROM HIS_DATA_MESSAGE a WITH(NOLOCK) ${whereClause}`
      ),
      dataReq.query(`
        SELECT
          a.MESSAGE_ID      as id,
          a.MESSAGE_TYPE    as alertType,
          a.MESSAGE_CONTENT as message,
          a.CREATED         as time,
          a.READ_STATUS     as isRead,
          a.CONFIRM_STATUS  as confirmStatus,
          a.METER_NO        as relatedId,
          a.VERIFY_USER_ID  as verifyUserId
        FROM HIS_DATA_MESSAGE a WITH(NOLOCK)
        ${whereClause}
        ORDER BY a.CREATED DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `)
    ]);

    res.json({
      success: true,
      data: {
        list: result.recordset,
        total: countResult.recordset[0].total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }
    });
  } catch (error: any) {
    console.error("Get alerts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/:id
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`SELECT * FROM HIS_DATA_MESSAGE WITH(NOLOCK) WHERE MESSAGE_ID = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Thông báo không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    console.error("Get alert error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`UPDATE HIS_DATA_MESSAGE SET READ_STATUS = 1 WHERE MESSAGE_ID = @id`);

    res.json({ success: true, message: "Đã đánh dấu đã đọc" });
  } catch (error: any) {
    console.error("Mark alert read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/alerts/read-all
router.put("/read-all", async (_req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .query(`UPDATE HIS_DATA_MESSAGE SET READ_STATUS = 1 WHERE READ_STATUS = 0`);

    res.json({ success: true, message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error: any) {
    console.error("Mark all alerts read error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/alerts/:id
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`DELETE FROM HIS_DATA_MESSAGE WHERE MESSAGE_ID = @id`);

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error: any) {
    console.error("Delete alert error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/alerts/stats/summary
router.get("/stats/summary", async (_req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(*) as totalAlerts,
        SUM(CASE WHEN READ_STATUS = 0 THEN 1 ELSE 0 END)    as unreadCount,
        SUM(CASE WHEN CONFIRM_STATUS = 0 THEN 1 ELSE 0 END)  as pendingConfirm,
        SUM(CASE WHEN CONFIRM_STATUS = 1 THEN 1 ELSE 0 END)  as confirmed
      FROM HIS_DATA_MESSAGE WITH(NOLOCK)
      WHERE CREATED >= DATEADD(day, -30, GETDATE())
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    console.error("Get alert stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
