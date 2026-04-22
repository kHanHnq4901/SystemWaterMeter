import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// POST /api/gateways/list — Danh sách Gateway (phân trang + tìm kiếm)
router.post("/list", async (req: Request, res: Response) => {
  try {
    const { keyword, gatewayType, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (keyword) conditions.push("(GATEWAY_NO LIKE @keyword OR GATEWAY_NAME LIKE @keyword)");
    if (gatewayType !== undefined && gatewayType !== "") conditions.push("GATEWAY_TYPE = @gatewayType");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (r: mssql.Request) => {
      if (keyword) r.input("keyword", mssql.NVarChar, `%${keyword}%`);
      if (gatewayType !== undefined && gatewayType !== "") r.input("gatewayType", mssql.Int, Number(gatewayType));
      return r;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM INFO_GATEWAY ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        GATEWAY_NO        as gatewayNo,
        GATEWAY_NAME      as gatewayName,
        GATEWAY_MODEL_ID  as gatewayModelId,
        GATEWAY_TYPE      as gatewayType,
        SIM_CARD_NO       as simCardNo,
        LINE_ID           as lineId,
        ADDRESS           as address,
        NOTE              as note,
        GROUP_ID          as groupId,
        IMEI              as imei,
        VERSION           as version,
        COORDINATE        as coordinate,
        CREATED           as created,
        LASTTIME_CONNECT  as lasttimeConnect,
        LASTTIME_RECORD   as lasttimeRecord
      FROM INFO_GATEWAY
      ${where}
      ORDER BY CREATED DESC
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
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/gateways/add — Thêm mới Gateway
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { gatewayNo, gatewayName, gatewayModelId, gatewayType, simCardNo, lineId, address, note, groupId, imei, version, coordinate } = req.body;
    const connection = await pool.connect();
    await connection.request()
      .input("GATEWAY_NO",       mssql.VarChar,  gatewayNo)
      .input("GATEWAY_NAME",     mssql.NVarChar, gatewayName || "")
      .input("GATEWAY_MODEL_ID", mssql.VarChar,  gatewayModelId || "")
      .input("GATEWAY_TYPE",     mssql.Int,      gatewayType ?? 0)
      .input("SIM_CARD_NO",      mssql.VarChar,  simCardNo || "")
      .input("LINE_ID",          mssql.VarChar,  lineId || "")
      .input("ADDRESS",          mssql.NVarChar, address || "")
      .input("NOTE",             mssql.NVarChar, note || "")
      .input("GROUP_ID",         mssql.Int,      groupId ?? null)
      .input("IMEI",             mssql.VarChar,  imei || "")
      .input("VERSION",          mssql.VarChar,  version || "")
      .input("COORDINATE",       mssql.NVarChar, coordinate || "")
      .query(`
        INSERT INTO INFO_GATEWAY
          (GATEWAY_NO, GATEWAY_NAME, GATEWAY_MODEL_ID, GATEWAY_TYPE, SIM_CARD_NO, LINE_ID, ADDRESS, NOTE, GROUP_ID, IMEI, VERSION, COORDINATE, CREATED)
        VALUES
          (@GATEWAY_NO, @GATEWAY_NAME, @GATEWAY_MODEL_ID, @GATEWAY_TYPE, @SIM_CARD_NO, @LINE_ID, @ADDRESS, @NOTE, @GROUP_ID, @IMEI, @VERSION, @COORDINATE, GETDATE())
      `);
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// PUT /api/gateways/update/:no — Cập nhật Gateway
router.put("/update/:no", async (req: Request, res: Response) => {
  try {
    const { gatewayName, gatewayModelId, gatewayType, simCardNo, lineId, address, note, groupId, imei, version, coordinate } = req.body;
    const connection = await pool.connect();
    await connection.request()
      .input("GATEWAY_NO",       mssql.VarChar,  req.params.no)
      .input("GATEWAY_NAME",     mssql.NVarChar, gatewayName || "")
      .input("GATEWAY_MODEL_ID", mssql.VarChar,  gatewayModelId || "")
      .input("GATEWAY_TYPE",     mssql.Int,      gatewayType ?? 0)
      .input("SIM_CARD_NO",      mssql.VarChar,  simCardNo || "")
      .input("LINE_ID",          mssql.VarChar,  lineId || "")
      .input("ADDRESS",          mssql.NVarChar, address || "")
      .input("NOTE",             mssql.NVarChar, note || "")
      .input("GROUP_ID",         mssql.Int,      groupId ?? null)
      .input("IMEI",             mssql.VarChar,  imei || "")
      .input("VERSION",          mssql.VarChar,  version || "")
      .input("COORDINATE",       mssql.NVarChar, coordinate || "")
      .query(`
        UPDATE INFO_GATEWAY SET
          GATEWAY_NAME=@GATEWAY_NAME, GATEWAY_MODEL_ID=@GATEWAY_MODEL_ID, GATEWAY_TYPE=@GATEWAY_TYPE,
          SIM_CARD_NO=@SIM_CARD_NO, LINE_ID=@LINE_ID, ADDRESS=@ADDRESS, NOTE=@NOTE,
          GROUP_ID=@GROUP_ID, IMEI=@IMEI, VERSION=@VERSION, COORDINATE=@COORDINATE,
          LASTTIME_RECORD=GETDATE()
        WHERE GATEWAY_NO=@GATEWAY_NO
      `);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// DELETE /api/gateways/:no — Xóa Gateway
router.delete("/:no", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    await connection.request()
      .input("GATEWAY_NO", mssql.VarChar, req.params.no)
      .query(`DELETE FROM INFO_GATEWAY WHERE GATEWAY_NO = @GATEWAY_NO`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
