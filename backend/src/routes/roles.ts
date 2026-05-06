import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// ============================================================================
// 1. POST /api/roles/list
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

    const countReq = connection.request();
    params.forEach(p => countReq.input(p.name, p.type, p.value));

    const dataReq = connection.request();
    params.forEach(p => dataReq.input(p.name, p.type, p.value));

    const [countResult, result] = await Promise.all([
      countReq.query(`SELECT COUNT(*) as total FROM SYS_ROLE WITH(NOLOCK) ${whereClause}`),
      dataReq.query(`
        SELECT
          ID as id,
          NAME as name,
          CODE as code,
          REMARKS as remark,
          STATUS as status,
          CREATE_TIME as createTime,
          ISNULL((
            SELECT rm.MENU_ID
            FROM SYS_ROLE_MENU rm WITH(NOLOCK)
            WHERE rm.ROLE_ID = SYS_ROLE.ID
            FOR JSON PATH
          ), '[]') as menus
        FROM SYS_ROLE WITH(NOLOCK)
        ${whereClause}
        ORDER BY CREATE_TIME DESC
        OFFSET ${offset} ROWS FETCH NEXT ${Number(pageSize)} ROWS ONLY
      `)
    ]);

    const roles = result.recordset.map((role: any) => ({
      ...role,
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
// 2. GET /api/roles/list-all
// ============================================================================
router.get("/list-all", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT ID as id, NAME as name
      FROM SYS_ROLE WITH(NOLOCK)
      WHERE DEL_FLAG = 0 AND STATUS = 1
      ORDER BY CREATE_TIME DESC
    `);
    res.json({ code: 0, message: "Thành công", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 3. POST /api/roles — Tạo Role + bulk insert menus
// ============================================================================
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, code, remark, menus } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      const roleResult = await new mssql.Request(transaction)
        .input("NAME",    mssql.NVarChar, name)
        .input("CODE",    mssql.VarChar,  code)
        .input("REMARKS", mssql.NVarChar, remark || "")
        .query(`
          INSERT INTO SYS_ROLE (NAME, CODE, REMARKS, STATUS, DEL_FLAG, CREATE_TIME)
          VALUES (@NAME, @CODE, @REMARKS, 1, 0, GETDATE());
          SELECT SCOPE_IDENTITY() as NEW_ID;
        `);

      const newRoleId = roleResult.recordset[0].NEW_ID;

      if (Array.isArray(menus) && menus.length > 0) {
        const req = new mssql.Request(transaction);
        req.input("ROLE_ID", mssql.Int, newRoleId);
        const rows = menus.map((menuId: number, i: number) => {
          req.input(`menuId${i}`, mssql.Int, menuId);
          return `(@ROLE_ID, @menuId${i})`;
        });
        await req.query(`INSERT INTO SYS_ROLE_MENU (ROLE_ID, MENU_ID) VALUES ${rows.join(", ")}`);
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
// 4. PUT /api/roles/:id — Cập nhật Role + bulk replace menus
// ============================================================================
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, code, remark, status, menus } = req.body;

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      await new mssql.Request(transaction)
        .input("id",      mssql.Int,      req.params.id)
        .input("NAME",    mssql.NVarChar, name)
        .input("CODE",    mssql.VarChar,  code)
        .input("REMARKS", mssql.NVarChar, remark)
        .input("STATUS",  mssql.TinyInt,  status)
        .query(`
          UPDATE SYS_ROLE
          SET NAME=@NAME, CODE=@CODE, REMARKS=@REMARKS, STATUS=@STATUS, LAST_UPDATE_TIME=GETDATE()
          WHERE ID=@id
        `);

      if (Array.isArray(menus)) {
        await new mssql.Request(transaction)
          .input("ROLE_ID", mssql.Int, req.params.id)
          .query(`DELETE FROM SYS_ROLE_MENU WHERE ROLE_ID = @ROLE_ID`);

        if (menus.length > 0) {
          const req = new mssql.Request(transaction);
          req.input("ROLE_ID", mssql.Int, req.params.id);
          const rows = menus.map((menuId: number, i: number) => {
            req.input(`menuId${i}`, mssql.Int, menuId);
            return `(@ROLE_ID, @menuId${i})`;
          });
          await req.query(`INSERT INTO SYS_ROLE_MENU (ROLE_ID, MENU_ID) VALUES ${rows.join(", ")}`);
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
// 5. DELETE /api/roles/:id
// ============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const roleId = req.params.id;
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      await new mssql.Request(transaction)
        .input("id", mssql.Int, roleId)
        .query(`UPDATE SYS_ROLE SET DEL_FLAG = 1 WHERE ID = @id`);

      await new mssql.Request(transaction)
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

// ============================================================================
// 6. POST /api/roles/menu
// ============================================================================
router.post("/menu", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        ID        as id,
        PARENT_ID as parentId,
        NAME      as title,
        ICON      as icon,
        TYPE      as menuType,
        ORDER_NUM as rank
      FROM SYS_MENU WITH(NOLOCK)
      WHERE DEL_FLAG = 0
      ORDER BY ORDER_NUM ASC
    `);
    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 7. POST /api/roles/menu-ids
// ============================================================================
router.post("/menu-ids", async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ code: 0, message: "common.success", data: [] });

    const connection = await pool.connect();
    const result = await connection
      .request()
      .input("roleId", mssql.Int, id)
      .query(`SELECT MENU_ID as menuId FROM SYS_ROLE_MENU WITH(NOLOCK) WHERE ROLE_ID = @roleId`);

    res.json({ code: 0, message: "common.success", data: result.recordset.map((r: any) => r.menuId) });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 8. POST /api/roles/save-menu — bulk replace
// ============================================================================
router.post("/save-menu", async (req: Request, res: Response) => {
  try {
    const { id, menuIds } = req.body;
    if (!id) return res.status(400).json({ code: 400, message: "role.missingId" });

    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();

    try {
      await new mssql.Request(transaction)
        .input("roleId", mssql.Int, id)
        .query(`DELETE FROM SYS_ROLE_MENU WHERE ROLE_ID = @roleId`);

      if (Array.isArray(menuIds) && menuIds.length > 0) {
        const req = new mssql.Request(transaction);
        req.input("ROLE_ID", mssql.Int, id);
        const rows = menuIds.map((menuId: number, i: number) => {
          req.input(`menuId${i}`, mssql.Int, menuId);
          return `(@ROLE_ID, @menuId${i})`;
        });
        await req.query(`INSERT INTO SYS_ROLE_MENU (ROLE_ID, MENU_ID) VALUES ${rows.join(", ")}`);
      }

      await transaction.commit();
      res.json({ code: 0, message: "common.updateSuccess" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 9. POST /api/roles/add
// ============================================================================
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { name, code, remark } = req.body;
    const connection = await pool.connect();
    await connection
      .request()
      .input("NAME",    mssql.NVarChar, name)
      .input("CODE",    mssql.VarChar,  code || "")
      .input("REMARKS", mssql.NVarChar, remark || "")
      .query(`
        INSERT INTO SYS_ROLE (NAME, CODE, REMARKS, STATUS, DEL_FLAG, CREATE_TIME)
        VALUES (@NAME, @CODE, @REMARKS, 1, 0, GETDATE())
      `);
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 10. PUT /api/roles/update/:id
// ============================================================================
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const { name, code, remark, status } = req.body;
    const connection = await pool.connect();
    await connection
      .request()
      .input("id",      mssql.Int,      req.params.id)
      .input("NAME",    mssql.NVarChar, name)
      .input("CODE",    mssql.VarChar,  code || "")
      .input("REMARKS", mssql.NVarChar, remark || "")
      .input("STATUS",  mssql.TinyInt,  status ?? 1)
      .query(`
        UPDATE SYS_ROLE
        SET NAME=@NAME, CODE=@CODE, REMARKS=@REMARKS, STATUS=@STATUS, LAST_UPDATE_TIME=GETDATE()
        WHERE ID=@id
      `);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 11. DELETE /api/roles/delete/:id
// ============================================================================
router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const transaction = new mssql.Transaction(connection);
    await transaction.begin();
    try {
      await new mssql.Request(transaction)
        .input("id", mssql.Int, req.params.id)
        .query(`UPDATE SYS_ROLE SET DEL_FLAG=1 WHERE ID=@id`);
      await new mssql.Request(transaction)
        .input("id", mssql.Int, req.params.id)
        .query(`DELETE FROM SYS_USER_ROLE WHERE ROLE_ID=@id`);
      await transaction.commit();
      res.json({ code: 0, message: "common.deleteSuccess" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
