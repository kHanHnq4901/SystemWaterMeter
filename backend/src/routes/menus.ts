import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import { getUserIdFromToken } from "../middleware/zoneAuth.js";

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
      message: "common.success",
      data: result.recordset
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

    res.json({ code: 0, message: "common.createSuccess" });
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
      return res.json({ code: 400, message: "menu.invalidParent" });
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

    res.json({ code: 0, message: "common.updateSuccess" });
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
      return res.json({ code: 400, message: "menu.hasChildren" });
    }

    // Xóa mềm (Update DEL_FLAG = 1) thay vì xóa cứng (DELETE FROM)
    await connection.request()
      .input("id", mssql.Int, req.params.id)
      .query(`UPDATE SYS_MENU SET DEL_FLAG = 1 WHERE ID = @id`);

    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    console.error("Lỗi xóa menu:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});
// GET /api/menus/get-async-routes — Trả về cây menu từ SYS_MENU cho router động
// - Admin: thấy tất cả menu
// - Non-admin: chỉ thấy menu có trong SYS_ROLE_MENU theo role của user
//   (folder TYPE=0 luôn được giữ; frontend filterTree tự loại folder rỗng)
router.get("/get-async-routes", async (req: Request, res: Response) => {
  try {
    const conn = await pool.connect();

    // Lấy userId từ token → query role IDs và kiểm tra admin
    let isAdmin = false;
    let userRoleIds: number[] = [];
    const userId = getUserIdFromToken(req);

    if (userId) {
      try {
        const roleRes = await conn.request()
          .input("userId", mssql.Int, userId)
          .query(`
            SELECT r.ID as roleId, r.CODE
            FROM SYS_ROLE r WITH(NOLOCK)
            JOIN SYS_USER_ROLE ur WITH(NOLOCK) ON r.ID = ur.ROLE_ID
            WHERE ur.USER_ID = @userId AND r.STATUS = 1
          `);
        isAdmin      = roleRes.recordset.some((r: any) => r.CODE === "admin");
        userRoleIds  = roleRes.recordset.map((r: any) => Number(r.roleId));
      } catch {
        // Không đọc được role → coi như không có quyền đặc biệt
      }
    }

    // Kiểm tra SYS_ROLE_MENU có dữ liệu chưa (fallback nếu chưa chạy migration)
    let roleMenuConfigured = false;
    try {
      const cntRes = await conn.request().query("SELECT COUNT(*) as cnt FROM SYS_ROLE_MENU WITH(NOLOCK)");
      roleMenuConfigured = Number(cntRes.recordset[0].cnt) > 0;
    } catch { /* bảng không tồn tại hoặc lỗi → coi như chưa cấu hình */ }

    // Lấy danh sách MENU_ID được phép (bỏ qua nếu admin hoặc chưa cấu hình)
    let allowedPageIds: Set<number> | null = null; // null = không hạn chế

    if (!isAdmin && roleMenuConfigured) {
      if (userRoleIds.length > 0) {
        try {
          const rmReq = conn.request();
          userRoleIds.forEach((id, i) => rmReq.input(`r${i}`, mssql.Int, id));
          const inClause = userRoleIds.map((_, i) => `@r${i}`).join(", ");
          const rmRes = await rmReq.query(`
            SELECT DISTINCT MENU_ID FROM SYS_ROLE_MENU WITH(NOLOCK)
            WHERE ROLE_ID IN (${inClause})
          `);
          allowedPageIds = new Set(rmRes.recordset.map((r: any) => Number(r.MENU_ID)));
        } catch {
          allowedPageIds = null; // lỗi → không lọc, cho xem hết
        }
      }
      // userRoleIds rỗng → allowedPageIds = null (không lọc, chờ admin gán role)
    }

    // Lấy toàn bộ menu từ DB
    const result = await conn.request().query(`
      SELECT
        ID        as id,
        PARENT_ID as parentId,
        TYPE      as menuType,
        NAME      as title,
        KEY_NAME  as name,
        URL       as path,
        COMPONENT as component,
        ICON      as icon,
        ORDER_NUM as rank,
        PERMS     as auths
      FROM SYS_MENU
      WHERE DEL_FLAG = 0
      ORDER BY PARENT_ID ASC, ORDER_NUM ASC
    `);

    const rows = result.recordset;

    // Build node map
    // - Folder (TYPE=0): luôn thêm vào map; frontend sẽ loại folder rỗng
    // - Page  (TYPE=1): chỉ thêm nếu ID nằm trong allowedPageIds (hoặc admin)
    const nodeMap = new Map<number, any>();
    rows.forEach((r: any) => {
      const isFolder = Number(r.menuType) === 0;
      if (!isFolder && allowedPageIds !== null && !allowedPageIds.has(Number(r.id))) return;
      const path = r.path || (isFolder ? `/_dir_${r.id}` : "");
      if (!path) return;
      nodeMap.set(Number(r.id), {
        path,
        name:      r.name || undefined,
        component: isFolder ? "Layout" : (r.component || ""),
        meta: {
          title:    r.title,
          icon:     r.icon || undefined,
          rank:     Number(r.rank),
          showLink: true,
          ...(r.auths ? { auths: String(r.auths).split(",") } : {})
        }
      });
    });

    // Build tree
    const tree: any[] = [];
    rows.forEach((r: any) => {
      const node = nodeMap.get(Number(r.id));
      if (!node) return;
      const parentId = Number(r.parentId);
      if (parentId === 0) {
        tree.push(node);
      } else {
        const parent = nodeMap.get(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
    });

    // Sort by rank recursively
    function sortByRank(arr: any[]) {
      arr.sort((a, b) => (a.meta?.rank ?? 0) - (b.meta?.rank ?? 0));
      arr.forEach(n => n.children && sortByRank(n.children));
    }
    sortByRank(tree);

    res.json({ code: 0, message: "common.success", data: tree });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});
export default router;