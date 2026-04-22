import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// POST /api/logs/login — Nhật ký đăng nhập (phân trang + tìm kiếm)
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, loginStatus, currentPage = 1, pageSize = 10 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (username) conditions.push("USER_NAME LIKE @username");
    if (loginStatus !== undefined && loginStatus !== "")
      conditions.push("LOGIN_STATUS = @loginStatus");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (req: mssql.Request) => {
      if (username) req.input("username", mssql.NVarChar, `%${username}%`);
      if (loginStatus !== undefined && loginStatus !== "")
        req.input("loginStatus", mssql.Int, Number(loginStatus));
      return req;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM SYS_LOGIN_LOG ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        ID             as id,
        USER_NAME      as username,
        IP             as ip,
        LOGIN_LOCATION as loginLocation,
        BROWSER        as browser,
        OS             as os,
        LOGIN_STATUS   as loginStatus,
        CREATE_TIME    as createTime
      FROM SYS_LOGIN_LOG
      ${where}
      ORDER BY CREATE_TIME DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0,
      message: "common.success",
      data: {
        list: dataResult.recordset,
        total: countResult.recordset[0].total,
        pageSize: Number(pageSize),
        currentPage: Number(currentPage)
      }
    });
  } catch (error: any) {
    console.error("Lỗi lấy nhật ký đăng nhập:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/logs/system — Nhật ký hệ thống (phân trang + tìm kiếm + lọc ngày)
router.post("/system", async (req: Request, res: Response) => {
  try {
    const { module, startTime, endTime, currentPage = 1, pageSize = 10 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (module) conditions.push("OPERATION LIKE @module");
    if (startTime) conditions.push("CREATE_TIME >= @startTime");
    if (endTime) conditions.push("CREATE_TIME <= @endTime");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (r: mssql.Request) => {
      if (module) r.input("module", mssql.NVarChar, `%${module}%`);
      if (startTime) r.input("startTime", mssql.DateTime, new Date(startTime));
      if (endTime) r.input("endTime", mssql.DateTime, new Date(endTime));
      return r;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM SYS_LOG ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        ID          as id,
        USER_NAME   as username,
        OPERATION   as operation,
        METHOD      as method,
        PARAMS      as params,
        TIME        as time,
        IP          as ip,
        CREATE_BY   as createBy,
        CREATE_TIME as createTime
      FROM SYS_LOG
      ${where}
      ORDER BY CREATE_TIME DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0,
      message: "common.success",
      data: {
        list: dataResult.recordset,
        total: countResult.recordset[0].total,
        pageSize: Number(pageSize),
        currentPage: Number(currentPage)
      }
    });
  } catch (error: any) {
    console.error("Lỗi lấy nhật ký hệ thống:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// DELETE /api/logs/system/clear-all — Xóa toàn bộ nhật ký hệ thống
router.delete("/system/clear-all", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    await connection.request().query(`DELETE FROM SYS_LOG`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/logs/system/batch-delete — Xóa nhiều bản ghi nhật ký
router.post("/system/batch-delete", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ code: 400, message: "Không có ID nào được cung cấp" });

    const connection = await pool.connect();
    const idList = ids.map((id: any) => Number(id)).join(",");
    await connection.request().query(`DELETE FROM SYS_LOG WHERE ID IN (${idList})`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
