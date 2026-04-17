import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/invoices - Get all invoices with pagination and filters
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      fromDate,
      toDate,
      search,
      provinceId,
      districtId
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND i.STATUS = @status";
    }
    if (fromDate) {
      params.push({ name: "fromDate", value: fromDate });
      whereClause += " AND i.INVOICE_DATE >= @fromDate";
    }
    if (toDate) {
      params.push({ name: "toDate", value: toDate });
      whereClause += " AND i.INVOICE_DATE <= @toDate";
    }
    if (search) {
      params.push({ name: "search", value: `%${search}%` });
      whereClause +=
        " AND (i.INVOICE_CODE LIKE @search OR c.CUSTOMER_NAME LIKE @search)";
    }
    if (provinceId) {
      params.push({ name: "provinceId", value: parseInt(provinceId) });
      whereClause += " AND c.PROVINCE_ID = @provinceId";
    }
    if (districtId) {
      params.push({ name: "districtId", value: parseInt(districtId) });
      whereClause += " AND c.DISTRICT_ID = @districtId";
    }

    const connection = await pool.connect();

    // Get total count
    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total
      FROM WM_INVOICE i
      JOIN WM_CUSTOMER c ON i.CUSTOMER_ID = c.CUSTOMER_ID
      ${whereClause}
    `);

    // Get data with pagination
    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        i.INVOICE_ID as id,
        i.INVOICE_CODE as invoiceCode,
        i.INVOICE_DATE as invoiceDate,
        i.PERIOD_FROM as periodFrom,
        i.PERIOD_TO as periodTo,
        i.PREVIOUS_READING as previousReading,
        i.CURRENT_READING as currentReading,
        i.CONSUMPTION as consumption,
        i.UNIT_PRICE as unitPrice,
        i.TOTAL_AMOUNT as totalAmount,
        i.STATUS as status,
        i.DUE_DATE as dueDate,
        i.PAID_DATE as paidDate,
        c.CUSTOMER_ID as customerId,
        c.CUSTOMER_CODE as customerCode,
        c.CUSTOMER_NAME as customerName,
        c.ADDRESS as address,
        p.PROVINCE_NAME as provinceName,
        d.DISTRICT_NAME as districtName
      FROM WM_INVOICE i
      JOIN WM_CUSTOMER c ON i.CUSTOMER_ID = c.CUSTOMER_ID
      LEFT JOIN WM_PROVINCE p ON c.PROVINCE_ID = p.PROVINCE_ID
      LEFT JOIN WM_DISTRICT d ON c.DISTRICT_ID = d.DISTRICT_ID
      ${whereClause}
      ORDER BY i.INVOICE_DATE DESC
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
    console.error("Get invoices error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/:id - Get single invoice detail
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT 
          i.*,
          c.CUSTOMER_NAME,
          c.PHONE,
          c.ADDRESS,
          p.PROVINCE_NAME,
          d.DISTRICT_NAME,
          w.WARD_NAME
        FROM WM_INVOICE i
        JOIN WM_CUSTOMER c ON i.CUSTOMER_ID = c.CUSTOMER_ID
        LEFT JOIN WM_PROVINCE p ON c.PROVINCE_ID = p.PROVINCE_ID
        LEFT JOIN WM_DISTRICT d ON c.DISTRICT_ID = d.DISTRICT_ID
        LEFT JOIN WM_WARD w ON c.WARD_ID = w.WARD_ID
        WHERE i.INVOICE_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Hóa đơn không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get invoice detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices - Create new invoice
router.post("/", async (req, res) => {
  try {
    const {
      invoiceCode,
      customerId,
      invoiceDate,
      periodFrom,
      periodTo,
      previousReading,
      currentReading,
      consumption,
      unitPrice,
      totalAmount,
      dueDate
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("invoiceCode", mssql.VarChar, invoiceCode)
      .input("customerId", mssql.Int, customerId)
      .input("invoiceDate", mssql.DateTime, invoiceDate || new Date())
      .input("periodFrom", mssql.DateTime, periodFrom)
      .input("periodTo", mssql.DateTime, periodTo)
      .input("previousReading", mssql.Decimal(10, 2), previousReading)
      .input("currentReading", mssql.Decimal(10, 2), currentReading)
      .input("consumption", mssql.Decimal(10, 2), consumption)
      .input("unitPrice", mssql.Decimal(10, 2), unitPrice)
      .input("totalAmount", mssql.Decimal(15, 2), totalAmount)
      .input("dueDate", mssql.DateTime, dueDate).query(`
        INSERT INTO WM_INVOICE (
          INVOICE_CODE, CUSTOMER_ID, INVOICE_DATE, PERIOD_FROM, PERIOD_TO,
          PREVIOUS_READING, CURRENT_READING, CONSUMPTION, UNIT_PRICE,
          TOTAL_AMOUNT, DUE_DATE, STATUS
        )
        VALUES (
          @invoiceCode, @customerId, @invoiceDate, @periodFrom, @periodTo,
          @previousReading, @currentReading, @consumption, @unitPrice,
          @totalAmount, @dueDate, 1
        )
        SELECT SCOPE_IDENTITY() as id
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Đã tạo hóa đơn thành công"
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put("/:id", async (req, res) => {
  try {
    const {
      invoiceCode,
      periodFrom,
      periodTo,
      previousReading,
      currentReading,
      consumption,
      unitPrice,
      totalAmount,
      dueDate,
      status
    } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("invoiceCode", mssql.VarChar, invoiceCode)
      .input("periodFrom", mssql.DateTime, periodFrom)
      .input("periodTo", mssql.DateTime, periodTo)
      .input("previousReading", mssql.Decimal(10, 2), previousReading)
      .input("currentReading", mssql.Decimal(10, 2), currentReading)
      .input("consumption", mssql.Decimal(10, 2), consumption)
      .input("unitPrice", mssql.Decimal(10, 2), unitPrice)
      .input("totalAmount", mssql.Decimal(15, 2), totalAmount)
      .input("dueDate", mssql.DateTime, dueDate)
      .input("status", mssql.Int, status || 1).query(`
        UPDATE WM_INVOICE SET
          INVOICE_CODE = @invoiceCode,
          PERIOD_FROM = @periodFrom,
          PERIOD_TO = @periodTo,
          PREVIOUS_READING = @previousReading,
          CURRENT_READING = @currentReading,
          CONSUMPTION = @consumption,
          UNIT_PRICE = @unitPrice,
          TOTAL_AMOUNT = @totalAmount,
          DUE_DATE = @dueDate,
          STATUS = @status
        WHERE INVOICE_ID = @id
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices/:id/pay - Mark invoice as paid
router.post("/:id/pay", async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("paidDate", mssql.DateTime, new Date())
      .input("paymentMethod", mssql.VarChar, paymentMethod || "Cash")
      .input("notes", mssql.NVarChar, notes || "").query(`
        UPDATE WM_INVOICE SET
          STATUS = 3,
          PAID_DATE = @paidDate,
          PAYMENT_METHOD = @paymentMethod,
          NOTES = @notes
        WHERE INVOICE_ID = @id
      `);

    res.json({ success: true, message: "Thanh toán thành công" });
  } catch (error) {
    console.error("Pay invoice error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/stats/summary - Get billing statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Total invoices stats
    const totalResult = await connection.request().query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(TOTAL_AMOUNT) as totalAmount,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as pendingInvoices,
        SUM(CASE WHEN STATUS = 2 THEN 1 ELSE 0 END) as overdueInvoices,
        SUM(CASE WHEN STATUS = 3 THEN TOTAL_AMOUNT ELSE 0 END) as paidAmount,
        SUM(CASE WHEN STATUS = 1 THEN TOTAL_AMOUNT ELSE 0 END) as pendingAmount
      FROM WM_INVOICE
    `);

    // This month stats
    const monthResult = await connection.request().query(`
      SELECT 
        COUNT(*) as totalInvoices,
        SUM(TOTAL_AMOUNT) as totalAmount,
        SUM(CASE WHEN STATUS = 3 THEN TOTAL_AMOUNT ELSE 0 END) as collectedAmount
      FROM WM_INVOICE
      WHERE MONTH(INVOICE_DATE) = MONTH(GETDATE()) AND YEAR(INVOICE_DATE) = YEAR(GETDATE())
    `);

    res.json({
      success: true,
      data: {
        overall: totalResult.recordset[0],
        monthly: monthResult.recordset[0]
      }
    });
  } catch (error) {
    console.error("Get billing stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
