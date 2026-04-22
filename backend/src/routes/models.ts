import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// ============================================================
// METER MODEL — BASIC_METER_MODEL
// ============================================================

router.post("/meter/list", async (req: Request, res: Response) => {
  try {
    const { keyword, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (keyword) conditions.push("(METER_MODEL_ID LIKE @keyword OR METER_MODEL_DESC LIKE @keyword)");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (r: mssql.Request) => {
      if (keyword) r.input("keyword", mssql.NVarChar, `%${keyword}%`);
      return r;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM BASIC_METER_MODEL ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        METER_MODEL_ID   as meterModelId,
        METER_MODEL_DESC as meterModelDesc,
        CONSTANT         as constant,
        CLASS            as class
      FROM BASIC_METER_MODEL
      ${where}
      ORDER BY METER_MODEL_ID ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0, message: "common.success",
      data: { list: dataResult.recordset, total: countResult.recordset[0].total, pageSize: Number(pageSize), currentPage: Number(currentPage) }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.post("/meter/add", async (req: Request, res: Response) => {
  try {
    const { meterModelId, meterModelDesc, constant, cls } = req.body;
    await (await pool.connect()).request()
      .input("METER_MODEL_ID",   mssql.VarChar,  meterModelId)
      .input("METER_MODEL_DESC", mssql.NVarChar, meterModelDesc || "")
      .input("CONSTANT",         mssql.Float,    constant ?? null)
      .input("CLASS",            mssql.VarChar,  cls || "")
      .query(`INSERT INTO BASIC_METER_MODEL (METER_MODEL_ID, METER_MODEL_DESC, CONSTANT, CLASS) VALUES (@METER_MODEL_ID, @METER_MODEL_DESC, @CONSTANT, @CLASS)`);
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.put("/meter/update/:id", async (req: Request, res: Response) => {
  try {
    const { meterModelDesc, constant, cls } = req.body;
    await (await pool.connect()).request()
      .input("METER_MODEL_ID",   mssql.VarChar,  req.params.id)
      .input("METER_MODEL_DESC", mssql.NVarChar, meterModelDesc || "")
      .input("CONSTANT",         mssql.Float,    constant ?? null)
      .input("CLASS",            mssql.VarChar,  cls || "")
      .query(`UPDATE BASIC_METER_MODEL SET METER_MODEL_DESC=@METER_MODEL_DESC, CONSTANT=@CONSTANT, CLASS=@CLASS WHERE METER_MODEL_ID=@METER_MODEL_ID`);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.delete("/meter/:id", async (req: Request, res: Response) => {
  try {
    await (await pool.connect()).request()
      .input("METER_MODEL_ID", mssql.VarChar, req.params.id)
      .query(`DELETE FROM BASIC_METER_MODEL WHERE METER_MODEL_ID=@METER_MODEL_ID`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================
// GATEWAY MODEL — BASIC_GATEWAY_MODEL
// ============================================================

router.post("/gateway/list", async (req: Request, res: Response) => {
  try {
    const { keyword, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (keyword) conditions.push("(GATEWAY_MODEL_ID LIKE @keyword OR GATEWAY_MODEL_DESC LIKE @keyword OR GATEWAY_MODEL_DESC_VN LIKE @keyword)");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (r: mssql.Request) => {
      if (keyword) r.input("keyword", mssql.NVarChar, `%${keyword}%`);
      return r;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM BASIC_GATEWAY_MODEL ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        GATEWAY_MODEL_ID      as gatewayModelId,
        GATEWAY_MODEL_DESC    as gatewayModelDesc,
        GATEWAY_MODEL_DESC_VN as gatewayModelDescVn
      FROM BASIC_GATEWAY_MODEL
      ${where}
      ORDER BY GATEWAY_MODEL_ID ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0, message: "common.success",
      data: { list: dataResult.recordset, total: countResult.recordset[0].total, pageSize: Number(pageSize), currentPage: Number(currentPage) }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.post("/gateway/add", async (req: Request, res: Response) => {
  try {
    const { gatewayModelId, gatewayModelDesc, gatewayModelDescVn } = req.body;
    await (await pool.connect()).request()
      .input("GATEWAY_MODEL_ID",      mssql.VarChar,  gatewayModelId)
      .input("GATEWAY_MODEL_DESC",    mssql.NVarChar, gatewayModelDesc || "")
      .input("GATEWAY_MODEL_DESC_VN", mssql.NVarChar, gatewayModelDescVn || "")
      .query(`INSERT INTO BASIC_GATEWAY_MODEL (GATEWAY_MODEL_ID, GATEWAY_MODEL_DESC, GATEWAY_MODEL_DESC_VN) VALUES (@GATEWAY_MODEL_ID, @GATEWAY_MODEL_DESC, @GATEWAY_MODEL_DESC_VN)`);
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.put("/gateway/update/:id", async (req: Request, res: Response) => {
  try {
    const { gatewayModelDesc, gatewayModelDescVn } = req.body;
    await (await pool.connect()).request()
      .input("GATEWAY_MODEL_ID",      mssql.VarChar,  req.params.id)
      .input("GATEWAY_MODEL_DESC",    mssql.NVarChar, gatewayModelDesc || "")
      .input("GATEWAY_MODEL_DESC_VN", mssql.NVarChar, gatewayModelDescVn || "")
      .query(`UPDATE BASIC_GATEWAY_MODEL SET GATEWAY_MODEL_DESC=@GATEWAY_MODEL_DESC, GATEWAY_MODEL_DESC_VN=@GATEWAY_MODEL_DESC_VN WHERE GATEWAY_MODEL_ID=@GATEWAY_MODEL_ID`);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

router.delete("/gateway/:id", async (req: Request, res: Response) => {
  try {
    await (await pool.connect()).request()
      .input("GATEWAY_MODEL_ID", mssql.VarChar, req.params.id)
      .query(`DELETE FROM BASIC_GATEWAY_MODEL WHERE GATEWAY_MODEL_ID=@GATEWAY_MODEL_ID`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
