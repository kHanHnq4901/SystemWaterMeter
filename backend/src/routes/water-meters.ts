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
      provinceId,
      districtId,
      wardId,
      zoneId,
      clusterId,
      status,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND p.PROVINCE_ID = @provinceId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND d.DISTRICT_ID = @districtId";
    }
    if (wardId) {
      params.push({ name: "wardId", value: parseInt(wardId) });
      whereClause += " AND w.WARD_ID = @wardId";
    }
    if (zoneId) {
      params.push({ name: "zoneId", value: parseInt(zoneId) });
      whereClause += " AND z.ZONE_ID = @zoneId";
    }
    if (clusterId) {
      params.push({ name: "clusterId", value: parseInt(clusterId) });
      whereClause += " AND c.CLUSTER_ID = @clusterId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND wm.STATUS = @status";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause +=
        " AND (wm.METER_CODE LIKE @search OR c.CUSTOMER_NAME LIKE @search)";
    }

    const connection = await pool.connect();

    // Get total count
    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total
      FROM WM_WATER_METER wm
      JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
      LEFT JOIN WM_PROVINCE p ON wm.PROVINCE_ID = p.PROVINCE_ID
      LEFT JOIN WM_DISTRICT d ON wm.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_WARD w ON wm.WARD_ID = w.WARD_ID
      LEFT JOIN WM_ZONE z ON wm.ZONE_ID = z.ZONE_ID
      LEFT JOIN WM_CLUSTER c2 ON wm.CLUSTER_ID = c2.CLUSTER_ID
      ${whereClause}
    `);

    // Get data with pagination
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        wm.WATER_METER_ID as id,
        wm.METER_CODE as meterCode,
        wm.METER_SERIAL as meterSerial,
        wm.MODEL as model,
        wm.STATUS as status,
        wm.LATITUDE as latitude,
        wm.LONGITUDE as longitude,
        wm.INSTALL_DATE as installDate,
        wm.LAST_READING as lastReading,
        wm.LAST_READING_DATE as lastReadingDate,
        c.CUSTOMER_ID as customerId,
        c.CUSTOMER_CODE as customerCode,
        c.CUSTOMER_NAME as customerName,
        c.PHONE as phone,
        c.ADDRESS as address,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        w.WARD_ID as wardId,
        w.WARD_NAME as wardName,
        z.ZONE_ID as zoneId,
        z.ZONE_NAME as zoneName,
        c2.CLUSTER_ID as clusterId,
        c2.CLUSTER_NAME as clusterName
      FROM WM_WATER_METER wm
      JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
      LEFT JOIN WM_PROVINCE p ON wm.PROVINCE_ID = p.PROVINCE_ID
      LEFT JOIN WM_DISTRICT d ON wm.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_WARD w ON wm.WARD_ID = w.WARD_ID
      LEFT JOIN WM_ZONE z ON wm.ZONE_ID = z.ZONE_ID
      LEFT JOIN WM_CLUSTER c2 ON wm.CLUSTER_ID = c2.CLUSTER_ID
      ${whereClause}
      ORDER BY wm.WATER_METER_ID DESC
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
    console.error("Get water meters error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/water-meters/:id - Get single water meter detail
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT 
          wm.*,
          c.CUSTOMER_NAME,
          c.PHONE,
          c.ADDRESS,
          p.PROVINCE_NAME,
          d.DISTRICT_NAME,
          w.WARD_NAME,
          z.ZONE_NAME,
          c2.CLUSTER_NAME
        FROM WM_WATER_METER wm
        JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
        LEFT JOIN WM_PROVINCE p ON wm.PROVINCE_ID = p.PROVINCE_ID
        LEFT JOIN WM_DISTRICT d ON wm.DISTRICT_ID = d.DISTRICT_ID
        LEFT JOIN WM_WARD w ON wm.WARD_ID = w.WARD_ID
        LEFT JOIN WM_ZONE z ON wm.ZONE_ID = z.ZONE_ID
        LEFT JOIN WM_CLUSTER c2 ON wm.CLUSTER_ID = c2.CLUSTER_ID
        WHERE wm.WATER_METER_ID = @id
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

// GET /api/water-meters/:id/readings - Get meter reading history
router.get("/:id/readings", async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const connection = await pool.connect();

    const result = await connection
      .request()
      .input("meterId", mssql.Int, req.params.id).query(`
        SELECT TOP ${parseInt(pageSize)} 
          READING_ID as id,
          READING_VALUE as readingValue,
          READING_DATE as readingDate,
          READING_TYPE as readingType,
          NOTES as notes,
          CREATED_BY as createdBy
        FROM WM_READING
        WHERE WATER_METER_ID = @meterId
        ORDER BY READING_DATE DESC
        OFFSET ${offset} ROWS
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get meter readings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/water-meters - Create new water meter
router.post("/", async (req, res) => {
  try {
    const {
      meterCode,
      meterSerial,
      model,
      customerId,
      provinceId,
      districtId,
      wardId,
      zoneId,
      clusterId,
      latitude,
      longitude,
      installDate
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("meterCode", mssql.VarChar, meterCode)
      .input("meterSerial", mssql.VarChar, meterSerial || "")
      .input("model", mssql.VarChar, model || "")
      .input("customerId", mssql.Int, customerId)
      .input("provinceId", mssql.Int, provinceId || null)
      .input("districtId", mssql.Int, districtId || null)
      .input("wardId", mssql.Int, wardId || null)
      .input("zoneId", mssql.Int, zoneId || null)
      .input("clusterId", mssql.Int, clusterId || null)
      .input("latitude", mssql.Decimal(10, 7), latitude || null)
      .input("longitude", mssql.Decimal(10, 7), longitude || null)
      .input("installDate", mssql.DateTime, installDate || new Date()).query(`
        INSERT INTO WM_WATER_METER (
          METER_CODE, METER_SERIAL, MODEL, CUSTOMER_ID,
          PROVINCE_ID, DISTRICT_ID, WARD_ID, ZONE_ID, CLUSTER_ID,
          LATITUDE, LONGITUDE, INSTALL_DATE, STATUS
        )
        VALUES (
          @meterCode, @meterSerial, @model, @customerId,
          @provinceId, @districtId, @wardId, @zoneId, @clusterId,
          @latitude, @longitude, @installDate, 1
        )
        SELECT SCOPE_IDENTITY() as id
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Đã tạo đồng hồ nước thành công"
    });
  } catch (error) {
    console.error("Create water meter error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/water-meters/:id - Update water meter
router.put("/:id", async (req, res) => {
  try {
    const {
      meterCode,
      meterSerial,
      model,
      customerId,
      provinceId,
      districtId,
      wardId,
      zoneId,
      clusterId,
      latitude,
      longitude,
      status
    } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("meterCode", mssql.VarChar, meterCode)
      .input("meterSerial", mssql.VarChar, meterSerial || "")
      .input("model", mssql.VarChar, model || "")
      .input("customerId", mssql.Int, customerId)
      .input("provinceId", mssql.Int, provinceId || null)
      .input("districtId", mssql.Int, districtId || null)
      .input("wardId", mssql.Int, wardId || null)
      .input("zoneId", mssql.Int, zoneId || null)
      .input("clusterId", mssql.Int, clusterId || null)
      .input("latitude", mssql.Decimal(10, 7), latitude || null)
      .input("longitude", mssql.Decimal(10, 7), longitude || null)
      .input("status", mssql.Int, status || 1).query(`
        UPDATE WM_WATER_METER SET
          METER_CODE = @meterCode,
          METER_SERIAL = @meterSerial,
          MODEL = @model,
          CUSTOMER_ID = @customerId,
          PROVINCE_ID = @provinceId,
          DISTRICT_ID = @districtId,
          WARD_ID = @wardId,
          ZONE_ID = @zoneId,
          CLUSTER_ID = @clusterId,
          LATITUDE = @latitude,
          LONGITUDE = @longitude,
          STATUS = @status
        WHERE WATER_METER_ID = @id
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update water meter error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/water-meters/:id - Delete water meter
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query("DELETE FROM WM_WATER_METER WHERE WATER_METER_ID = @id");

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete water meter error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/water-meters/readings - Add new reading
router.post("/readings", async (req, res) => {
  try {
    const { meterId, readingValue, readingDate, readingType, notes } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("meterId", mssql.Int, meterId)
      .input("readingValue", mssql.Decimal(10, 2), readingValue)
      .input("readingDate", mssql.DateTime, readingDate || new Date())
      .input("readingType", mssql.Int, readingType || 1)
      .input("notes", mssql.NVarChar, notes || "").query(`
        INSERT INTO WM_READING (WATER_METER_ID, READING_VALUE, READING_DATE, READING_TYPE, NOTES)
        VALUES (@meterId, @readingValue, @readingDate, @readingType, @notes)
        SELECT SCOPE_IDENTITY() as id
      `);

    // Update last reading on meter
    await connection
      .request()
      .input("id", mssql.Int, meterId)
      .input("reading", mssql.Decimal(10, 2), readingValue)
      .input("date", mssql.DateTime, readingDate || new Date()).query(`
        UPDATE WM_WATER_METER 
        SET LAST_READING = @reading, LAST_READING_DATE = @date
        WHERE WATER_METER_ID = @id
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Ghi chỉ số thành công"
    });
  } catch (error) {
    console.error("Add reading error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/water-meters/stats - Get water meter statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        COUNT(*) as totalMeters,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as activeMeters,
        SUM(CASE WHEN STATUS = 0 THEN 1 ELSE 0 END) as inactiveMeters
      FROM WM_WATER_METER
    `);

    const stats = result.recordset[0];
    res.json({
      success: true,
      data: {
        totalMeters: stats.totalMeters || 0,
        activeMeters: stats.activeMeters || 0,
        inactiveMeters: stats.inactiveMeters || 0,
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
