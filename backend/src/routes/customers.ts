import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/customers
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, state, search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''";
    const params: { name: string; type: any; value: any }[] = [];

    if (state !== undefined && state !== "") {
      params.push({ name: "state", type: mssql.Int, value: parseInt(state as string) });
      whereClause += " AND STATE = @state";
    }
    if (search) {
      params.push({ name: "search", type: mssql.NVarChar, value: `%${search}%` });
      whereClause += " AND (CUSTOMER_CODE LIKE @search OR PHONE LIKE @search OR ADDRESS LIKE @search)";
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
      addParams(connection.request()).query(`
        SELECT COUNT(DISTINCT CUSTOMER_CODE) as total
        FROM INFO_METER WITH(NOLOCK)
        ${whereClause}
      `),
      dataReq.query(`
        SELECT
          c.CUSTOMER_CODE as customerCode,
          c.PHONE as phone,
          c.ADDRESS as address,
          c.meterCount,
          c.activeMeterCount,
          c.lastUpdate,
          CASE WHEN c.activeMeterCount > 0 THEN 1 ELSE 0 END as hasActiveMeters
        FROM (
          SELECT
            CUSTOMER_CODE,
            MAX(PHONE) as phone,
            MAX(ADDRESS) as address,
            COUNT(METER_NO) as meterCount,
            SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) as activeMeterCount,
            MAX(CREATED) as lastUpdate
          FROM INFO_METER WITH(NOLOCK)
          ${whereClause}
          GROUP BY CUSTOMER_CODE
        ) c
        ORDER BY c.CUSTOMER_CODE
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
    console.error("Get customers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/stats/summary
router.get("/stats/summary", async (_req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(DISTINCT CUSTOMER_CODE) as totalCustomers,
        COUNT(DISTINCT CASE WHEN STATE = 1 THEN CUSTOMER_CODE END) as activeCustomers,
        COUNT(DISTINCT CASE WHEN STATE = 0 THEN CUSTOMER_CODE END) as inactiveCustomers,
        COUNT(METER_NO) as totalMeters
      FROM INFO_METER WITH(NOLOCK)
      WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''
    `);

    const stats = result.recordset[0];
    res.json({
      success: true,
      data: {
        totalCustomers:   stats.totalCustomers   || 0,
        activeCustomers:  stats.activeCustomers  || 0,
        inactiveCustomers:stats.inactiveCustomers|| 0,
        totalMeters:      stats.totalMeters      || 0
      }
    });
  } catch (error: any) {
    console.error("Get customer stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/:customerCode — detail + meters in parallel
router.get("/:customerCode", async (req, res) => {
  try {
    const connection = await pool.connect();

    const [summaryResult, metersResult] = await Promise.all([
      connection.request()
        .input("customerCode", mssql.VarChar, req.params.customerCode)
        .query(`
          SELECT
            CUSTOMER_CODE as customerCode,
            MAX(PHONE) as phone,
            MAX(ADDRESS) as address,
            COUNT(METER_NO) as meterCount,
            SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) as activeMeterCount,
            MAX(CREATED) as lastUpdate
          FROM INFO_METER WITH(NOLOCK)
          WHERE CUSTOMER_CODE = @customerCode
          GROUP BY CUSTOMER_CODE
        `),
      connection.request()
        .input("customerCode", mssql.VarChar, req.params.customerCode)
        .query(`
          SELECT
            m.METER_NO          as meterNo,
            m.METER_NAME        as meterName,
            m.METER_MODEL_ID    as meterModelId,
            m.STATE             as state,
            m.ADDRESS           as address,
            m.IMEI              as imei,
            m.CREATED           as created,
            hi.REALTIME         as realtime,
            hi.SIGNAL           as signal,
            hi.VOLTAGE          as voltage,
            hi.REMAIN_BATTERY   as remainBattery,
            hi.GATEWAY_NO       as gatewayNo,
            hi.CREATED          as lastSeen
          FROM INFO_METER m WITH(NOLOCK)
          OUTER APPLY (
            SELECT TOP 1 REALTIME, SIGNAL, VOLTAGE, REMAIN_BATTERY, GATEWAY_NO, CREATED
            FROM HIS_INSTANT_METER WITH(NOLOCK)
            WHERE METER_NO = m.METER_NO
            ORDER BY CREATED DESC
          ) hi
          WHERE m.CUSTOMER_CODE = @customerCode
          ORDER BY m.METER_NO
        `)
    ]);

    if (summaryResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Khách hàng không tồn tại" });
    }

    res.json({
      success: true,
      data: {
        ...summaryResult.recordset[0],
        meters: metersResult.recordset
      }
    });
  } catch (error: any) {
    console.error("Get customer detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
