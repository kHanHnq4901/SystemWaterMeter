import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/get-async-routes - API trả về router cho Vue-Pure-Admin
router.get("/get-async-routes", async (req, res) => {
  try {
    const connection = await pool.connect();

    // Giả sử bạn lấy USER_ID từ Token JWT (Ở đây hardcode tạm ID = 1 là admin để test)
    const currentUserId = 1;

    // 1. Truy vấn lấy TẤT CẢ các Menu mà User này được phép thấy
    // ĐÃ SỬA LẠI STRING_AGG THÀNH STUFF + FOR XML PATH
    const result = await connection
      .request()
      .input("userId", mssql.Int, currentUserId).query(`
        SELECT DISTINCT
          m.MENU_ID, m.PARENT_ID, m.MENU_TYPE, m.TITLE, m.NAME, 
          m.PATH, m.COMPONENT, m.ICON, m.RANK, m.PERMISSION, 
          m.IS_SHOW, m.IS_KEEPALIVE, m.FRAME_SRC,
          (
            -- Lấy mảng Role Code ghép bằng dấu phẩy tương thích với mọi bản SQL Server
            SELECT STUFF((
              SELECT ',' + r2.ROLE_CODE
              FROM IAUDIT_ROLE_MENU rm2
              JOIN IAUDIT_ROLE r2 ON rm2.ROLE_ID = r2.ROLE_ID
              WHERE rm2.MENU_ID = m.MENU_ID
              FOR XML PATH('')
            ), 1, 1, '')
          ) as ROLES
        FROM IAUDIT_MENU m
        JOIN IAUDIT_ROLE_MENU rm ON m.MENU_ID = rm.MENU_ID
        JOIN IAUDIT_USER_ROLE ur ON rm.ROLE_ID = ur.ROLE_ID
        WHERE ur.USER_ID = @userId AND m.STATE = 1
        ORDER BY m.RANK ASC
      `);

    const flatMenus = result.recordset;

    // 2. Thuật toán biến mảng phẳng (Flat Array) thành cây đệ quy (Tree)
    const buildTree = (parentId = 0) => {
      const tree = [];

      // Tìm các menu là con của parentId hiện tại (bỏ qua MENU_TYPE = 2 vì nó là nút bấm)
      const children = flatMenus.filter(
        m => m.PARENT_ID === parentId && m.MENU_TYPE !== 2
      );

      for (const item of children) {
        // Lọc ra danh sách quyền của các nút bấm (MENU_TYPE = 2) nằm bên trong trang này
        const buttonAuths = flatMenus
          .filter(m => m.PARENT_ID === item.MENU_ID && m.MENU_TYPE === 2)
          .map(m => m.PERMISSION);

        // Khởi tạo object theo đúng cấu trúc Mock của vue-pure-admin
        const route = {
          path: item.PATH,
          name: item.NAME || undefined,
          component: item.COMPONENT || undefined,
          meta: {
            title: item.TITLE,
            icon: item.ICON || undefined,
            rank: item.RANK || 0,
            roles: item.ROLES ? item.ROLES.split(",") : [],
            showLink: item.IS_SHOW,
            keepAlive: item.IS_KEEPALIVE,
            frameSrc: item.FRAME_SRC || undefined
          }
        };

        // Nếu trang này có các nút bấm phân quyền, nhét vào mảng auths
        if (buttonAuths.length > 0) {
          route.meta.auths = buttonAuths;
        }

        // Đệ quy tìm tiếp các menu con của menu này
        const subChildren = buildTree(item.MENU_ID);
        if (subChildren.length > 0) {
          route.children = subChildren;
        }

        tree.push(route);
      }
      return tree;
    };

    // Bắt đầu build cây từ gốc (PARENT_ID = 0)
    const asyncRoutesTree = buildTree(0);

    // 3. Trả về với cấu trúc { code, message, data } y hệt file Mock cũ
    res.json({
      code: 0,
      message: "Thao tác thành công",
      data: asyncRoutesTree
    });
  } catch (error) {
    console.error("Lỗi khi sinh dynamic routes:", error);
    res.status(500).json({ code: -1, message: error.message });
  }
});

