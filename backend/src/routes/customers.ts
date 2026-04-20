import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/customers - Get distinct customers from INFO_METER
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, state, search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''";
    const params = [];

    if (state !== undefined && state !== "") {
      params.push({ name: "state", value: parseInt(state as string) });
      whereClause += " AND STATE = @state";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause += " AND (CUSTOMER_CODE LIKE @search OR PHONE LIKE @search OR ADDRESS LIKE @search)";
    }

    const connection = await pool.connect();

    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.value));
    const countResult = await countRequest.query(`
      SELECT COUNT(DISTINCT CUSTOMER_CODE) as total
      FROM INFO_METER
      ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
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
        FROM INFO_METER
        ${whereClause}
        GROUP BY CUSTOMER_CODE
      ) c
      ORDER BY c.CUSTOMER_CODE
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
    console.error("Get customers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/stats/summary - Get customer statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(DISTINCT CUSTOMER_CODE) as totalCustomers,
        COUNT(DISTINCT CASE WHEN STATE = 1 THEN CUSTOMER_CODE END) as activeCustomers,
        COUNT(DISTINCT CASE WHEN STATE = 0 THEN CUSTOMER_CODE END) as inactiveCustomers,
        COUNT(METER_NO) as totalMeters
      FROM INFO_METER
      WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''
    `);

    const stats = result.recordset[0];
    res.json({
      success: true,
      data: {
        totalCustomers: stats.totalCustomers || 0,
        activeCustomers: stats.activeCustomers || 0,
        inactiveCustomers: stats.inactiveCustomers || 0,
        totalMeters: stats.totalMeters || 0
      }
    });
  } catch (error) {
    console.error("Get customer stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/:customerCode - Get customer detail + associated meters
router.get("/:customerCode", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Customer summary
    const summaryResult = await connection
      .request()
      .input("customerCode", mssql.VarChar, req.params.customerCode)
      .query(`
        SELECT
          CUSTOMER_CODE as customerCode,
          MAX(PHONE) as phone,
          MAX(ADDRESS) as address,
          COUNT(METER_NO) as meterCount,
          SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) as activeMeterCount,
          MAX(CREATED) as lastUpdate
        FROM INFO_METER
        WHERE CUSTOMER_CODE = @customerCode
        GROUP BY CUSTOMER_CODE
      `);

    if (summaryResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Khách hàng không tồn tại" });
    }

    // Associated meters with latest readings
    const metersResult = await connection
      .request()
      .input("customerCode", mssql.VarChar, req.params.customerCode)
      .query(`
        SELECT
          m.METER_NO as meterNo,
          m.METER_NAME as meterName,
          m.METER_MODEL_ID as meterModelId,
          m.STATE as state,
          m.ADDRESS as address,
          m.IMEI as imei,
          m.CREATED as created,
          hi.REALTIME as realtime,
          hi.SIGNAL as signal,
          hi.VOLTAGE as voltage,
          hi.REMAIN_BATTERY as remainBattery,
          hi.GATEWAY_NO as gatewayNo,
          hi.CREATED as lastSeen
        FROM INFO_METER m
        OUTER APPLY (
          SELECT TOP 1 REALTIME, SIGNAL, VOLTAGE, REMAIN_BATTERY, GATEWAY_NO, CREATED
          FROM HIS_INSTANT_METER
          WHERE METER_NO = m.METER_NO
          ORDER BY CREATED DESC
        ) hi
        WHERE m.CUSTOMER_CODE = @customerCode
        ORDER BY m.METER_NO
      `);

    res.json({
      success: true,
      data: {
        ...summaryResult.recordset[0],
        meters: metersResult.recordset
      }
    });
  } catch (error) {
    console.error("Get customer detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
