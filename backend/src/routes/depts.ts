import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/depts - Lấy danh sách tất cả phòng ban
router.get("/", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
        SELECT 
          DEPT_ID as id,
          PARENT_ID as parentId,
          DEPT_NAME as name,
          DEPT_CODE as code,
          LEADER as leader,
          PHONE as phone,
          EMAIL as email,
          STATUS as status,
          SORT as rank,
          REMARK as remark
        FROM IAUDIT_DEPT
        ORDER BY SORT ASC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/depts - Tạo phòng ban mới
router.post("/", async (req, res) => {
  try {
    const { name, code, parentId, leader, phone, email, status, sort, remark } =
      req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("DEPT_NAME", mssql.NVarChar, name)
      .input("DEPT_CODE", mssql.VarChar, code)
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("LEADER", mssql.NVarChar, leader || "")
      .input("PHONE", mssql.VarChar, phone || "")
      .input("EMAIL", mssql.VarChar, email || "")
      .input("STATUS", mssql.Int, status || 1)
      .input("SORT", mssql.Int, sort || 0)
      .input("REMARK", mssql.NVarChar, remark || "").query(`
        INSERT INTO IAUDIT_DEPT (DEPT_NAME, DEPT_CODE, PARENT_ID, LEADER, PHONE, EMAIL, STATUS, SORT, REMARK)
        VALUES (@DEPT_NAME, @DEPT_CODE, @PARENT_ID, @LEADER, @PHONE, @EMAIL, @STATUS, @SORT, @REMARK);
        SELECT SCOPE_IDENTITY() as id;
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Đã tạo phòng ban thành công"
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/depts/:id - Cập nhật phòng ban
router.put("/:id", async (req, res) => {
  try {
    const { name, code, parentId, leader, phone, email, status, sort, remark } =
      req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("DEPT_NAME", mssql.NVarChar, name)
      .input("DEPT_CODE", mssql.VarChar, code)
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("LEADER", mssql.NVarChar, leader || "")
      .input("PHONE", mssql.VarChar, phone || "")
      .input("EMAIL", mssql.VarChar, email || "")
      .input("STATUS", mssql.Int, status || 1)
      .input("SORT", mssql.Int, sort || 0)
      .input("REMARK", mssql.NVarChar, remark || "").query(`
        UPDATE IAUDIT_DEPT
        SET DEPT_NAME = @DEPT_NAME, DEPT_CODE = @DEPT_CODE, PARENT_ID = @PARENT_ID, 
            LEADER = @LEADER, PHONE = @PHONE, EMAIL = @EMAIL, STATUS = @STATUS, 
            SORT = @SORT, REMARK = @REMARK
        WHERE DEPT_ID = @id
      `);

    res.json({
      success: true,
      message: "Cập nhật phòng ban thành công"
    });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/depts/:id - Xóa phòng ban
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .query(`DELETE FROM IAUDIT_DEPT WHERE DEPT_ID = @id`);

    res.json({
      success: true,
      message: "Đã xóa phòng ban thành công"
    });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
