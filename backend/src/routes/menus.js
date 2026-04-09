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

export default router;
