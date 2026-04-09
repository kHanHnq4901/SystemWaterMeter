import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/users - Lấy danh sách tất cả users
router.get("/", async (req, res) => {
  try {
    const connection = await pool.connect();
    // Bổ sung thêm logic lấy danh sách roles của user (dạng mảng)
    const result = await connection.request().query(`
        SELECT 
          u.USER_ID,
          u.USER_ACCOUNT,
          u.USER_NAME,
          u.USER_TYPE,
          u.DEPT_ID,
          u.USER_ADDRESS,
          u.USER_TEL,
          u.USER_EMAIL,
          u.STATE,
          (
            SELECT r.ROLE_ID 
            FROM IAUDIT_USER_ROLE ur 
            JOIN IAUDIT_ROLE r ON ur.ROLE_ID = r.ROLE_ID 
            WHERE ur.USER_ID = u.USER_ID 
            FOR JSON PATH
          ) as ROLES
        FROM IAUDIT_USER u
        ORDER BY u.USER_ID DESC
      `);

    // Xử lý chuỗi JSON của roles thành mảng array cho frontend dễ dùng
    const users = result.recordset.map(user => ({
      ...user,
      ROLES: user.ROLES ? JSON.parse(user.ROLES).map(r => r.ROLE_ID) : []
    }));

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id - Lấy thông tin user theo ID
router.get("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.Int, req.params.id).query(`
        SELECT TOP 1
          USER_ID,
          USER_ACCOUNT,
          USER_NAME,
          USER_TYPE,
          DEPT_ID,
          USER_ADDRESS,
          USER_TEL,
          USER_EMAIL,
          STATE
        FROM IAUDIT_USER 
        WHERE USER_ID = @id
      `);

    if (result.recordset.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Tạo user mới
router.post("/", async (req, res) => {
  try {
    const {
      USER_ACCOUNT,
      USER_NAME,
      USER_PWD,
      USER_TYPE,
      DEPT_ID,
      USER_ADDRESS,
      USER_TEL,
      USER_EMAIL,
      ROLES // Nhận thêm mảng roles từ frontend (VD: [1, 2])
    } = req.body;

    if (!USER_ACCOUNT || !USER_PWD) {
      return res.status(400).json({
        success: false,
        message: "USER_ACCOUNT and USER_PWD are required"
      });
    }

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin(); // Dùng Transaction vì cần insert vào 2 bảng

    try {
      const request = new mssql.Request(transaction);

      // 1. Tạo User
      const userResult = await request
        .input("USER_ACCOUNT", mssql.VarChar, USER_ACCOUNT)
        .input("USER_NAME", mssql.NVarChar, USER_NAME || "")
        .input("USER_PWD", mssql.VarChar, USER_PWD)
        .input("USER_TYPE", mssql.Int, USER_TYPE || 1)
        .input("DEPT_ID", mssql.Int, DEPT_ID || null)
        .input("USER_ADDRESS", mssql.NVarChar, USER_ADDRESS || "")
        .input("USER_TEL", mssql.VarChar, USER_TEL || "")
        .input("USER_EMAIL", mssql.VarChar, USER_EMAIL || "").query(`
          INSERT INTO IAUDIT_USER (
            USER_ACCOUNT, USER_NAME, USER_PWD, USER_TYPE, DEPT_ID,
            USER_ADDRESS, USER_TEL, USER_EMAIL, STATE
          )
          VALUES (
            @USER_ACCOUNT, @USER_NAME, @USER_PWD, @USER_TYPE, @DEPT_ID,
            @USER_ADDRESS, @USER_TEL, @USER_EMAIL, 1
          );
          SELECT SCOPE_IDENTITY() as NEW_USER_ID;
        `);

      const newUserId = userResult.recordset[0].NEW_USER_ID;

      // 2. Thêm Roles vào bảng trung gian (nếu có)
      if (ROLES && Array.isArray(ROLES) && ROLES.length > 0) {
        for (const roleId of ROLES) {
          const roleRequest = new mssql.Request(transaction);
          await roleRequest
            .input("USER_ID", mssql.Int, newUserId)
            .input("ROLE_ID", mssql.Int, roleId)
            .query(
              `INSERT INTO IAUDIT_USER_ROLE (USER_ID, ROLE_ID) VALUES (@USER_ID, @ROLE_ID)`
            );
        }
      }

      await transaction.commit();
      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: { USER_ID: newUserId }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id - Cập nhật user
router.put("/:id", async (req, res) => {
  try {
    const {
      USER_NAME,
      USER_TYPE,
      DEPT_ID,
      USER_ADDRESS,
      USER_TEL,
      USER_EMAIL,
      STATE,
      ROLES // Cập nhật cả Roles
    } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Cập nhật thông tin User
      const updateResult = await request
        .input("id", mssql.Int, req.params.id)
        .input("USER_NAME", mssql.NVarChar, USER_NAME)
        .input("USER_TYPE", mssql.Int, USER_TYPE)
        .input("DEPT_ID", mssql.Int, DEPT_ID)
        .input("USER_ADDRESS", mssql.NVarChar, USER_ADDRESS)
        .input("USER_TEL", mssql.VarChar, USER_TEL)
        .input("USER_EMAIL", mssql.VarChar, USER_EMAIL)
        .input("STATE", mssql.Int, STATE).query(`
          UPDATE IAUDIT_USER
          SET USER_NAME = @USER_NAME,
             USER_TYPE = @USER_TYPE,
             DEPT_ID = @DEPT_ID,
             USER_ADDRESS = @USER_ADDRESS,
             USER_TEL = @USER_TEL,
             USER_EMAIL = @USER_EMAIL,
             STATE = @STATE
          WHERE USER_ID = @id
        `);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // 2. Cập nhật Roles: Xóa role cũ, Insert role mới
      if (ROLES && Array.isArray(ROLES)) {
        const deleteRoleReq = new mssql.Request(transaction);
        await deleteRoleReq
          .input("USER_ID", mssql.Int, req.params.id)
          .query(`DELETE FROM IAUDIT_USER_ROLE WHERE USER_ID = @USER_ID`);

        for (const roleId of ROLES) {
          const insertRoleReq = new mssql.Request(transaction);
          await insertRoleReq
            .input("USER_ID", mssql.Int, req.params.id)
            .input("ROLE_ID", mssql.Int, roleId)
            .query(
              `INSERT INTO IAUDIT_USER_ROLE (USER_ID, ROLE_ID) VALUES (@USER_ID, @ROLE_ID)`
            );
        }
      }

      await transaction.commit();
      res.json({ success: true, message: "User updated successfully" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id - Xóa user
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // Quan trọng: Phải xóa ở bảng trung gian IAUDIT_USER_ROLE trước vì chúng ta KHÔNG DÙNG khóa ngoại
      await request
        .input("id", mssql.Int, req.params.id)
        .query(`DELETE FROM IAUDIT_USER_ROLE WHERE USER_ID = @id`);

      // Sau đó mới xóa User
      const deleteUserReq = new mssql.Request(transaction);
      const result = await deleteUserReq
        .input("id", mssql.Int, req.params.id)
        .query(`DELETE FROM IAUDIT_USER WHERE USER_ID = @id`);

      if (result.rowsAffected[0] === 0) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      await transaction.commit();
      res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
