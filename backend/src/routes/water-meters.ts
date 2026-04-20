import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/water-meters - Get all water meters with pagination and filters
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      groupId,
      lineId,
      state,
      search
    } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (groupId) {
      params.push({ name: "groupId", value: parseInt(groupId as string) });
      whereClause += " AND m.GROUP_ID = @groupId";
    }
    if (lineId) {
      params.push({ name: "lineId", value: parseInt(lineId as string) });
      whereClause += " AND m.LINE_ID = @lineId";
    }
    if (state !== undefined && state !== "") {
      params.push({ name: "state", value: parseInt(state as string) });
      whereClause += " AND m.STATE = @state";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause +=
        " AND (m.METER_NO LIKE @search OR m.METER_NAME LIKE @search OR m.CUSTOMER_CODE LIKE @search OR m.ADDRESS LIKE @search OR m.IMEI LIKE @search)";
    }

    const connection = await pool.connect();

    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.value));
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM INFO_METER m ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT
        m.METER_NO as meterNo,
        m.METER_NAME as meterName,
        m.METER_MODEL_ID as meterModelId,
        m.CUSTOMER_CODE as customerCode,
        m.PHONE as phone,
        m.ADDRESS as address,
        m.COORDINATE as coordinate,
        m.GROUP_ID as groupId,
        m.LINE_ID as lineId,
        m.STATE as state,
        m.PIPE_SIZE as pipeSize,
        m.METER_TYPE as meterType,
        m.DELIVERY_DATE as deliveryDate,
        m.PRODUCTION_DATE as productionDate,
        m.WARRANTY as warranty,
        m.LASTTIME_DATA as lastTimeData,
        m.IMEI as imei,
        m.SIM_CARD_NO as simCardNo,
        m.MODULE_NO as moduleNo,
        m.LOCK as lock,
        m.NOTE as note,
        m.CREATED as created,
        -- Latest instant data from HIS_INSTANT_METER
        hi.REALTIME as realtime,
        hi.SIGNAL as signal,
        hi.VOLTAGE as voltage,
        hi.REMAIN_BATTERY as remainBattery,
        hi.GATEWAY_NO as gatewayNo,
        hi.STATUS as himStatus,
        hi.TEMPERATURE as temperature
      FROM INFO_METER m
      OUTER APPLY (
        SELECT TOP 1 REALTIME, SIGNAL, VOLTAGE, REMAIN_BATTERY, GATEWAY_NO, STATUS, TEMPERATURE
        FROM HIS_INSTANT_METER
        WHERE METER_NO = m.METER_NO
        ORDER BY CREATED DESC
      ) hi
      ${whereClause}
      ORDER BY m.CREATED DESC
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
    console.error("Get water meters error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/water-meters/:meterNo - Get single water meter detail
router.get("/:meterNo", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("meterNo", mssql.VarChar, req.params.meterNo)
      .query(`
        SELECT
          m.*,
          hi.REALTIME as realtime,
          hi.SIGNAL as signal,
          hi.VOLTAGE as voltage,
          hi.REMAIN_BATTERY as remainBattery,
          hi.GATEWAY_NO as gatewayNo,
          hi.STATUS as himStatus,
          hi.TEMPERATURE as temperature,
          hi.RESET_COUNT as resetCount,
          hi.VERSION as version
        FROM INFO_METER m
        OUTER APPLY (
          SELECT TOP 1 REALTIME, SIGNAL, VOLTAGE, REMAIN_BATTERY, GATEWAY_NO,
                       STATUS, TEMPERATURE, RESET_COUNT, VERSION
          FROM HIS_INSTANT_METER
          WHERE METER_NO = m.METER_NO
          ORDER BY CREATED DESC
        ) hi
        WHERE m.METER_NO = @meterNo
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Đồng hồ nước không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get water meter detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/water-meters/:meterNo/readings - Get meter reading history
router.get("/:meterNo/readings", async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const connection = await pool.connect();

    const result = await connection
      .request()
      .input("meterNo", mssql.VarChar, req.params.meterNo)
      .query(`
        SELECT
          METER_NO as meterNo,
          REALTIME as readingValue,
          CREATED as readingDate,
          SIGNAL as signal,
          VOLTAGE as voltage,
          REMAIN_BATTERY as remainBattery,
          TEMPERATURE as temperature,
          GATEWAY_NO as gatewayNo,
          STATUS as status
        FROM HIS_INSTANT_METER
        WHERE METER_NO = @meterNo
        ORDER BY CREATED DESC
        OFFSET ${offset} ROWS FETCH NEXT ${parseInt(pageSize as string)} ROWS ONLY
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get meter readings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/water-meters/stats/summary - Get water meter statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(*) as totalMeters,
        SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) as activeMeters,
        SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END) as inactiveMeters,
        SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END) as errorMeters
      FROM INFO_METER
    `);

    const stats = result.recordset[0];
    res.json({
      success: true,
      data: {
        totalMeters: stats.totalMeters || 0,
        activeMeters: stats.activeMeters || 0,
        inactiveMeters: stats.inactiveMeters || 0,
        errorMeters: stats.errorMeters || 0,
        activeRate: stats.totalMeters
          ? ((stats.activeMeters / stats.totalMeters) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error("Get water meter stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
