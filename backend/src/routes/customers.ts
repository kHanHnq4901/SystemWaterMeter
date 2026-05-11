import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/customers/stats/summary — trước /:code để không bị shadow
router.get("/stats/summary", async (_req, res) => {
  try {
    const conn = await pool.connect();
    const result = await conn.request().query(`
      SELECT
        COUNT(*) as totalCustomers,
        SUM(CASE WHEN mc.meterCount > 0 THEN 1 ELSE 0 END) as hasMeters,
        SUM(CASE WHEN mc.meterCount = 0 OR mc.meterCount IS NULL THEN 1 ELSE 0 END) as noMeters
      FROM INFO_CUSTOMER c WITH(NOLOCK)
      LEFT JOIN (
        SELECT CUSTOMER_CODE, COUNT(*) as meterCount
        FROM INFO_METER WITH(NOLOCK)
        WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''
        GROUP BY CUSTOMER_CODE
      ) mc ON mc.CUSTOMER_CODE = c.CUSTOMER_CODE
    `);
    const s = result.recordset[0];
    res.json({
      code: 0,
      message: "common.success",
      data: {
        totalCustomers: s.totalCustomers ?? 0,
        hasMeters:      s.hasMeters ?? 0,
        noMeters:       s.noMeters  ?? 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// GET /api/customers
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let where = "WHERE 1=1";
    const params: { name: string; type: any; value: any }[] = [];

    if (search) {
      params.push({ name: "search", type: mssql.NVarChar, value: `%${search}%` });
      where += " AND (c.CUSTOMER_CODE LIKE @search OR c.CUSTOMER_NAME LIKE @search OR c.PHONE LIKE @search OR c.EMAIL LIKE @search)";
    }

    const conn = await pool.connect();
    const addParams = (r: mssql.Request) => {
      params.forEach(p => r.input(p.name, p.type, p.value));
      return r;
    };

    const countReq = addParams(conn.request());
    const dataReq  = addParams(conn.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, parseInt(pageSize as string));

    const [countRes, dataRes] = await Promise.all([
      countReq.query(`SELECT COUNT(*) as total FROM INFO_CUSTOMER c WITH(NOLOCK) ${where}`),
      dataReq.query(`
        SELECT
          c.CUSTOMER_CODE    as customerCode,
          c.CUSTOMER_NAME    as customerName,
          c.PHONE            as phone,
          c.EMAIL            as email,
          c.CUSTOMER_ADDRESS as address,
          c.BILLING_DATE     as billingDate,
          c.CREATED          as created,
          c.NOTE             as note,
          ISNULL(mc.meterCount, 0) as meterCount
        FROM INFO_CUSTOMER c WITH(NOLOCK)
        LEFT JOIN (
          SELECT CUSTOMER_CODE, COUNT(*) as meterCount
          FROM INFO_METER WITH(NOLOCK)
          WHERE CUSTOMER_CODE IS NOT NULL AND CUSTOMER_CODE != ''
          GROUP BY CUSTOMER_CODE
        ) mc ON mc.CUSTOMER_CODE = c.CUSTOMER_CODE
        ${where}
        ORDER BY c.CUSTOMER_CODE
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `)
    ]);

    res.json({
      code: 0,
      message: "common.success",
      data: {
        list:     dataRes.recordset,
        total:    countRes.recordset[0].total,
        page:     parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }
    });
  } catch (error: any) {
    console.error("Get customers error:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/customers
router.post("/", async (req, res) => {
  try {
    const { customerCode, customerName, phone, email, address, billingDate, note } = req.body;
    if (!customerCode) return res.status(400).json({ code: 400, message: "Mã khách hàng là bắt buộc" });

    const conn = await pool.connect();
    await conn.request()
      .input("customerCode", mssql.NVarChar, customerCode)
      .input("customerName", mssql.NVarChar, customerName ?? null)
      .input("phone",        mssql.NVarChar, phone        ?? null)
      .input("email",        mssql.NVarChar, email        ?? null)
      .input("address",      mssql.NVarChar, address      ?? null)
      .input("billingDate",  mssql.NVarChar, billingDate  ?? null)
      .input("note",         mssql.NVarChar, note         ?? null)
      .query(`
        INSERT INTO INFO_CUSTOMER (CUSTOMER_CODE, CUSTOMER_NAME, PHONE, EMAIL, CUSTOMER_ADDRESS, BILLING_DATE, NOTE, CREATED)
        VALUES (@customerCode, @customerName, @phone, @email, @address, @billingDate, @note, GETDATE())
      `);

    res.json({ code: 0, message: "Thêm khách hàng thành công" });
  } catch (error: any) {
    console.error("Create customer error:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// PUT /api/customers/:customerCode
router.put("/:customerCode", async (req, res) => {
  try {
    const { customerName, phone, email, address, billingDate, note } = req.body;
    const conn = await pool.connect();
    await conn.request()
      .input("customerCode", mssql.NVarChar, req.params.customerCode)
      .input("customerName", mssql.NVarChar, customerName ?? null)
      .input("phone",        mssql.NVarChar, phone        ?? null)
      .input("email",        mssql.NVarChar, email        ?? null)
      .input("address",      mssql.NVarChar, address      ?? null)
      .input("billingDate",  mssql.NVarChar, billingDate  ?? null)
      .input("note",         mssql.NVarChar, note         ?? null)
      .query(`
        UPDATE INFO_CUSTOMER SET
          CUSTOMER_NAME    = @customerName,
          PHONE            = @phone,
          EMAIL            = @email,
          CUSTOMER_ADDRESS = @address,
          BILLING_DATE     = @billingDate,
          NOTE             = @note
        WHERE CUSTOMER_CODE = @customerCode
      `);

    res.json({ code: 0, message: "Cập nhật thành công" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// DELETE /api/customers/:customerCode
router.delete("/:customerCode", async (req, res) => {
  try {
    const conn = await pool.connect();
    await conn.request()
      .input("customerCode", mssql.NVarChar, req.params.customerCode)
      .query(`DELETE FROM INFO_CUSTOMER WHERE CUSTOMER_CODE = @customerCode`);

    res.json({ code: 0, message: "Xóa thành công" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// GET /api/customers/:customerCode — detail + danh sách đồng hồ
router.get("/:customerCode", async (req, res) => {
  try {
    const conn = await pool.connect();

    const [custRes, metersRes] = await Promise.all([
      conn.request()
        .input("customerCode", mssql.NVarChar, req.params.customerCode)
        .query(`
          SELECT
            CUSTOMER_CODE    as customerCode,
            CUSTOMER_NAME    as customerName,
            PHONE            as phone,
            EMAIL            as email,
            CUSTOMER_ADDRESS as address,
            BILLING_DATE     as billingDate,
            CREATED          as created,
            NOTE             as note
          FROM INFO_CUSTOMER WITH(NOLOCK)
          WHERE CUSTOMER_CODE = @customerCode
        `),
      conn.request()
        .input("customerCode", mssql.NVarChar, req.params.customerCode)
        .query(`
          SELECT
            m.METER_NO       as meterNo,
            m.METER_NAME     as meterName,
            m.STATE          as state,
            m.ADDRESS        as address,
            m.IMEI           as imei,
            m.CREATED        as created,
            hi.REALTIME      as realtime,
            hi.SIGNAL        as signal,
            hi.REMAIN_BATTERY as remainBattery,
            hi.GATEWAY_NO    as gatewayNo,
            hi.CREATED       as lastSeen
          FROM INFO_METER m WITH(NOLOCK)
          OUTER APPLY (
            SELECT TOP 1 REALTIME, SIGNAL, REMAIN_BATTERY, GATEWAY_NO, CREATED
            FROM HIS_INSTANT_METER WITH(NOLOCK)
            WHERE METER_NO = m.METER_NO
            ORDER BY CREATED DESC
          ) hi
          WHERE m.CUSTOMER_CODE = @customerCode
          ORDER BY m.METER_NO
        `)
    ]);

    if (custRes.recordset.length === 0) {
      return res.status(404).json({ code: 404, message: "Khách hàng không tồn tại" });
    }

    res.json({
      code: 0,
      message: "common.success",
      data: { ...custRes.recordset[0], meters: metersRes.recordset }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
