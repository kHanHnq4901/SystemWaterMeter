import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/maintenance - Get all work orders
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      priority,
      fromDate,
      toDate
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (status) {
      params.push({ name: "status", value: parseInt(status) });
      whereClause += " AND m.STATUS = @status";
    }
    if (priority) {
      params.push({ name: "priority", value: parseInt(priority) });
      whereClause += " AND m.PRIORITY = @priority";
    }
    if (fromDate) {
      params.push({ name: "fromDate", value: fromDate });
      whereClause += " AND m.CREATED_DATE >= @fromDate";
    }
    if (toDate) {
      params.push({ name: "toDate", value: toDate });
      whereClause += " AND m.CREATED_DATE <= @toDate";
    }

    const connection = await pool.connect();

    const countResult = await connection.request().query(`
      SELECT COUNT(*) as total FROM WM_MAINTENANCE m ${whereClause}
    `);

    const request = connection.request();
    params.forEach(p => request.input(p.name, p.value));

    const result = await request.query(`
      SELECT 
        m.MAINTENANCE_ID as id,
        m.WORK_ORDER_CODE as workOrderCode,
        m.TITLE as title,
        m.DESCRIPTION as description,
        m.STATUS as status,
        m.PRIORITY as priority,
        m.SCHEDULED_DATE as scheduledDate,
        m.COMPLETED_DATE as completedDate,
        m.CREATED_BY as createdBy,
        m.CREATED_DATE as createdDate,
        m.ASSIGNED_TO as assignedTo,
        wm.WATER_METER_ID as meterId,
        wm.METER_CODE as meterCode,
        c.CUSTOMER_NAME as customerName,
        CASE 
          WHEN m.STATUS = 1 THEN 'Mới tạo'
          WHEN m.STATUS = 2 THEN 'Đang xử lý'
          WHEN m.STATUS = 3 THEN 'Hoàn thành'
          WHEN m.STATUS = 4 THEN 'Hủy'
          ELSE 'Không xác định'
        END as statusName,
        CASE 
          WHEN m.PRIORITY = 1 THEN 'Cao'
          WHEN m.PRIORITY = 2 THEN 'Trung bình'
          WHEN m.PRIORITY = 3 THEN 'Thấp'
          ELSE 'Không xác định'
        END as priorityName
      FROM WM_MAINTENANCE m
      LEFT JOIN WM_WATER_METER wm ON m.METER_ID = wm.WATER_METER_ID
      LEFT JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
      ${whereClause}
      ORDER BY m.CREATED_DATE DESC
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
    console.error("Get maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance/:id - Get single work order
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT m.*, wm.METER_CODE, c.CUSTOMER_NAME, c.PHONE, c.ADDRESS
        FROM WM_MAINTENANCE m
        LEFT JOIN WM_WATER_METER wm ON m.METER_ID = wm.WATER_METER_ID
        LEFT JOIN WM_CUSTOMER c ON wm.CUSTOMER_ID = c.CUSTOMER_ID
        WHERE m.MAINTENANCE_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Phiếu bảo trì không tồn tại" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get maintenance detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/maintenance - Create work order
router.post("/", async (req, res) => {
  try {
    const {
      workOrderCode,
      title,
      description,
      priority,
      scheduledDate,
      meterId,
      assignedTo
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("workOrderCode", mssql.VarChar, workOrderCode)
      .input("title", mssql.NVarChar, title)
      .input("description", mssql.NVarChar, description || "")
      .input("priority", mssql.Int, priority || 2)
      .input("scheduledDate", mssql.DateTime, scheduledDate || null)
      .input("meterId", mssql.Int, meterId || null)
      .input("assignedTo", mssql.VarChar, assignedTo || "").query(`
        INSERT INTO WM_MAINTENANCE (
          WORK_ORDER_CODE, TITLE, DESCRIPTION, PRIORITY, SCHEDULED_DATE,
          METER_ID, ASSIGNED_TO, STATUS, CREATED_BY, CREATED_DATE
        )
        VALUES (
          @workOrderCode, @title, @description, @priority, @scheduledDate,
          @meterId, @assignedTo, 1, 'System', GETDATE()
        )
        SELECT SCOPE_IDENTITY() as id
      `);

    res
      .status(201)
      .json({ success: true, data: { id: result.recordset[0].id } });
  } catch (error) {
    console.error("Create maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/maintenance/:id - Update work order
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      scheduledDate,
      status,
      assignedTo,
      notes
    } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("title", mssql.NVarChar, title)
      .input("description", mssql.NVarChar, description || "")
      .input("priority", mssql.Int, priority || 2)
      .input("scheduledDate", mssql.DateTime, scheduledDate || null)
      .input("status", mssql.Int, status || 1)
      .input("assignedTo", mssql.VarChar, assignedTo || "")
      .input("notes", mssql.NVarChar, notes || "").query(`
        UPDATE WM_MAINTENANCE SET
          TITLE = @title,
          DESCRIPTION = @description,
          PRIORITY = @priority,
          SCHEDULED_DATE = @scheduledDate,
          STATUS = @status,
          ASSIGNED_TO = @assignedTo,
          NOTES = @notes
        WHERE MAINTENANCE_ID = @id
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Update maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/maintenance/:id/complete - Complete work order
router.put("/:id/complete", async (req, res) => {
  try {
    const { notes } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("notes", mssql.NVarChar, notes || "").query(`
        UPDATE WM_MAINTENANCE SET
          STATUS = 3,
          COMPLETED_DATE = GETDATE(),
          NOTES = ISNULL(NOTES, '') + ' | ' + @notes
        WHERE MAINTENANCE_ID = @id
      `);

    res.json({ success: true, message: "Hoàn thành phiếu bảo trì" });
  } catch (error) {
    console.error("Complete maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/maintenance/:id - Delete work order
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`DELETE FROM WM_MAINTENANCE WHERE MAINTENANCE_ID = @id`);

    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    console.error("Delete maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/maintenance/stats - Get maintenance statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN STATUS = 1 THEN 1 ELSE 0 END) as newOrders,
        SUM(CASE WHEN STATUS = 2 THEN 1 ELSE 0 END) as inProgressOrders,
        SUM(CASE WHEN STATUS = 3 THEN 1 ELSE 0 END) as completedOrders,
        SUM(CASE WHEN PRIORITY = 1 THEN 1 ELSE 0 END) as highPriority,
        SUM(CASE WHEN PRIORITY = 2 THEN 1 ELSE 0 END) as mediumPriority,
        SUM(CASE WHEN PRIORITY = 3 THEN 1 ELSE 0 END) as lowPriority
      FROM WM_MAINTENANCE
      WHERE CREATED_DATE >= DATEADD(month, -1, GETDATE())
    `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get maintenance stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
