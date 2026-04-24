import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import crypto from "crypto";

const router = express.Router();

// Định nghĩa Interface (Tùy chọn nhưng tốt cho TypeScript)
interface IUser {
  ID: number;
  NAME: string;
  NICK_NAME?: string;
  AVATAR?: string;
  EMAIL?: string;
  MOBILE?: string;
  STATUS: number;
  REGION_ID?: number;
  COM_ID?: string;
  CREATE_TIME: Date;
}

// ============================================================================
// 1. LẤY DANH SÁCH NGƯỜI DÙNG (POST /api/users/list)
// Dùng POST để Frontend truyền form tìm kiếm vào req.body
// ============================================================================
router.post("/list", async (req: Request, res: Response) => {
  try {
    const {
      currentPage = 1,
      pageSize = 10,
      username,
      phone,
      status,
      roleId
    } = req.body;

    const offset = (Number(currentPage) - 1) * Number(pageSize);
    let whereClause = "WHERE u.DEL_FLAG = 0";
    const params: { name: string; value: any; type: any }[] = [];

    if (username) {
      params.push({ name: "username", value: `%${username}%`, type: mssql.NVarChar });
      whereClause += " AND (u.NAME LIKE @username OR u.NICK_NAME LIKE @username)";
    }
    if (phone) {
      params.push({ name: "phone", value: `%${phone}%`, type: mssql.VarChar });
      whereClause += " AND u.MOBILE LIKE @phone";
    }
    if (status !== undefined && status !== "") {
      params.push({ name: "status", value: Number(status), type: mssql.TinyInt });
      whereClause += " AND u.STATUS = @status";
    }
    if (roleId) {
      params.push({ name: "roleId", value: Number(roleId), type: mssql.Int });
      whereClause += " AND EXISTS (SELECT 1 FROM SYS_USER_ROLE ur WHERE ur.USER_ID = u.ID AND ur.ROLE_ID = @roleId)";
    }

    const connection = await pool.connect();

    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.type, p.value));
    const countResult = await countRequest.query(`SELECT COUNT(*) as total FROM SYS_USER u ${whereClause}`);

    const dataRequest = connection.request();
    params.forEach(p => dataRequest.input(p.name, p.type, p.value));

    const result = await dataRequest.query(`
      SELECT
        u.ID as id,
        u.NAME as username,
        u.NICK_NAME as nickname,
        u.AVATAR as avatar,
        u.EMAIL as email,
        u.MOBILE as phone,
        u.STATUS as status,
        u.CREATE_TIME as createTime
      FROM SYS_USER u
      ${whereClause}
      ORDER BY u.CREATE_TIME DESC
      OFFSET ${offset} ROWS FETCH NEXT ${Number(pageSize)} ROWS ONLY
    `);

    // Trả về chuẩn cấu trúc ResultTable của Vue-Pure-Admin
    res.json({
      code: 0,
      message: "Thành công",
      data: {
        list: result.recordset,
        total: countResult.recordset[0].total,
        pageSize: Number(pageSize),
        currentPage: Number(currentPage)
      }
    });
  } catch (error: any) {
    console.error("Lỗi API get user list:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 2a. CÂY ROLE - USER (GET /api/users/role-user-tree)
// Trả về danh sách role, mỗi role có children là danh sách user thuộc role đó
// PHẢI đặt trước GET /:id để Express không nhầm "role-user-tree" với :id
// ============================================================================
router.get("/role-user-tree", async (_req: Request, res: Response) => {
  try {
    const conn = await pool.connect();

    const rolesResult = await conn.request().query(`
      SELECT ID as id, NAME as name
      FROM SYS_ROLE WHERE DEL_FLAG = 0 AND STATUS = 1
      ORDER BY CREATE_TIME DESC
    `);

    const usersResult = await conn.request().query(`
      SELECT ur.ROLE_ID as roleId, u.ID as userId,
             u.NAME as displayName
      FROM SYS_USER_ROLE ur
      JOIN SYS_USER u ON u.ID = ur.USER_ID AND u.DEL_FLAG = 0
    `);

    const tree = rolesResult.recordset.map((role: any) => ({
      id: role.id,
      name: role.name,
      type: "role",
      children: usersResult.recordset
        .filter((ur: any) => ur.roleId === role.id)
        .map((ur: any) => ({
          id: `u${ur.userId}`,
          userId: ur.userId,
          name: ur.displayName,
          type: "user"
        }))
    }));

    res.json({ code: 0, data: tree });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ============================================================================
// 2. LẤY CHI TIẾT 1 NGƯỜI DÙNG (GET /api/users/:id)
// ============================================================================
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("id", mssql.BigInt, req.params.id)
      .query(`
        SELECT 
          ID as id, NAME as username, NICK_NAME as nickname, 
          AVATAR as avatar, EMAIL as email, MOBILE as phone, STATUS as status
        FROM SYS_USER 
        WHERE ID = @id AND DEL_FLAG = 0
      `);

    if (result.recordset.length === 0) {
      return res.json({ code: 404, message: "Người dùng không tồn tại" });
    }

    res.json({ code: 0, success: true, data: result.recordset[0] });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 3. XÓA MỀM NGƯỜI DÙNG (DELETE /api/users/:id)
// ============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    await connection
      .request()
      .input("id", mssql.BigInt, req.params.id)
      .query(`UPDATE SYS_USER SET DEL_FLAG = 1 WHERE ID = @id`);

    res.json({ code: 0, message: "Xóa người dùng thành công" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 4. XÓA NHIỀU NGƯỜI DÙNG (POST /api/users/batch-delete)
// Phục vụ cho tính năng "Xóa hàng loạt" (onbatchDel) của Vue-Pure-Admin
// ============================================================================
router.post("/batch-delete", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body; // ids là mảng các ID truyền lên từ Frontend
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ code: 400, message: "Danh sách ID không hợp lệ" });
    }

    const connection = await pool.connect();
    
    // Vì mssql library không hỗ trợ truyền array trực tiếp vào câu IN (@ids), 
    // ta cần tạo danh sách parameter động.
    const request = connection.request();
    const idParams = ids.map((id, index) => {
      request.input(`id${index}`, mssql.BigInt, id);
      return `@id${index}`;
    });

    await request.query(`
      UPDATE SYS_USER 
      SET DEL_FLAG = 1 
      WHERE ID IN (${idParams.join(", ")})
    `);

    res.json({ code: 0, message: `Đã xóa thành công ${ids.length} người dùng` });
  } catch (error: any) {
    console.error("Lỗi xóa hàng loạt:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});
// ============================================================================
// 5. THÊM NGƯỜI DÙNG MỚI (POST /api/users/add)
// ============================================================================
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { username, nickname, password, phone, email, status, remark } = req.body;

    // 1. Kiểm tra dữ liệu bắt buộc
    if (!username || !password) {
      return res.json({ code: 400, message: "Tên đăng nhập và mật khẩu là bắt buộc!" });
    }

    const connection = await pool.connect();

    // 2. Kiểm tra xem tên đăng nhập đã tồn tại chưa
    const checkUser = await connection.request()
      .input("username", mssql.NVarChar, username)
      .query(`SELECT ID FROM SYS_USER WHERE NAME = @username AND DEL_FLAG = 0`);
    
    if (checkUser.recordset.length > 0) {
      return res.json({ code: 400, message: "Tên đăng nhập này đã tồn tại trong hệ thống!" });
    }

    // 3. Mã hóa MD5 cho mật khẩu
    // Dùng chuỗi rỗng cho SALT để đồng bộ với logic đăng nhập cũ bạn đang có
    const salt = ""; 
    const hashedPassword = crypto.createHash("md5").update(password + salt).digest("hex");

    // 4. Thêm vào Database, lấy ID vừa tạo
    const insertResult = await connection.request()
      .input("NAME", mssql.NVarChar, username)
      .input("NICK_NAME", mssql.NVarChar, nickname || "")
      .input("PASSWORD", mssql.VarChar, hashedPassword)
      .input("SALT", mssql.VarChar, salt)
      .input("MOBILE", mssql.VarChar, phone || "")
      .input("EMAIL", mssql.VarChar, email || "")
      .input("STATUS", mssql.TinyInt, status !== undefined ? status : 1)
      .input("REMARKS", mssql.NVarChar, remark || "")
      .query(`
        INSERT INTO SYS_USER (NAME, NICK_NAME, PASSWORD, SALT, MOBILE, EMAIL, STATUS, REMARKS, DEL_FLAG, CREATE_TIME)
        OUTPUT INSERTED.ID
        VALUES (@NAME, @NICK_NAME, @PASSWORD, @SALT, @MOBILE, @EMAIL, @STATUS, @REMARKS, 0, GETDATE())
      `);

    const newUserId = insertResult.recordset[0]?.ID;
    res.json({ code: 0, message: "Thêm người dùng thành công", data: { id: newUserId } });
  } catch (error: any) {
    console.error("Lỗi thêm người dùng:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 6. CẬP NHẬT NGƯỜI DÙNG (PUT /api/users/update/:id)
// ============================================================================
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { username, nickname, phone, email, status, remark } = req.body;

    const connection = await pool.connect();

    // 1. Kiểm tra xem tên đăng nhập mới có bị trùng với người khác không
    const checkUser = await connection.request()
      .input("id", mssql.BigInt, id)
      .input("username", mssql.NVarChar, username)
      .query(`SELECT ID FROM SYS_USER WHERE NAME = @username AND ID != @id AND DEL_FLAG = 0`);
    
    if (checkUser.recordset.length > 0) {
      return res.json({ code: 400, message: "Tên đăng nhập này đã được sử dụng bởi tài khoản khác!" });
    }

    // 2. Cập nhật dữ liệu (Lưu ý: Không cập nhật mật khẩu ở API này, mật khẩu thường có API Reset riêng)
    await connection.request()
      .input("id", mssql.BigInt, id)
      .input("NAME", mssql.NVarChar, username)
      .input("NICK_NAME", mssql.NVarChar, nickname || "")
      .input("MOBILE", mssql.VarChar, phone || "")
      .input("EMAIL", mssql.VarChar, email || "")
      .input("STATUS", mssql.TinyInt, status)
      .input("REMARKS", mssql.NVarChar, remark || "")
      .query(`
        UPDATE SYS_USER 
        SET 
          NAME = @NAME, 
          NICK_NAME = @NICK_NAME, 
          MOBILE = @MOBILE, 
          EMAIL = @EMAIL, 
          STATUS = @STATUS, 
          REMARKS = @REMARKS, 
          LAST_UPDATE_TIME = GETDATE()
        WHERE ID = @id
      `);

    res.json({ code: 0, message: "Cập nhật người dùng thành công" });
  } catch (error: any) {
    console.error("Lỗi cập nhật người dùng:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});
// ============================================================================
// 7. LẤY ROLE IDs CỦA USER (POST /api/users/role-ids)
// ============================================================================
router.post("/role-ids", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const conn = await pool.connect();
    const result = await conn.request()
      .input("userId", mssql.Int, userId)
      .query("SELECT ROLE_ID as roleId FROM SYS_USER_ROLE WHERE USER_ID = @userId");
    res.json({ code: 0, data: result.recordset.map((r: any) => r.roleId) });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ============================================================================
// 8. LƯU ROLES CHO USER (PUT /api/users/:id/roles)
// ============================================================================
router.put("/:id/roles", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { roleIds } = req.body as { roleIds: number[] };
    const conn = await pool.connect();

    await conn.request()
      .input("id", mssql.Int, id)
      .query("DELETE FROM SYS_USER_ROLE WHERE USER_ID = @id");

    if (Array.isArray(roleIds) && roleIds.length > 0) {
      for (const roleId of roleIds) {
        await conn.request()
          .input("userId", mssql.Int, id)
          .input("roleId", mssql.Int, Number(roleId))
          .query("INSERT INTO SYS_USER_ROLE (USER_ID, ROLE_ID) VALUES (@userId, @roleId)");
      }
    }

    res.json({ code: 0, message: "Cập nhật vai trò thành công" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ============================================================================
// 9. LẤY DANH SÁCH ZONE CỦA USER (GET /api/users/:id/zones)
// ============================================================================
router.get("/:id/zones", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const conn = await pool.connect();
    const result = await conn.request()
      .input("id", mssql.Int, id)
      .query("SELECT ZONE_ID as zoneId FROM SYS_USER_ZONE WHERE USER_ID = @id");
    res.json({ code: 0, data: result.recordset.map((r: any) => r.zoneId) });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ============================================================================
// 10. CẬP NHẬT ZONE CHO USER (PUT /api/users/:id/zones)
// ============================================================================
router.put("/:id/zones", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { zoneIds } = req.body as { zoneIds: number[] };
    const conn = await pool.connect();

    await conn.request()
      .input("id", mssql.Int, id)
      .query("DELETE FROM SYS_USER_ZONE WHERE USER_ID = @id");

    if (Array.isArray(zoneIds) && zoneIds.length > 0) {
      for (const zoneId of zoneIds) {
        await conn.request()
          .input("userId", mssql.Int, id)
          .input("zoneId", mssql.Int, Number(zoneId))
          .query(`
            INSERT INTO SYS_USER_ZONE (USER_ID, ZONE_ID, CREATE_TIME)
            VALUES (@userId, @zoneId, GETDATE())
          `);
      }
    }

    res.json({ code: 0, message: "Cập nhật vùng thành công" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

export default router;