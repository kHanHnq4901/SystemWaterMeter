import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/roles - Lấy danh sách roles kèm theo danh sách Menu_ID được cấp
router.get("/", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT 
        r.ROLE_ID,
        r.ROLE_NAME,
        r.ROLE_CODE,
        r.REMARK,
        r.STATE,
        (
          SELECT rm.MENU_ID 
          FROM IAUDIT_ROLE_MENU rm 
          WHERE rm.ROLE_ID = r.ROLE_ID 
          FOR JSON PATH
        ) as MENUS
      FROM IAUDIT_ROLE r
      ORDER BY r.ROLE_ID DESC
    `);

    // Parse chuỗi JSON thành mảng [1, 2, 3...]
    const roles = result.recordset.map(role => ({
      ...role,
      MENUS: role.MENUS ? JSON.parse(role.MENUS).map(m => m.MENU_ID) : []
    }));

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/roles - Tạo Role mới và cấp Menus
router.post("/", async (req, res) => {
  try {
    const { ROLE_NAME, ROLE_CODE, REMARK, MENUS } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Tạo Role
      const roleResult = await request
        .input("ROLE_NAME", mssql.NVarChar, ROLE_NAME)
        .input("ROLE_CODE", mssql.NVarChar, ROLE_CODE)
        .input("REMARK", mssql.NVarChar, REMARK || "").query(`
          INSERT INTO IAUDIT_ROLE (ROLE_NAME, ROLE_CODE, REMARK, STATE)
          VALUES (@ROLE_NAME, @ROLE_CODE, @REMARK, 1);
          SELECT SCOPE_IDENTITY() as NEW_ROLE_ID;
        `);

      const newRoleId = roleResult.recordset[0].NEW_ROLE_ID;

      // 2. Thêm Menus cho Role
      if (MENUS && Array.isArray(MENUS) && MENUS.length > 0) {
        for (const menuId of MENUS) {
          const menuReq = new mssql.Request(transaction);
          await menuReq
            .input("ROLE_ID", mssql.Int, newRoleId)
            .input("MENU_ID", mssql.Int, menuId)
            .query(
              `INSERT INTO IAUDIT_ROLE_MENU (ROLE_ID, MENU_ID) VALUES (@ROLE_ID, @MENU_ID)`
            );
        }
      }

      await transaction.commit();
      res.status(201).json({ success: true, data: { ROLE_ID: newRoleId } });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/roles/:id - Cập nhật Role và Menus
router.put("/:id", async (req, res) => {
  try {
    const { ROLE_NAME, ROLE_CODE, REMARK, STATE, MENUS } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Cập nhật bảng Role
      await request
        .input("id", mssql.Int, req.params.id)
        .input("ROLE_NAME", mssql.NVarChar, ROLE_NAME)
        .input("ROLE_CODE", mssql.NVarChar, ROLE_CODE)
        .input("REMARK", mssql.NVarChar, REMARK)
        .input("STATE", mssql.Int, STATE).query(`
          UPDATE IAUDIT_ROLE
          SET ROLE_NAME = @ROLE_NAME, ROLE_CODE = @ROLE_CODE, REMARK = @REMARK, STATE = @STATE
          WHERE ROLE_ID = @id
        `);

      // 2. Cập nhật Menus (Xóa cũ, Thêm mới)
      if (MENUS && Array.isArray(MENUS)) {
        const deleteMenuReq = new mssql.Request(transaction);
        await deleteMenuReq
          .input("ROLE_ID", mssql.Int, req.params.id)
          .query(`DELETE FROM IAUDIT_ROLE_MENU WHERE ROLE_ID = @ROLE_ID`);

        for (const menuId of MENUS) {
          const insertMenuReq = new mssql.Request(transaction);
          await insertMenuReq
            .input("ROLE_ID", mssql.Int, req.params.id)
            .input("MENU_ID", mssql.Int, menuId)
            .query(
              `INSERT INTO IAUDIT_ROLE_MENU (ROLE_ID, MENU_ID) VALUES (@ROLE_ID, @MENU_ID)`
            );
        }
      }

      await transaction.commit();
      res.json({ success: true, message: "Role updated" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/roles/:id - Xóa Role
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);
      const roleId = req.params.id;

      // 1. Dọn dẹp rác ở bảng Role_Menu
      await request
        .input("id", mssql.Int, roleId)
        .query(`DELETE FROM IAUDIT_ROLE_MENU WHERE ROLE_ID = @id`);

      // 2. Dọn dẹp rác ở bảng User_Role (Tước quyền này khỏi các user đang giữ)
      const cleanUserRoleReq = new mssql.Request(transaction);
      await cleanUserRoleReq
        .input("id", mssql.Int, roleId)
        .query(`DELETE FROM IAUDIT_USER_ROLE WHERE ROLE_ID = @id`);

      // 3. Xóa Role chính
      const deleteRoleReq = new mssql.Request(transaction);
      await deleteRoleReq
        .input("id", mssql.Int, roleId)
        .query(`DELETE FROM IAUDIT_ROLE WHERE ROLE_ID = @id`);

      await transaction.commit();
      res.json({ success: true, message: "Role deleted completely" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
