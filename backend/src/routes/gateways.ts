import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/gateways - Get all gateways
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      provinceId,
      districtId,
      wardId,
      status,
      search
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND g.PROVINCE_ID = @provinceId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND g.DISTRICT_ID = @districtId";
    }
    if (wardId) {
      params.push({ name: "wardId", value: parseInt(wardId) });
      whereClause += " AND g.WARD_ID = @wardId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND g.STATUS = @status";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause +=
        " AND (g.GATEWAY_CODE LIKE @search OR g.GATEWAY_NAME LIKE @search)";
    }

    const connection = await pool.connect();

    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total FROM WM_GATEWAY g ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        g.GATEWAY_ID as id,
        g.GATEWAY_CODE as gatewayCode,
        g.GATEWAY_NAME as gatewayName,
        g.IP_ADDRESS as ipAddress,
        g.PORT as port,
        g.SIGNAL_STRENGTH as signalStrength,
        g.LAST_ONLINE as lastOnline,
        g.STATUS as status,
        g.INSTALL_DATE as installDate,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        w.WARD_ID as wardId,
        w.WARD_NAME as wardName,
        (SELECT COUNT(*) FROM WM_WATER_METER WHERE GATEWAY_ID = g.GATEWAY_ID) as meterCount
      FROM WM_GATEWAY g
      LEFT JOIN WM_PROVINCE p ON g.PROVINCE_ID = p.PROVINCE_ID
      LEFT JOIN WM_DISTRICT d ON g.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_WARD w ON g.WARD_ID = w.WARD_ID
      ${whereClause}
      ORDER BY g.GATEWAY_ID DESC
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
    console.error("Get gateways error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gateways/:id - Get gateway detail
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT g.*, p.PROVINCE_NAME, d.DISTRICT_NAME, w.WARD_NAME
        FROM WM_GATEWAY g
        LEFT JOIN WM_PROVINCE p ON g.PROVINCE_ID = p.PROVINCE_ID
        LEFT JOIN WM_DISTRICT d ON g.DISTRICT_ID = d.DISTRICT_ID
        LEFT JOIN WM_WARD w ON g.WARD_ID = w.WARD_ID
        WHERE g.GATEWAY_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Gateway không tồn tại" });
    }

    // Get connected meters
    const metersResult = await connection
      .request()
      .input("gatewayId", mssql.Int, req.params.id).query(`
        SELECT WATER_METER_ID as id, METER_CODE as meterCode, MODEL as model, STATUS as status
        FROM WM_WATER_METER WHERE GATEWAY_ID = @gatewayId
      `);

    res.json({
      success: true,
      data: {
        ...result.recordset[0],
        meters: metersResult.recordset
      }
    });
  } catch (error) {
    console.error("Get gateway detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/gateways - Create gateway
router.post("/", async (req, res) => {
  try {
    const {
      gatewayCode,
      gatewayName,
      ipAddress,
      port,
      provinceId,
      districtId,
      wardId,
      latitude,
      longitude
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("gatewayCode", mssql.VarChar, gatewayCode)
      .input("gatewayName", mssql.NVarChar, gatewayName)
      .input("ipAddress", mssql.VarChar, ipAddress || "")
      .input("port", mssql.Int, port || 8080)
      .input("provinceId", mssql.Int, provinceId || null)
      .input("districtId", mssql.Int, districtId || null)
      .input("wardId", mssql.Int, wardId || null)
      .input("latitude", mssql.Decimal(10, 7), latitude || null)
      .input("longitude", mssql.Decimal(10, 7), longitude || null).query(`
        INSERT INTO WM_GATEWAY (GATEWAY_CODE, GATEWAY_NAME, IP_ADDRESS, PORT, PROVINCE_ID, DISTRICT_ID, WARD_ID, LATITUDE, LONGITUDE, STATUS)
        VALUES (@gatewayCode, @gatewayName, @ipAddress, @port, @provinceId, @districtId, @wardId, @latitude, @longitude, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create gateway error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/gateways/:id - Update gateway
router.put("/:id", async (req, res) => {
  try {
    const { gatewayCode, gatewayName, ipAddress, port, status } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("gatewayCode", mssql.VarChar, gatewayCode)
      .input("gatewayName", mssql.NVarChar, gatewayName)
      .input("ipAddress", mssql.VarChar, ipAddress || "")
      .input("port", mssql.Int, port || 8080)
      .input("status", mssql.Int, status || 1).query(`
        UPDATE WM_GATEWAY SET
          GATEWAY_CODE = @gatewayCode,
          GATEWAY_NAME = @gatewayName,
          IP_ADDRESS = @ipAddress,
          PORT = @port,
          STATUS = @status
        WHERE GATEWAY_ID = @id
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update gateway error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/gateways/:id - Delete gateway
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query("DELETE FROM WM_GATEWAY WHERE GATEWAY_ID = @id");

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete gateway error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/gateways/stats - Get gateway statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        COUNT(*) as totalGateways,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as onlineGateways,
        SUM(CASE WHEN STATUS = 0 THEN 1 ELSE 0 END) as offlineGateways,
        SUM(CASE WHEN SIGNAL_STRENGTH > -70 THEN 1 ELSE 0 END) as goodSignal,
        SUM(CASE WHEN SIGNAL_STRENGTH <= -70 AND SIGNAL_STRENGTH > -90 THEN 1 ELSE 0 END) as mediumSignal,
        SUM(CASE WHEN SIGNAL_STRENGTH <= -90 THEN 1 ELSE 0 END) as weakSignal
      FROM WM_GATEWAY
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get gateway stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
