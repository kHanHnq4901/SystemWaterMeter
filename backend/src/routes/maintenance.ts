import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/maintenance/stats/summary
router.get("/stats/summary", async (_req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(*) as totalOrders,
        SUM(CASE WHEN CONFIRM_STATUS = 0 THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN CONFIRM_STATUS = 1 THEN 1 ELSE 0 END) as confirmedOrders,
        SUM(CASE WHEN READ_STATUS = 0 THEN 1 ELSE 0 END)    as unreadOrders
      FROM HIS_DATA_MESSAGE WITH(NOLOCK)
      WHERE CREATED >= DATEADD(month, -1, GETDATE())
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    console.error("Get maintenance stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, fromDate, toDate } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE 1=1";
    const params: { name: string; type: any; value: any }[] = [];

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
          a.METER_NO        as meterNo,
          a.CREATED         as createdDate,
          a.READ_STATUS     as isRead,
          a.CONFIRM_STATUS  as confirmStatus,
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
    console.error("Get maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance/:id
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, parseInt(req.params.id))
      .query(`
        SELECT
          a.MESSAGE_ID      as id,
          a.MESSAGE_TYPE    as alertType,
          a.MESSAGE_CONTENT as message,
          a.METER_NO        as meterNo,
          a.CREATED         as createdDate,
          a.READ_STATUS     as isRead,
          a.CONFIRM_STATUS  as confirmStatus,
          m.METER_NAME      as meterName,
          m.ADDRESS         as address,
          m.CUSTOMER_CODE   as customerCode
        FROM HIS_DATA_MESSAGE a WITH(NOLOCK)
        LEFT JOIN INFO_METER m WITH(NOLOCK) ON a.METER_NO = m.METER_NO
        WHERE a.MESSAGE_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Bản ghi không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    console.error("Get maintenance detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