// GET /api/menus - Lấy danh sách tất cả menu
router.get("/", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
        SELECT 
          MENU_ID as id,
          PARENT_ID as parentId,
          MENU_TYPE as menuType,
          TITLE as title,
          NAME as name,
          PATH as path,
          COMPONENT as component,
          ICON as icon,
          RANK as rank,
          PERMISSION as permission,
          IS_SHOW as isShow,
          IS_KEEPALIVE as isKeepalive,
          FRAME_SRC as frameSrc,
          STATE as status,
          REMARK as remark
        FROM IAUDIT_MENU
        ORDER BY RANK ASC
      `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("Get menus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/menus - Tạo menu mới
router.post("/", async (req, res) => {
  try {
    const {
      title,
      name,
      path,
      component,
      icon,
      parentId,
      menuType,
      permission,
      rank,
      isShow,
      isKeepalive,
      frameSrc,
      status,
      remark
    } = req.body;

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("TITLE", mssql.NVarChar, title)
      .input("NAME", mssql.VarChar, name || "")
      .input("PATH", mssql.VarChar, path || "")
      .input("COMPONENT", mssql.VarChar, component || "")
      .input("ICON", mssql.VarChar, icon || "")
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("MENU_TYPE", mssql.Int, menuType || 1)
      .input("PERMISSION", mssql.VarChar, permission || "")
      .input("RANK", mssql.Int, rank || 0)
      .input("IS_SHOW", mssql.Bit, isShow ?? 1)
      .input("IS_KEEPALIVE", mssql.Bit, isKeepalive ?? 0)
      .input("FRAME_SRC", mssql.VarChar, frameSrc || "")
      .input("STATE", mssql.Int, status || 1)
      .input("REMARK", mssql.NVarChar, remark || "").query(`
        INSERT INTO IAUDIT_MENU (TITLE, NAME, PATH, COMPONENT, ICON, PARENT_ID, MENU_TYPE, PERMISSION, RANK, IS_SHOW, IS_KEEPALIVE, FRAME_SRC, STATE, REMARK)
        VALUES (@TITLE, @NAME, @PATH, @COMPONENT, @ICON, @PARENT_ID, @MENU_TYPE, @PERMISSION, @RANK, @IS_SHOW, @IS_KEEPALIVE, @FRAME_SRC, @STATE, @REMARK);
        SELECT SCOPE_IDENTITY() as id;
      `);

    res.status(201).json({
      success: true,
      data: { id: result.recordset[0].id },
      message: "Đã tạo menu thành công"
    });
  } catch (error) {
    console.error("Create menu error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/menus/:id - Cập nhật menu
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      name,
      path,
      component,
      icon,
      parentId,
      menuType,
      permission,
      rank,
      isShow,
      isKeepalive,
      frameSrc,
      status,
      remark
    } = req.body;

    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.Int, req.params.id)
      .input("TITLE", mssql.NVarChar, title)
      .input("NAME", mssql.VarChar, name || "")
      .input("PATH", mssql.VarChar, path || "")
      .input("COMPONENT", mssql.VarChar, component || "")
      .input("ICON", mssql.VarChar, icon || "")
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("MENU_TYPE", mssql.Int, menuType || 1)
      .input("PERMISSION", mssql.VarChar, permission || "")
      .input("RANK", mssql.Int, rank || 0)
      .input("IS_SHOW", mssql.Bit, isShow ?? 1)
      .input("IS_KEEPALIVE", mssql.Bit, isKeepalive ?? 0)
      .input("FRAME_SRC", mssql.VarChar, frameSrc || "")
      .input("STATE", mssql.Int, status || 1)
      .input("REMARK", mssql.NVarChar, remark || "").query(`
        UPDATE IAUDIT_MENU
        SET TITLE = @TITLE, NAME = @NAME, PATH = @PATH, COMPONENT = @COMPONENT, ICON = @ICON, PARENT_ID = @PARENT_ID,
            MENU_TYPE = @MENU_TYPE, PERMISSION = @PERMISSION, RANK = @RANK, IS_SHOW = @IS_SHOW, IS_KEEPALIVE = @IS_KEEPALIVE,
            FRAME_SRC = @FRAME_SRC, STATE = @STATE, REMARK = @REMARK
        WHERE MENU_ID = @id
      `);

    res.json({
      success: true,
      message: "Cập nhật menu thành công"
    });
  } catch (error) {
    console.error("Update menu error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/menus/:id - Xóa menu
router.delete("/:id", async (req, res) => {
  try {
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      // Xóa các quyền liên quan ở ROLE_MENU
      await new mssql.Request(transaction)
        .input("id", mssql.Int, req.params.id)
        .query(`DELETE FROM IAUDIT_ROLE_MENU WHERE MENU_ID = @id`);

      // Xóa menu
      await new mssql.Request(transaction)
        .input("id", mssql.Int, req.params.id)
        .query(`DELETE FROM IAUDIT_MENU WHERE MENU_ID = @id`);

      await transaction.commit();
      res.json({
        success: true,
        message: "Đã xóa menu thành công"
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Delete menu error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
