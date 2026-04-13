import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/hierarchy/provinces - Get all provinces
router.get("/provinces", async (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = "WHERE 1=1";
    if (status) {
      whereClause += " AND STATUS = @status";
    }

    const connection = await pool.connect();
    const request = connection.request();
    if (status) request.input("status", mssql.Int, parseInt(status));

    const result = await request.query(`
      SELECT 
        PROVINCE_ID as id,
        PROVINCE_CODE as provinceCode,
        PROVINCE_NAME as provinceName,
        STATUS as status,
        CREATED_DATE as createdDate
      FROM WM_PROVINCE
      ${whereClause}
      ORDER BY PROVINCE_NAME
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get provinces error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/provinces/:id - Get province detail with children
router.get("/provinces/:id", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Get province
    const provinceResult = await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`SELECT * FROM WM_PROVINCE WHERE PROVINCE_ID = @id`);

    if (provinceResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Tỉnh/TP không tồn tại" });
    }

    const province = provinceResult.recordset[0];

    // Get districts
    const districtsResult = await connection
      .request()
      .input("provinceId", mssql.Int, req.params.id).query(`
        SELECT DISTRICT_ID as id, DISTRICT_CODE, DISTRICT_NAME, STATUS
        FROM WM_DISTRICT WHERE PROVINCE_ID = @provinceId ORDER BY DISTRICT_NAME
      `);

    // Get wards
    const wardsResult = await connection
      .request()
      .input("provinceId", mssql.Int, req.params.id).query(`
        SELECT w.WARD_ID as id, w.WARD_CODE, w.WARD_NAME, w.STATUS, d.DISTRICT_ID as parentId
        FROM WM_WARD w
        JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
        WHERE d.PROVINCE_ID = @provinceId
        ORDER BY w.WARD_NAME
      `);

    // Get zones
    const zonesResult = await connection
      .request()
      .input("provinceId", mssql.Int, req.params.id).query(`
        SELECT z.ZONE_ID as id, z.ZONE_CODE, z.ZONE_NAME, z.STATUS, w.WARD_ID as parentId
        FROM WM_ZONE z
        JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID
        JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
        WHERE d.PROVINCE_ID = @provinceId
        ORDER BY z.ZONE_NAME
      `);

    // Get clusters
    const clustersResult = await connection
      .request()
      .input("provinceId", mssql.Int, req.params.id).query(`
        SELECT c.CLUSTER_ID as id, c.CLUSTER_CODE, c.CLUSTER_NAME, c.STATUS, z.ZONE_ID as parentId
        FROM WM_CLUSTER c
        JOIN WM_ZONE z ON c.ZONE_ID = z.ZONE_ID
        JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID
        JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
        WHERE d.PROVINCE_ID = @provinceId
        ORDER BY c.CLUSTER_NAME
      `);

    // Get statistics
    const statsResult = await connection
      .request()
      .input("provinceId", mssql.Int, req.params.id).query(`
        SELECT 
          (SELECT COUNT(*) FROM WM_DISTRICT WHERE PROVINCE_ID = @provinceId) as districtCount,
          (SELECT COUNT(*) FROM WM_WARD w JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID WHERE d.PROVINCE_ID = @provinceId) as wardCount,
          (SELECT COUNT(*) FROM WM_ZONE z JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID WHERE d.PROVINCE_ID = @provinceId) as zoneCount,
          (SELECT COUNT(*) FROM WM_CLUSTER c JOIN WM_ZONE z ON c.ZONE_ID = z.ZONE_ID JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID WHERE d.PROVINCE_ID = @provinceId) as clusterCount,
          (SELECT COUNT(*) FROM WM_WATER_METER wm JOIN WM_DISTRICT d ON wm.DISTRICT_ID = d.DISTRICT_ID WHERE d.PROVINCE_ID = @provinceId) as meterCount,
          (SELECT COUNT(*) FROM WM_GATEWAY g JOIN WM_DISTRICT d ON g.DISTRICT_ID = d.DISTRICT_ID WHERE d.PROVINCE_ID = @provinceId) as gatewayCount
      `);

    res.json({
      success: true,
      data: {
        ...province,
        districts: districtsResult.recordset,
        wards: wardsResult.recordset,
        zones: zonesResult.recordset,
        clusters: clustersResult.recordset,
        stats: statsResult.recordset[0]
      }
    });
  } catch (error) {
    console.error("Get province detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/districts - Get all districts
router.get("/districts", async (req, res) => {
  try {
    const { provinceId, status } = req.query;
    let whereClause = "WHERE 1=1";
    const params = [];

    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND d.PROVINCE_ID = @provinceId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND d.STATUS = @status";
    }

    const connection = await pool.connect();
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        d.DISTRICT_ID as id,
        d.DISTRICT_CODE as districtCode,
        d.DISTRICT_NAME as districtName,
        d.STATUS as status,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        (SELECT COUNT(*) FROM WM_WARD w WHERE w.DISTRICT_ID = d.DISTRICT_ID) as wardCount,
        (SELECT COUNT(*) FROM WM_WATER_METER wm WHERE wm.DISTRICT_ID = d.DISTRICT_ID) as meterCount
      FROM WM_DISTRICT d
      LEFT JOIN WM_PROVINCE p ON d.PROVINCE_ID = p.PROVINCE_ID
      ${whereClause}
      ORDER BY d.DISTRICT_NAME
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get districts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/districts/:id - Get district detail
router.get("/districts/:id", async (req, res) => {
  try {
    const connection = await pool.connect();

    const districtResult = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT d.*, p.PROVINCE_NAME
        FROM WM_DISTRICT d
        LEFT JOIN WM_PROVINCE p ON d.PROVINCE_ID = p.PROVINCE_ID
        WHERE d.DISTRICT_ID = @id
      `);

    if (districtResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Quận/Huyện không tồn tại" });
    }

    const district = districtResult.recordset[0];

    // Get wards
    const wardsResult = await connection
      .request()
      .input("districtId", mssql.Int, req.params.id).query(`
        SELECT w.*, 
          (SELECT COUNT(*) FROM WM_ZONE z WHERE z.WARD_ID = w.WARD_ID) as zoneCount,
          (SELECT COUNT(*) FROM WM_WATER_METER wm WHERE wm.WARD_ID = w.WARD_ID) as meterCount
        FROM WM_WARD w WHERE w.DISTRICT_ID = @districtId ORDER BY w.WARD_NAME
      `);

    res.json({
      success: true,
      data: {
        ...district,
        wards: wardsResult.recordset
      }
    });
  } catch (error) {
    console.error("Get district detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/wards - Get all wards
router.get("/wards", async (req, res) => {
  try {
    const { districtId, provinceId, status } = req.query;
    let whereClause = "WHERE 1=1";
    const params = [];

    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND w.DISTRICT_ID = @districtId";
    }
    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND d.PROVINCE_ID = @provinceId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND w.STATUS = @status";
    }

    const connection = await pool.connect();
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        w.WARD_ID as id,
        w.WARD_CODE as wardCode,
        w.WARD_NAME as wardName,
        w.STATUS as status,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        (SELECT COUNT(*) FROM WM_ZONE z WHERE z.WARD_ID = w.WARD_ID) as zoneCount,
        (SELECT COUNT(*) FROM WM_WATER_METER wm WHERE wm.WARD_ID = w.WARD_ID) as meterCount
      FROM WM_WARD w
      LEFT JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_PROVINCE p ON d.PROVINCE_ID = p.PROVINCE_ID
      ${whereClause}
      ORDER BY w.WARD_NAME
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get wards error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/zones - Get all zones
router.get("/zones", async (req, res) => {
  try {
    const { wardId, districtId, provinceId, status } = req.query;
    let whereClause = "WHERE 1=1";
    const params = [];

    if (wardId) {
      params.push({ name: "wardId", value: parseInt(wardId) });
      whereClause += " AND z.WARD_ID = @wardId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND d.DISTRICT_ID = @districtId";
    }
    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND p.PROVINCE_ID = @provinceId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND z.STATUS = @status";
    }

    const connection = await pool.connect();
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        z.ZONE_ID as id,
        z.ZONE_CODE as zoneCode,
        z.ZONE_NAME as zoneName,
        z.STATUS as status,
        w.WARD_ID as wardId,
        w.WARD_NAME as wardName,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        (SELECT COUNT(*) FROM WM_CLUSTER c WHERE c.ZONE_ID = z.ZONE_ID) as clusterCount,
        (SELECT COUNT(*) FROM WM_WATER_METER wm WHERE wm.ZONE_ID = z.ZONE_ID) as meterCount
      FROM WM_ZONE z
      LEFT JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID
      LEFT JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_PROVINCE p ON d.PROVINCE_ID = p.PROVINCE_ID
      ${whereClause}
      ORDER BY z.ZONE_NAME
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get zones error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hierarchy/clusters - Get all clusters
router.get("/clusters", async (req, res) => {
  try {
    const { zoneId, wardId, districtId, provinceId, status } = req.query;
    let whereClause = "WHERE 1=1";
    const params = [];

    if (zoneId) {
      params.push({ name: "zoneId", value: parseInt(zoneId) });
      whereClause += " AND c.ZONE_ID = @zoneId";
    }
    if (wardId) {
      params.push({ name: "wardId", value: parseInt(wardId) });
      whereClause += " AND z.WARD_ID = @wardId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND d.DISTRICT_ID = @districtId";
    }
    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND p.PROVINCE_ID = @provinceId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND c.STATUS = @status";
    }

    const connection = await pool.connect();
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        c.CLUSTER_ID as id,
        c.CLUSTER_CODE as clusterCode,
        c.CLUSTER_NAME as clusterName,
        c.STATUS as status,
        z.ZONE_ID as zoneId,
        z.ZONE_NAME as zoneName,
        w.WARD_ID as wardId,
        w.WARD_NAME as wardName,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        (SELECT COUNT(*) FROM WM_WATER_METER wm WHERE wm.CLUSTER_ID = c.CLUSTER_ID) as meterCount
      FROM WM_CLUSTER c
      LEFT JOIN WM_ZONE z ON c.ZONE_ID = z.ZONE_ID
      LEFT JOIN WM_WARD w ON z.WARD_ID = w.WARD_ID
      LEFT JOIN WM_DISTRICT d ON w.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_PROVINCE p ON d.PROVINCE_ID = p.PROVINCE_ID
      ${whereClause}
      ORDER BY c.CLUSTER_NAME
    `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Get clusters error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hierarchy/provinces - Create province
router.post("/provinces", async (req, res) => {
  try {
    const { provinceCode, provinceName } = req.body;
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("provinceCode", mssql.VarChar, provinceCode)
      .input("provinceName", mssql.NVarChar, provinceName).query(`
        INSERT INTO WM_PROVINCE (PROVINCE_CODE, PROVINCE_NAME, STATUS)
        VALUES (@provinceCode, @provinceName, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create province error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hierarchy/districts - Create district
router.post("/districts", async (req, res) => {
  try {
    const { districtCode, districtName, provinceId } = req.body;
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("districtCode", mssql.VarChar, districtCode)
      .input("districtName", mssql.NVarChar, districtName)
      .input("provinceId", mssql.Int, provinceId).query(`
        INSERT INTO WM_DISTRICT (DISTRICT_CODE, DISTRICT_NAME, PROVINCE_ID, STATUS)
        VALUES (@districtCode, @districtName, @provinceId, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create district error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hierarchy/wards - Create ward
router.post("/wards", async (req, res) => {
  try {
    const { wardCode, wardName, districtId } = req.body;
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("wardCode", mssql.VarChar, wardCode)
      .input("wardName", mssql.NVarChar, wardName)
      .input("districtId", mssql.Int, districtId).query(`
        INSERT INTO WM_WARD (WARD_CODE, WARD_NAME, DISTRICT_ID, STATUS)
        VALUES (@wardCode, @wardName, @districtId, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create ward error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hierarchy/zones - Create zone
router.post("/zones", async (req, res) => {
  try {
    const { zoneCode, zoneName, wardId } = req.body;
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("zoneCode", mssql.VarChar, zoneCode)
      .input("zoneName", mssql.NVarChar, zoneName)
      .input("wardId", mssql.Int, wardId).query(`
        INSERT INTO WM_ZONE (ZONE_CODE, ZONE_NAME, WARD_ID, STATUS)
        VALUES (@zoneCode, @zoneName, @wardId, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create zone error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hierarchy/clusters - Create cluster
router.post("/clusters", async (req, res) => {
  try {
    const { clusterCode, clusterName, zoneId } = req.body;
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("clusterCode", mssql.VarChar, clusterCode)
      .input("clusterName", mssql.NVarChar, clusterName)
      .input("zoneId", mssql.Int, zoneId).query(`
        INSERT INTO WM_CLUSTER (CLUSTER_CODE, CLUSTER_NAME, ZONE_ID, STATUS)
        VALUES (@clusterCode, @clusterName, @zoneId, 1)
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create cluster error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
