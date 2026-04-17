import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// ============================================================================
// 1. POST /api/roles/list - Lấy danh sách Role có PHÂN TRANG & TÌM KIẾM (Cho bảng quản lý Role)
// ============================================================================
router.post("/list", async (req: Request, res: Response) => {
  try {
    const { currentPage = 1, pageSize = 10, name, code, status } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    
    let whereClause = "WHERE DEL_FLAG = 0";
    const params: { name: string; value: any; type: any }[] = [];

    if (name) {
      params.push({ name: "name", value: `%${name}%`, type: mssql.NVarChar });
      whereClause += " AND NAME LIKE @name";
    }
    if (code) {
      params.push({ name: "code", value: `%${code}%`, type: mssql.VarChar });
      whereClause += " AND CODE LIKE @code";
    }
    if (status !== undefined && status !== "") {
      params.push({ name: "status", value: Number(status), type: mssql.TinyInt });
      whereClause += " AND STATUS = @status";
    }

    const connection = await pool.connect();

    // Đếm tổng số
    const countReq = connection.request();
    params.forEach(p => countReq.input(p.name, p.type, p.value));
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM SYS_ROLE ${whereClause}`);

    // Lấy dữ liệu
    const dataReq = connection.request();
    params.forEach(p => dataReq.input(p.name, p.type, p.value));
    
    // ISNULL(..., '[]') giúp tránh lỗi parse JSON khi Role chưa có Menu nào
    const result = await dataReq.query(`
      SELECT 
        ID as id,
        NAME as name,
        CODE as code,
        REMARKS as remark,
        STATUS as status,
        CREATE_TIME as createTime,
        ISNULL((
          SELECT rm.MENU_ID 
          FROM SYS_ROLE_MENU rm 
          WHERE rm.ROLE_ID = SYS_ROLE.ID 
          FOR JSON PATH
        ), '[]') as menus
      FROM SYS_ROLE
      ${whereClause}
      ORDER BY CREATE_TIME DESC
      OFFSET ${offset} ROWS FETCH NEXT ${Number(pageSize)} ROWS ONLY
    `);

    const roles = result.recordset.map(role => ({
      ...role,
      // Parse JSON mảng object [{MENU_ID: 1}] thành mảng số [1]
      menus: JSON.parse(role.menus).map((m: any) => m.MENU_ID)
    }));

    res.json({
      code: 0,
      message: "Thành công",
      data: {
        list: roles,
        total: countResult.recordset[0].total,
        pageSize: Number(pageSize),
        currentPage: Number(currentPage)
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 2. GET /api/roles/list-all - Lấy TẤT CẢ Role không phân trang (Cho cái Cây bên trang User)
// ============================================================================
router.get("/list-all", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT ID as id, NAME as name 
      FROM SYS_ROLE 
      WHERE DEL_FLAG = 0 AND STATUS = 1
      ORDER BY CREATE_TIME DESC
    `);
    
    res.json({ code: 0, message: "Thành công", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 3. POST /api/roles - Tạo Role mới và cấp Menus
// ============================================================================
router.post("/", async (req: Request, res: Response) => {
  try {
    // Template Frontend thường gửi các key viết thường (name, code, remark...)
    const { name, code, remark, menus } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Tạo Role
      const roleResult = await request
        .input("NAME", mssql.NVarChar, name)
        .input("CODE", mssql.VarChar, code)
        .input("REMARKS", mssql.NVarChar, remark || "")
        .query(`
          INSERT INTO SYS_ROLE (NAME, CODE, REMARKS, STATUS, DEL_FLAG, CREATE_TIME)
          VALUES (@NAME, @CODE, @REMARKS, 1, 0, GETDATE());
          SELECT SCOPE_IDENTITY() as NEW_ID;
        `);

      const newRoleId = roleResult.recordset[0].NEW_ID;

      // 2. Thêm Menus cho Role
      if (menus && Array.isArray(menus) && menus.length > 0) {
        for (const menuId of menus) {
          const menuReq = new mssql.Request(transaction);
          await menuReq
            .input("ROLE_ID", mssql.Int, newRoleId)
            .input("MENU_ID", mssql.Int, menuId)
            .query(`INSERT INTO SYS_ROLE_MENU (ROLE_ID, MENU_ID) VALUES (@ROLE_ID, @MENU_ID)`);
        }
      }

      await transaction.commit();
      res.json({ code: 0, message: "Thêm vai trò thành công" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 4. PUT /api/roles/:id - Cập nhật Role và Menus
// ============================================================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, code, remark, status, menus } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Cập nhật bảng Role
      await request
        .input("id", mssql.Int, req.params.id)
        .input("NAME", mssql.NVarChar, name)
        .input("CODE", mssql.VarChar, code)
        .input("REMARKS", mssql.NVarChar, remark)
        .input("STATUS", mssql.TinyInt, status)
        .query(`
          UPDATE SYS_ROLE
          SET NAME = @NAME, CODE = @CODE, REMARKS = @REMARKS, STATUS = @STATUS, LAST_UPDATE_TIME = GETDATE()
          WHERE ID = @id
        `);

      // 2. Cập nhật Menus (Xóa cũ, Thêm mới)
      if (menus && Array.isArray(menus)) {
        const deleteMenuReq = new mssql.Request(transaction);
        await deleteMenuReq
          .input("ROLE_ID", mssql.Int, req.params.id)
          .query(`DELETE FROM SYS_ROLE_MENU WHERE ROLE_ID = @ROLE_ID`);

        for (const menuId of menus) {
          const insertMenuReq = new mssql.Request(transaction);
          await insertMenuReq
            .input("ROLE_ID", mssql.Int, req.params.id)
            .input("MENU_ID", mssql.Int, menuId)
            .query(`INSERT INTO SYS_ROLE_MENU (ROLE_ID, MENU_ID) VALUES (@ROLE_ID, @MENU_ID)`);
        }
      }

      await transaction.commit();
      res.json({ code: 0, message: "Cập nhật vai trò thành công" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 5. DELETE /api/roles/:id - XÓA MỀM Role
// ============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      // 1. Cập nhật cờ DEL_FLAG = 1 thay vì xóa cứng
      await request
        .input("id", mssql.Int, roleId)
        .query(`UPDATE SYS_ROLE SET DEL_FLAG = 1 WHERE ID = @id`);

      // 2. Dọn dẹp rác ở bảng SYS_USER_ROLE (Tước quyền này khỏi các user đang giữ)
      // Lưu ý: Tùy nghiệp vụ bạn có muốn xóa user_role không, thường xóa Role thì nên xóa User_Role
      const cleanUserRoleReq = new mssql.Request(transaction);
      await cleanUserRoleReq
        .input("id", mssql.Int, roleId)
        .query(`DELETE FROM SYS_USER_ROLE WHERE ROLE_ID = @id`);

      await transaction.commit();
      res.json({ code: 0, message: "Xóa vai trò thành công" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;