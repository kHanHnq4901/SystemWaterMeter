import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/maintenance/stats/summary - Get maintenance statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    // Use HIS_DATA_MESSAGE as the backing store for maintenance alerts
    const result = await connection.request().query(`
      SELECT
        COUNT(*) as totalOrders,
        SUM(CASE WHEN CONFIRM_STATUS = 0 THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN CONFIRM_STATUS = 1 THEN 1 ELSE 0 END) as confirmedOrders,
        SUM(CASE WHEN READ_STATUS = 0 THEN 1 ELSE 0 END) as unreadOrders
      FROM HIS_DATA_MESSAGE
      WHERE CREATED >= DATEADD(month, -1, GETDATE())
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get maintenance stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance - Get maintenance records from HIS_DATA_MESSAGE
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, fromDate, toDate } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (fromDate) {
      params.push({ name: "fromDate", value: fromDate });
      whereClause += " AND a.CREATED >= @fromDate";
    }
    if (toDate) {
      params.push({ name: "toDate", value: toDate });
      whereClause += " AND a.CREATED <= @toDate";
    }

    const connection = await pool.connect();

    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.value));
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM HIS_DATA_MESSAGE a ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT
        a.MESSAGE_ID as id,
        a.MESSAGE_TYPE as alertType,
        a.MESSAGE_CONTENT as message,
        a.METER_NO as meterNo,
        a.CREATED as createdDate,
        a.READ_STATUS as isRead,
        a.CONFIRM_STATUS as confirmStatus,
        a.VERIFY_USER_ID as verifyUserId
      FROM HIS_DATA_MESSAGE a
      ${whereClause}
      ORDER BY a.CREATED DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parseInt(pageSize as string)} ROWS ONLY
    `);

    res.json({
      success: true,
      data: {
        list: result.recordset,
        total: countResult.recordset[0].total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }
    });
  } catch (error) {
    console.error("Get maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance/:id - Get single record
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, parseInt(req.params.id))
      .query(`
        SELECT
          a.MESSAGE_ID as id,
          a.MESSAGE_TYPE as alertType,
          a.MESSAGE_CONTENT as message,
          a.METER_NO as meterNo,
          a.CREATED as createdDate,
          a.READ_STATUS as isRead,
          a.CONFIRM_STATUS as confirmStatus,
          m.METER_NAME as meterName,
          m.ADDRESS as address,
          m.CUSTOMER_CODE as customerCode
        FROM HIS_DATA_MESSAGE a
        LEFT JOIN INFO_METER m ON a.METER_NO = m.METER_NO
        WHERE a.MESSAGE_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Bản ghi không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get maintenance detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
