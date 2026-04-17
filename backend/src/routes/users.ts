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
      deptId // Nếu sau này bạn truyền roleId từ cây sang thì đổi tên ở đây
    } = req.body;

    const offset = (Number(currentPage) - 1) * Number(pageSize);
    let whereClause = "WHERE DEL_FLAG = 0";
    const params: { name: string; value: any; type: any }[] = [];

    // Filter theo Tên đăng nhập hoặc Nickname
    if (username) {
      params.push({ name: "username", value: `%${username}%`, type: mssql.NVarChar });
      whereClause += " AND (NAME LIKE @username OR NICK_NAME LIKE @username)";
    }

    // Filter theo Số điện thoại
    if (phone) {
      params.push({ name: "phone", value: `%${phone}%`, type: mssql.VarChar });
      whereClause += " AND MOBILE LIKE @phone";
    }

    // Filter theo Trạng thái (0: Khóa, 1: Hoạt động)
    if (status !== undefined && status !== "") {
      params.push({ name: "status", value: Number(status), type: mssql.TinyInt });
      whereClause += " AND STATUS = @status";
    }

    const connection = await pool.connect();

    // Đếm tổng số bản ghi (Dành cho phân trang)
    const countRequest = connection.request();
    params.forEach(p => countRequest.input(p.name, p.type, p.value));
    const countResult = await countRequest.query(`SELECT COUNT(*) as total FROM SYS_USER ${whereClause}`);

    // Lấy dữ liệu chi tiết
    const dataRequest = connection.request();
    params.forEach(p => dataRequest.input(p.name, p.type, p.value));

    // Dùng ALIAS (AS) để biến tên cột IN HOA trong SQL thành chữ thường cho Vue-Pure-Admin
    const result = await dataRequest.query(`
      SELECT 
        ID as id, 
        NAME as username, 
        NICK_NAME as nickname, 
        AVATAR as avatar, 
        EMAIL as email, 
        MOBILE as phone, 
        STATUS as status, 
        CREATE_TIME as createTime
        -- Thêm các trường khác nếu cần (ví dụ: POS_ID, REGION_ID)
      FROM SYS_USER
      ${whereClause}
      ORDER BY CREATE_TIME DESC
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

    // 4. Thêm vào Database
    await connection.request()
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
        VALUES (@NAME, @NICK_NAME, @PASSWORD, @SALT, @MOBILE, @EMAIL, @STATUS, @REMARKS, 0, GETDATE())
      `);

    res.json({ code: 0, message: "Thêm người dùng thành công" });
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
export default router;