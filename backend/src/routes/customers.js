import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/customers - Get all customers with pagination and filters
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
      whereClause += " AND c.PROVINCE_ID = @provinceId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND c.DISTRICT_ID = @districtId";
    }
    if (wardId) {
      params.push({ name: "wardId", value: parseInt(wardId) });
      whereClause += " AND c.WARD_ID = @wardId";
    }
    if (zoneId) {
      params.push({ name: "zoneId", value: parseInt(zoneId) });
      whereClause += " AND c.ZONE_ID = @zoneId";
    }
    if (clusterId) {
      params.push({ name: "clusterId", value: parseInt(clusterId) });
      whereClause += " AND c.CLUSTER_ID = @clusterId";
    }
    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND c.STATUS = @status";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause +=
        " AND (c.CUSTOMER_CODE LIKE @search OR c.CUSTOMER_NAME LIKE @search OR c.PHONE LIKE @search)";
    }

    const connection = await pool.connect();

    // Get total count
    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total FROM WM_CUSTOMER c ${whereClause}
    `);

    // Get data with pagination
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        c.CUSTOMER_ID as id,
        c.CUSTOMER_CODE as customerCode,
        c.CUSTOMER_NAME as customerName,
        c.PHONE as phone,
        c.EMAIL as email,
        c.ADDRESS as address,
        c.STATUS as status,
        c.CONTRACT_DATE as contractDate,
        c.CUSTOMER_TYPE as customerType,
        p.PROVINCE_ID as provinceId,
        p.PROVINCE_NAME as provinceName,
        d.DISTRICT_ID as districtId,
        d.DISTRICT_NAME as districtName,
        w.WARD_ID as wardId,
        w.WARD_NAME as wardName,
        (SELECT TOP 1 READING_VALUE FROM WM_READING WHERE WATER_METER_ID = wm.WATER_METER_ID ORDER BY READING_DATE DESC) as lastReading,
        (SELECT SUM(READING_VALUE) FROM WM_READING WHERE WATER_METER_ID = wm.WATER_METER_ID AND READING_DATE >= DATEADD(month, -1, GETDATE())) as monthlyConsumption
      FROM WM_CUSTOMER c
      LEFT JOIN WM_PROVINCE p ON c.PROVINCE_ID = p.PROVINCE_ID
      LEFT JOIN WM_DISTRICT d ON c.DISTRICT_ID = d.DISTRICT_ID
      LEFT JOIN WM_WARD w ON c.WARD_ID = w.WARD_ID
      LEFT JOIN WM_WATER_METER wm ON c.CUSTOMER_ID = wm.CUSTOMER_ID
      ${whereClause}
      ORDER BY c.CUSTOMER_ID DESC
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
    console.error("Get customers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/:id - Get single customer detail
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT 
          c.*,
          p.PROVINCE_NAME,
          d.DISTRICT_NAME,
          w.WARD_NAME,
          z.ZONE_NAME,
          cl.CLUSTER_NAME
        FROM WM_CUSTOMER c
        LEFT JOIN WM_PROVINCE p ON c.PROVINCE_ID = p.PROVINCE_ID
        LEFT JOIN WM_DISTRICT d ON c.DISTRICT_ID = d.DISTRICT_ID
        LEFT JOIN WM_WARD w ON c.WARD_ID = w.WARD_ID
        LEFT JOIN WM_ZONE z ON c.ZONE_ID = z.ZONE_ID
        LEFT JOIN WM_CLUSTER cl ON c.CLUSTER_ID = cl.CLUSTER_ID
        WHERE c.CUSTOMER_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Khách hàng không tồn tại" });
    }

    // Get associated meters
    const metersResult = await connection
      .request()
      .input("customerId", mssql.Int, req.params.id).query(`
        SELECT 
          WATER_METER_ID as id,
          METER_CODE as meterCode,
          MODEL as model,
          STATUS as status,
          LAST_READING as lastReading
        FROM WM_WATER_METER WHERE CUSTOMER_ID = @customerId
      `);

    const customer = result.recordset[0];
    customer.meters = metersResult.recordset;

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error("Get customer detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/customers - Create new customer
router.post("/", async (req, res) => {
  try {
    const {
      customerCode,
      customerName,
      phone,
      email,
      address,
      provinceId,
      districtId,
      wardId,
      zoneId,
      clusterId,
      customerType
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("customerCode", mssql.VarChar, customerCode)
      .input("customerName", mssql.NVarChar, customerName)
      .input("phone", mssql.VarChar, phone || "")
      .input("email", mssql.VarChar, email || "")
      .input("address", mssql.NVarChar, address || "")
      .input("provinceId", mssql.Int, provinceId || null)
      .input("districtId", mssql.Int, districtId || null)
      .input("wardId", mssql.Int, wardId || null)
      .input("zoneId", mssql.Int, zoneId || null)
      .input("clusterId", mssql.Int, clusterId || null)
      .input("customerType", mssql.Int, customerType || 1).query(`
        INSERT INTO WM_CUSTOMER (
          CUSTOMER_CODE, CUSTOMER_NAME, PHONE, EMAIL, ADDRESS,
          PROVINCE_ID, DISTRICT_ID, WARD_ID, ZONE_ID, CLUSTER_ID,
          CUSTOMER_TYPE, STATUS, CONTRACT_DATE
        )
        VALUES (
          @customerCode, @customerName, @phone, @email, @address,
          @provinceId, @districtId, @wardId, @zoneId, @clusterId,
          @customerType, 1, GETDATE()
        )
        SELECT SCOPE_IDENTITY() as id
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Đã tạo khách hàng thành công"
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/customers/:id - Update customer
router.put("/:id", async (req, res) => {
  try {
    const {
      customerCode,
      customerName,
      phone,
      email,
      address,
      provinceId,
      districtId,
      wardId,
      zoneId,
      clusterId,
      customerType,
      status
    } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("customerCode", mssql.VarChar, customerCode)
      .input("customerName", mssql.NVarChar, customerName)
      .input("phone", mssql.VarChar, phone || "")
      .input("email", mssql.VarChar, email || "")
      .input("address", mssql.NVarChar, address || "")
      .input("provinceId", mssql.Int, provinceId || null)
      .input("districtId", mssql.Int, districtId || null)
      .input("wardId", mssql.Int, wardId || null)
      .input("zoneId", mssql.Int, zoneId || null)
      .input("clusterId", mssql.Int, clusterId || null)
      .input("customerType", mssql.Int, customerType || 1)
      .input("status", mssql.Int, status || 1).query(`
        UPDATE WM_CUSTOMER SET
          CUSTOMER_CODE = @customerCode,
          CUSTOMER_NAME = @customerName,
          PHONE = @phone,
          EMAIL = @email,
          ADDRESS = @address,
          PROVINCE_ID = @provinceId,
          DISTRICT_ID = @districtId,
          WARD_ID = @wardId,
          ZONE_ID = @zoneId,
          CLUSTER_ID = @clusterId,
          CUSTOMER_TYPE = @customerType,
          STATUS = @status
        WHERE CUSTOMER_ID = @id
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query("DELETE FROM WM_CUSTOMER WHERE CUSTOMER_ID = @id");

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as activeCustomers,
        SUM(CASE WHEN STATUS = 0 THEN 1 ELSE 0 END) as inactiveCustomers,
        SUM(CASE WHEN CUSTOMER_TYPE = 1 THEN 1 ELSE 0 END) as individualCustomers,
        SUM(CASE WHEN CUSTOMER_TYPE = 2 THEN 1 ELSE 0 END) as businessCustomers
      FROM WM_CUSTOMER
    `);

    const stats = result.recordset[0];
    res.json({
      success: true,
      data: {
        totalCustomers: stats.totalCustomers || 0,
        activeCustomers: stats.activeCustomers || 0,
        inactiveCustomers: stats.inactiveCustomers || 0,
        individualCustomers: stats.individualCustomers || 0,
        businessCustomers: stats.businessCustomers || 0
      }
    });
  } catch (error) {
    console.error("Get customer stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
