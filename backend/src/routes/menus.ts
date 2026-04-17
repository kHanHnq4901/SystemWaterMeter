import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// ============================================================================
// 1. LẤY DANH SÁCH MENU (GET /api/menus hoặc POST /api/menus/list)
// Dùng để vẽ cây Menu trên màn hình Quản lý Menu (SystemMenu)
// ============================================================================
router.post("/list", async (req: Request, res: Response) => {
  try {
    const { title } = req.body; // Giao diện tìm kiếm theo tên menu (form.title)
    
    let whereClause = "WHERE DEL_FLAG = 0";
    const request = (await pool.connect()).request();

    if (title) {
      whereClause += " AND NAME LIKE @title";
      request.input("title", mssql.NVarChar, `%${title}%`);
    }

    // PHẢI DÙNG ALIAS (AS) để map cột DB thành biến của Vue-Pure-Admin
    const result = await request.query(`
        SELECT 
          ID as id,
          PARENT_ID as parentId,
          TYPE as menuType,
          NAME as title,             -- DB gọi là NAME, Vue gọi là title
          KEY_NAME as name,          -- DB gọi là KEY_NAME, Vue gọi là name (Router Name)
          URL as path,               -- DB gọi là URL, Vue gọi là path
          COMPONENT as component,
          ICON as icon,
          ORDER_NUM as rank,         -- Vue dùng chữ rank để sắp xếp
          PERMS as auths             -- Phân quyền nút bấm
        FROM SYS_MENU
        ${whereClause}
        ORDER BY ORDER_NUM ASC
      `);

    // Trả về cấu trúc mà Vue-Pure-Admin mong đợi (Data bọc trong list)
    res.json({
      code: 0,
      message: "Thành công",
      data: {
        list: result.recordset
      }
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách menu:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 2. THÊM MỚI MENU (POST /api/menus/add)
// ============================================================================
router.post("/add", async (req: Request, res: Response) => {
  try {
    const {
      title, name, path, component, icon, parentId, 
      menuType, auths, rank
    } = req.body;

    const connection = await pool.connect();
    await connection.request()
      .input("NAME", mssql.NVarChar, title)
      .input("KEY_NAME", mssql.VarChar, name || "")
      .input("URL", mssql.VarChar, path || "")
      .input("COMPONENT", mssql.VarChar, component || "")
      .input("ICON", mssql.VarChar, icon || "")
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("TYPE", mssql.Int, menuType || 0)
      .input("PERMS", mssql.VarChar, auths || "")
      .input("ORDER_NUM", mssql.Int, rank || 0)
      .query(`
        INSERT INTO SYS_MENU 
        (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, PERMS, ORDER_NUM, DEL_FLAG, CREATE_TIME)
        VALUES 
        (@NAME, @KEY_NAME, @URL, @COMPONENT, @ICON, @PARENT_ID, @TYPE, @PERMS, @ORDER_NUM, 0, GETDATE())
      `);

    res.json({ code: 0, message: "Đã tạo menu thành công" });
  } catch (error: any) {
    console.error("Lỗi thêm menu:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 3. CẬP NHẬT MENU (PUT /api/menus/update/:id)
// ============================================================================
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const {
      title, name, path, component, icon, parentId, 
      menuType, auths, rank
    } = req.body;

    // Chặn lỗi tự chọn mình làm menu cha
    if (Number(req.params.id) === Number(parentId)) {
      return res.json({ code: 400, message: "Menu cha không hợp lệ!" });
    }

    const connection = await pool.connect();
    await connection.request()
      .input("id", mssql.Int, req.params.id)
      .input("NAME", mssql.NVarChar, title)
      .input("KEY_NAME", mssql.VarChar, name || "")
      .input("URL", mssql.VarChar, path || "")
      .input("COMPONENT", mssql.VarChar, component || "")
      .input("ICON", mssql.VarChar, icon || "")
      .input("PARENT_ID", mssql.Int, parentId || 0)
      .input("TYPE", mssql.Int, menuType || 0)
      .input("PERMS", mssql.VarChar, auths || "")
      .input("ORDER_NUM", mssql.Int, rank || 0)
      .query(`
        UPDATE SYS_MENU
        SET 
          NAME = @NAME, 
          KEY_NAME = @KEY_NAME, 
          URL = @URL, 
          COMPONENT = @COMPONENT, 
          ICON = @ICON, 
          PARENT_ID = @PARENT_ID,
          TYPE = @TYPE, 
          PERMS = @PERMS, 
          ORDER_NUM = @ORDER_NUM,
          LAST_UPDATE_TIME = GETDATE()
        WHERE ID = @id
      `);

    res.json({ code: 0, message: "Cập nhật menu thành công" });
  } catch (error: any) {
    console.error("Lỗi cập nhật menu:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 4. XÓA MỀM MENU (DELETE /api/menus/:id)
// ============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    
    // Kiểm tra xem menu này có thư mục con không
    const checkChild = await connection.request()
      .input("id", mssql.Int, req.params.id)
      .query(`SELECT ID FROM SYS_MENU WHERE PARENT_ID = @id AND DEL_FLAG = 0`);

    if (checkChild.recordset.length > 0) {
      return res.json({ code: 400, message: "Vui lòng xóa các menu con trước khi xóa thư mục này!" });
    }

    // Xóa mềm (Update DEL_FLAG = 1) thay vì xóa cứng (DELETE FROM)
    await connection.request()
      .input("id", mssql.Int, req.params.id)
      .query(`UPDATE SYS_MENU SET DEL_FLAG = 1 WHERE ID = @id`);

    res.json({ code: 0, message: "Đã xóa menu thành công" });
  } catch (error: any) {
    console.error("Lỗi xóa menu:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});
router.get("/get-async-routes", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    
    // Tạm thời lấy TẤT CẢ menu (Sau này phân quyền thì thêm WHERE RoleID vào đây)
    const result = await connection.request().query(`
        SELECT 
          ID as id,
          PARENT_ID as parentId,
          TYPE as menuType,
          NAME as title,
          KEY_NAME as name,
          URL as path,
          COMPONENT as component,
          ICON as icon,
          ORDER_NUM as rank,
          PERMS as auths
        FROM SYS_MENU
        WHERE DEL_FLAG = 0
        ORDER BY ORDER_NUM ASC
    `);

    const flatMenus = result.recordset;

    // THUẬT TOÁN ĐỆ QUY TẠO CÂY ROUTER CHUẨN VUE-PURE-ADMIN
    const buildRouterTree = (parentId: number) => {
      const tree: any[] = [];
      // Lọc các menu là con của parentId hiện tại và không phải là nút bấm (menuType !== 2)
      const children = flatMenus.filter(m => m.parentId === parentId && m.menuType !== 2);

      for (const item of children) {
        // Lấy danh sách quyền (auths) của các nút bấm nằm trong menu này
        const buttonAuths = flatMenus
          .filter(m => m.parentId === item.id && m.menuType === 2)
          .map(m => m.auths)
          .filter(a => a); // Loại bỏ null/empty

        // Nặn Object theo cấu trúc RouteConfigsTable của Frontend
        const routeObj: any = {
          path: item.path,
          name: item.name || undefined,
          meta: {
            title: item.title,
            icon: item.icon || undefined,
            rank: item.rank || 0,
            showLink: true
          }
        };

        // Nếu có Component thì gán (Thường thư mục cha sẽ không có Component)
        if (item.component) {
          routeObj.component = item.component;
        }

        // Nếu trang này có các nút bấm phân quyền, nhét vào meta.auths
        if (buttonAuths.length > 0) {
          routeObj.meta.auths = buttonAuths;
        }

        // Đệ quy tìm tiếp con của nó
        const subChildren = buildRouterTree(item.id);
        if (subChildren.length > 0) {
          routeObj.children = subChildren;
        }

        tree.push(routeObj);
      }
      return tree;
    };

    // Khởi chạy đệ quy từ gốc (parentId = 0)
    const asyncRoutes = buildRouterTree(0);

    // Trả về đúng cấu trúc { success, data } mà file src/api/routes.ts của Vue cần
    res.json({
      success: true,
      data: asyncRoutes
    });

  } catch (error: any) {
    console.error("Lỗi get-async-routes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
export default router;