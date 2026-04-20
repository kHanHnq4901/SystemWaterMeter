import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/gateways - Get all gateways (distinct GATEWAY_NO from HIS_INSTANT_METER)
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let havingClause = "";
    const params = [];

    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      havingClause += " AND GATEWAY_NO LIKE @search";
    }

    const connection = await pool.connect();

    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.value));
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM (
        SELECT GATEWAY_NO
        FROM HIS_INSTANT_METER
        WHERE GATEWAY_NO IS NOT NULL AND GATEWAY_NO != ''
        GROUP BY GATEWAY_NO
        HAVING 1=1 ${havingClause}
      ) g
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT
        g.GATEWAY_NO as gatewayNo,
        g.meterCount,
        g.lastOnline,
        g.avgSignal,
        g.avgVoltage,
        CASE WHEN g.lastOnline >= DATEADD(hour, -24, GETDATE()) THEN 1 ELSE 0 END as isOnline
      FROM (
        SELECT
          GATEWAY_NO,
          COUNT(DISTINCT METER_NO) as meterCount,
          MAX(CREATED) as lastOnline,
          AVG(CAST(SIGNAL as float)) as avgSignal,
          AVG(CAST(VOLTAGE as float)) as avgVoltage
        FROM HIS_INSTANT_METER
        WHERE GATEWAY_NO IS NOT NULL AND GATEWAY_NO != ''
        GROUP BY GATEWAY_NO
        HAVING 1=1 ${havingClause}
      ) g
      ORDER BY g.lastOnline DESC
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
    console.error("Get gateways error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gateways/:gatewayNo - Get gateway detail + connected meters
router.get("/:gatewayNo", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Gateway summary
    const gatewayResult = await connection
      .request()
      .input("gatewayNo", mssql.VarChar, req.params.gatewayNo)
      .query(`
        SELECT
          GATEWAY_NO as gatewayNo,
          COUNT(DISTINCT METER_NO) as meterCount,
          MAX(CREATED) as lastOnline,
          AVG(CAST(SIGNAL as float)) as avgSignal,
          AVG(CAST(VOLTAGE as float)) as avgVoltage,
          CASE WHEN MAX(CREATED) >= DATEADD(hour, -24, GETDATE()) THEN 1 ELSE 0 END as isOnline
        FROM HIS_INSTANT_METER
        WHERE GATEWAY_NO = @gatewayNo
        GROUP BY GATEWAY_NO
      `);

    if (gatewayResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Gateway không tồn tại" });
    }

    // Connected meters
    const metersResult = await connection
      .request()
      .input("gatewayNo", mssql.VarChar, req.params.gatewayNo)
      .query(`
        SELECT DISTINCT
          hi.METER_NO as meterNo,
          m.METER_NAME as meterName,
          m.METER_MODEL_ID as meterModelId,
          m.STATE as state,
          m.ADDRESS as address,
          hi.SIGNAL as signal,
          hi.VOLTAGE as voltage,
          hi.REMAIN_BATTERY as remainBattery,
          hi.CREATED as lastSeen
        FROM HIS_INSTANT_METER hi
        LEFT JOIN INFO_METER m ON hi.METER_NO = m.METER_NO
        WHERE hi.GATEWAY_NO = @gatewayNo
          AND hi.CREATED = (
            SELECT MAX(CREATED) FROM HIS_INSTANT_METER
            WHERE METER_NO = hi.METER_NO
          )
      `);

    res.json({
      success: true,
      data: {
        ...gatewayResult.recordset[0],
        meters: metersResult.recordset
      }
    });
  } catch (error) {
    console.error("Get gateway detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gateways/stats/summary - Get gateway statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(DISTINCT GATEWAY_NO) as totalGateways,
        COUNT(DISTINCT CASE WHEN lastOnline >= DATEADD(hour, -24, GETDATE()) THEN GATEWAY_NO END) as onlineGateways,
        COUNT(DISTINCT CASE WHEN lastOnline < DATEADD(hour, -24, GETDATE()) THEN GATEWAY_NO END) as offlineGateways,
        AVG(avgSignal) as avgSignal
      FROM (
        SELECT
          GATEWAY_NO,
          MAX(CREATED) as lastOnline,
          AVG(CAST(SIGNAL as float)) as avgSignal
        FROM HIS_INSTANT_METER
        WHERE GATEWAY_NO IS NOT NULL AND GATEWAY_NO != ''
        GROUP BY GATEWAY_NO
      ) g
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get gateway stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
