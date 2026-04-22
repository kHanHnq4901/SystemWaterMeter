import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// POST /api/water-meters/list — Danh sách đồng hồ (phân trang + tìm kiếm)
router.post("/list", async (req: Request, res: Response) => {
  try {
    const { keyword, state, meterType, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conditions: string[] = [];
    if (keyword) conditions.push("(METER_NO LIKE @keyword OR METER_NAME LIKE @keyword OR CUSTOMER_CODE LIKE @keyword)");
    if (state !== undefined && state !== "") conditions.push("STATE = @state");
    if (meterType !== undefined && meterType !== "") conditions.push("METER_TYPE = @meterType");
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const addParams = (r: mssql.Request) => {
      if (keyword) r.input("keyword", mssql.NVarChar, `%${keyword}%`);
      if (state !== undefined && state !== "") r.input("state", mssql.Int, Number(state));
      if (meterType !== undefined && meterType !== "") r.input("meterType", mssql.Int, Number(meterType));
      return r;
    };

    const countResult = await addParams(connection.request()).query(
      `SELECT COUNT(*) as total FROM INFO_METER ${where}`
    );

    const dataReq = addParams(connection.request());
    dataReq.input("offset", mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        METER_NO        as meterNo,
        METER_NAME      as meterName,
        METER_MODEL_ID  as meterModelId,
        METER_TYPE      as meterType,
        CUSTOMER_CODE   as customerCode,
        PHONE           as phone,
        ADDRESS         as address,
        PIPE_SIZE       as pipeSize,
        STATE           as state,
        SIM_CARD_NO     as simCardNo,
        IMEI            as imei,
        MODULE_NO       as moduleNo,
        LINE_ID         as lineId,
        GROUP_ID        as groupId,
        LOCK            as lock,
        NOTE            as note,
        LASTTIME_DATA   as lasttimeData,
        PRODUCTION_DATE as productionDate,
        DELIVERY_DATE   as deliveryDate,
        WARRANTY        as warranty,
        CREATED         as created
      FROM INFO_METER
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

// POST /api/water-meters/add — Thêm đồng hồ
router.post("/add", async (req: Request, res: Response) => {
  try {
    const {
      meterNo, meterName, meterModelId, meterType, customerCode, phone,
      address, pipeSize, state, simCardNo, imei, moduleNo, lineId,
      groupId, note, warranty
    } = req.body;

    const connection = await pool.connect();
    await connection.request()
      .input("METER_NO",       mssql.VarChar,  meterNo)
      .input("METER_NAME",     mssql.NVarChar, meterName || "")
      .input("METER_MODEL_ID", mssql.VarChar,  meterModelId || "")
      .input("METER_TYPE",     mssql.Int,      meterType ?? 0)
      .input("CUSTOMER_CODE",  mssql.VarChar,  customerCode || "")
      .input("PHONE",          mssql.VarChar,  phone || "")
      .input("ADDRESS",        mssql.NVarChar, address || "")
      .input("PIPE_SIZE",      mssql.VarChar,  pipeSize || "")
      .input("STATE",          mssql.Int,      state ?? 0)
      .input("SIM_CARD_NO",    mssql.VarChar,  simCardNo || "")
      .input("IMEI",           mssql.VarChar,  imei || "")
      .input("MODULE_NO",      mssql.VarChar,  moduleNo || "")
      .input("LINE_ID",        mssql.VarChar,  lineId || "")
      .input("GROUP_ID",       mssql.Int,      groupId ?? null)
      .input("NOTE",           mssql.NVarChar, note || "")
      .input("WARRANTY",       mssql.Int,      warranty ?? null)
      .query(`
        INSERT INTO INFO_METER
          (METER_NO, METER_NAME, METER_MODEL_ID, METER_TYPE, CUSTOMER_CODE, PHONE, ADDRESS,
           PIPE_SIZE, STATE, SIM_CARD_NO, IMEI, MODULE_NO, LINE_ID, GROUP_ID, NOTE, WARRANTY, CREATED)
        VALUES
          (@METER_NO, @METER_NAME, @METER_MODEL_ID, @METER_TYPE, @CUSTOMER_CODE, @PHONE, @ADDRESS,
           @PIPE_SIZE, @STATE, @SIM_CARD_NO, @IMEI, @MODULE_NO, @LINE_ID, @GROUP_ID, @NOTE, @WARRANTY, GETDATE())
      `);
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// PUT /api/water-meters/update/:no — Cập nhật đồng hồ
router.put("/update/:no", async (req: Request, res: Response) => {
  try {
    const {
      meterName, meterModelId, meterType, customerCode, phone,
      address, pipeSize, state, simCardNo, imei, moduleNo,
      lineId, groupId, note, warranty
    } = req.body;

    const connection = await pool.connect();
    await connection.request()
      .input("METER_NO",       mssql.VarChar,  req.params.no)
      .input("METER_NAME",     mssql.NVarChar, meterName || "")
      .input("METER_MODEL_ID", mssql.VarChar,  meterModelId || "")
      .input("METER_TYPE",     mssql.Int,      meterType ?? 0)
      .input("CUSTOMER_CODE",  mssql.VarChar,  customerCode || "")
      .input("PHONE",          mssql.VarChar,  phone || "")
      .input("ADDRESS",        mssql.NVarChar, address || "")
      .input("PIPE_SIZE",      mssql.VarChar,  pipeSize || "")
      .input("STATE",          mssql.Int,      state ?? 0)
      .input("SIM_CARD_NO",    mssql.VarChar,  simCardNo || "")
      .input("IMEI",           mssql.VarChar,  imei || "")
      .input("MODULE_NO",      mssql.VarChar,  moduleNo || "")
      .input("LINE_ID",        mssql.VarChar,  lineId || "")
      .input("GROUP_ID",       mssql.Int,      groupId ?? null)
      .input("NOTE",           mssql.NVarChar, note || "")
      .input("WARRANTY",       mssql.Int,      warranty ?? null)
      .query(`
        UPDATE INFO_METER SET
          METER_NAME=@METER_NAME, METER_MODEL_ID=@METER_MODEL_ID, METER_TYPE=@METER_TYPE,
          CUSTOMER_CODE=@CUSTOMER_CODE, PHONE=@PHONE, ADDRESS=@ADDRESS, PIPE_SIZE=@PIPE_SIZE,
          STATE=@STATE, SIM_CARD_NO=@SIM_CARD_NO, IMEI=@IMEI, MODULE_NO=@MODULE_NO,
          LINE_ID=@LINE_ID, GROUP_ID=@GROUP_ID, NOTE=@NOTE, WARRANTY=@WARRANTY
        WHERE METER_NO=@METER_NO
      `);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// DELETE /api/water-meters/:no — Xóa đồng hồ
router.delete("/:no", async (req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    await connection.request()
      .input("METER_NO", mssql.VarChar, req.params.no)
      .query(`DELETE FROM INFO_METER WHERE METER_NO = @METER_NO`);
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ===================================================================
// MAP DATA: Gateways + Meters với tọa độ (hash từ mã thiết bị)
// ===================================================================

// GET /api/water-meters/map/data
router.get("/map/data", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.connect();

    // Gateways: lấy từ HIS_INSTANT_METER
    const gwRes = await connection.request().query(`
      SELECT
        GATEWAY_NO                                                as gatewayNo,
        COUNT(DISTINCT METER_NO)                                 as meterCount,
        MAX(REALTIME)                                            as lastPing,
        AVG(ISNULL(CAST(SIGNAL as float), 0))                   as avgSignal
      FROM HIS_INSTANT_METER
      WHERE GATEWAY_NO IS NOT NULL AND LEN(ISNULL(GATEWAY_NO,'')) > 0
      GROUP BY GATEWAY_NO
    `);

    // Meters: INFO_METER join với bản ghi mới nhất từ HIS_INSTANT_METER
    const meterRes = await connection.request().query(`
      SELECT TOP 3000
        m.METER_NO        as meterNo,
        m.METER_NAME      as meterName,
        ISNULL(m.ADDRESS, '')       as address,
        ISNULL(m.CUSTOMER_CODE, '') as customerCode,
        m.STATE           as state,
        h.GATEWAY_NO      as gatewayNo,
        h.SIGNAL          as signal,
        h.REMAIN_BATTERY  as remainBattery,
        h.REALTIME        as lastDataTime,
        h.STATUS          as deviceStatus
      FROM INFO_METER m
      LEFT JOIN (
        SELECT METER_NO, GATEWAY_NO, SIGNAL, REMAIN_BATTERY, REALTIME, STATUS,
               ROW_NUMBER() OVER (PARTITION BY METER_NO ORDER BY REALTIME DESC) as rn
        FROM HIS_INSTANT_METER
      ) h ON m.METER_NO = h.METER_NO AND h.rn = 1
    `);

    // Hàm hash djb2 → tọa độ giả lập ổn định
    const BASE_LAT = 21.0278, BASE_LNG = 105.8342;
    function hashCoord(s: string, base: number, range: number): number {
      let h = 5381;
      for (let i = 0; i < s.length; i++) {
        h = ((h * 33) ^ s.charCodeAt(i)) & 0x7fffffff;
      }
      return base + ((h % 100000) / 100000 - 0.5) * range * 2;
    }

    const gateways = gwRes.recordset.map((gw: any) => {
      const now = new Date().getTime();
      const last = gw.lastPing ? new Date(gw.lastPing).getTime() : 0;
      return {
        gatewayNo:  gw.gatewayNo,
        meterCount: gw.meterCount,
        lastPing:   gw.lastPing,
        avgSignal:  Math.round(gw.avgSignal || 0),
        online:     last > 0 && (now - last) < 24 * 3600 * 1000,
        lat: hashCoord(gw.gatewayNo,         BASE_LAT, 0.07),
        lng: hashCoord(gw.gatewayNo + "_lng", BASE_LNG, 0.07)
      };
    });

    const gwMap = new Map<string, { lat: number; lng: number }>(
      gateways.map((g: any) => [g.gatewayNo, { lat: g.lat, lng: g.lng }])
    );

    const meters = meterRes.recordset.map((m: any) => {
      const gwPos = m.gatewayNo ? gwMap.get(m.gatewayNo) : null;
      const bLat  = gwPos ? gwPos.lat : BASE_LAT;
      const bLng  = gwPos ? gwPos.lng : BASE_LNG;
      const now   = new Date().getTime();
      const last  = m.lastDataTime ? new Date(m.lastDataTime).getTime() : 0;
      const online = m.state === 1 && last > 0 && (now - last) < 24 * 3600 * 1000;
      return {
        meterNo:      m.meterNo,
        meterName:    m.meterName,
        address:      m.address,
        customerCode: m.customerCode,
        state:        m.state,
        gatewayNo:    m.gatewayNo,
        signal:       m.signal,
        remainBattery:m.remainBattery,
        lastDataTime: m.lastDataTime,
        online,
        lat: hashCoord(m.meterNo,         bLat, 0.012),
        lng: hashCoord(m.meterNo + "_lng", bLng, 0.012)
      };
    });

    res.json({ code: 0, message: "common.success", data: { gateways, meters } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ===================================================================
// TREE: Gateway → Meter (dùng cho tree view phân tích)
// ===================================================================

// GET /api/water-meters/tree
router.get("/tree", async (_req: Request, res: Response) => {
  try {
    const r = (await pool.connect()).request();
    const result = await r.query(`
      SELECT TOP 3000 DISTINCT
        ISNULL(GATEWAY_NO, 'Unknown') as gatewayNo,
        METER_NO                      as meterNo
      FROM HIS_INSTANT_METER
      WHERE METER_NO IS NOT NULL AND LEN(ISNULL(METER_NO,'')) > 0
      ORDER BY gatewayNo, meterNo
    `);

    const map = new Map<string, string[]>();
    for (const row of result.recordset) {
      const gw = row.gatewayNo || "Unknown";
      if (!map.has(gw)) map.set(gw, []);
      map.get(gw)!.push(row.meterNo);
    }

    const tree = [
      {
        id: "ALL", label: "Tất cả thiết bị", type: "root",
        children: Array.from(map.entries()).map(([gw, meters]) => ({
          id: `GW_${gw}`, label: gw, type: "gateway", gatewayNo: gw,
          children: meters.map(m => ({
            id: `M_${m}`, label: m, type: "meter", meterNo: m, gatewayNo: gw
          }))
        }))
      }
    ];

    res.json({ code: 0, message: "common.success", data: tree });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ===================================================================
// HIS_INSTANT_METER — Đồng hồ con (dữ liệu tức thời)
// ===================================================================

// POST /api/water-meters/instant/list
router.post("/instant/list", async (req: Request, res: Response) => {
  try {
    const { meterNo, gatewayNo, dateFrom, dateTo, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (dateFrom)  conds.push("REALTIME >= @dateFrom");
    if (dateTo)    conds.push("REALTIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const addP = (r: mssql.Request) => {
      if (meterNo)   r.input("meterNo",   mssql.VarChar,  `%${meterNo}%`);
      if (gatewayNo) r.input("gatewayNo", mssql.VarChar,  `%${gatewayNo}%`);
      if (dateFrom)  r.input("dateFrom",  mssql.VarChar,  dateFrom);
      if (dateTo)    r.input("dateTo",    mssql.VarChar,  dateTo);
      return r;
    };

    const countResult = await addP(connection.request()).query(
      `SELECT COUNT(*) as total FROM HIS_INSTANT_METER ${where}`
    );

    const dataReq = addP(connection.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));
    const dataResult = await dataReq.query(`
      SELECT
        METER_NO       as meterNo,
        REALTIME       as realtime,
        SIGNAL         as signal,
        USED_BATTERY   as usedBattery,
        REMAIN_BATTERY as remainBattery,
        TEMPERATURE    as temperature,
        VOLTAGE        as voltage,
        GATEWAY_NO     as gatewayNo,
        STATUS         as status,
        CABIN_DOOR     as cabinDoor,
        PUSHED         as pushed
      FROM HIS_INSTANT_METER
      ${where}
      ORDER BY REALTIME DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0, message: "common.success",
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

// POST /api/water-meters/instant/chart — Dữ liệu biểu đồ (gộp theo ngày)
router.post("/instant/chart", async (req: Request, res: Response) => {
  try {
    const { meterNo, gatewayNo, dateFrom, dateTo } = req.body;

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (dateFrom)  conds.push("REALTIME >= @dateFrom");
    if (dateTo)    conds.push("REALTIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      SELECT
        CONVERT(varchar(10), REALTIME, 120)              as date,
        COUNT(*)                                          as readingCount,
        AVG(ISNULL(CAST(SIGNAL        as float), 0))     as avgSignal,
        AVG(ISNULL(CAST(REMAIN_BATTERY as float), 0))    as avgBattery,
        AVG(ISNULL(CAST(TEMPERATURE   as float), 0))     as avgTemperature,
        AVG(ISNULL(CAST(VOLTAGE       as float), 0))     as avgVoltage
      FROM HIS_INSTANT_METER
      ${where}
      GROUP BY CONVERT(varchar(10), REALTIME, 120)
      ORDER BY date
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ===================================================================
// HIS_DATA_METER — Data Logger (lưu lượng, áp suất)
// ===================================================================

// POST /api/water-meters/logger/list
router.post("/logger/list", async (req: Request, res: Response) => {
  try {
    const { meterNo, gatewayNo, dateFrom, dateTo, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const addP = (r: mssql.Request) => {
      if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
      if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
      if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
      if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);
      return r;
    };

    const countResult = await addP(connection.request()).query(
      `SELECT COUNT(*) as total FROM HIS_DATA_METER ${where}`
    );

    const dataReq = addP(connection.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));
    const dataResult = await dataReq.query(`
      SELECT
        METER_NO        as meterNo,
        DATA_TIME       as dataTime,
        ACTIVE_TOTAL    as activeTotal,
        FORWARD_TOTAL   as forwardTotal,
        NEGACTIVE_TOTAL as negactiveTotal,
        GATEWAY_NO      as gatewayNo,
        PRESSURE        as pressure,
        FLOW            as flow,
        PRESSURE_2      as pressure2,
        REVERSE_FLOW    as reverseFlow,
        PUSHED          as pushed
      FROM HIS_DATA_METER
      ${where}
      ORDER BY DATA_TIME DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      code: 0, message: "common.success",
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

// POST /api/water-meters/logger/production — Sản lượng gộp theo ngày hoặc tháng
router.post("/logger/production", async (req: Request, res: Response) => {
  try {
    const { meterNo, gatewayNo, dateFrom, dateTo, groupBy = "day" } = req.body;

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const convertExpr = groupBy === "month"
      ? "CONVERT(varchar(7), DATA_TIME, 120)"
      : "CONVERT(varchar(10), DATA_TIME, 120)";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      SELECT
        ${convertExpr}                                                                          as period,
        COUNT(DISTINCT METER_NO)                                                                as meterCount,
        COUNT(*)                                                                                as readingCount,
        SUM(ISNULL(CAST(FLOW         as float), 0))                                            as totalFlow,
        SUM(ISNULL(CAST(REVERSE_FLOW as float), 0))                                            as totalReverseFlow,
        AVG(ISNULL(CAST(PRESSURE     as float), 0))                                            as avgPressure,
        SUM(ISNULL(CAST(ACTIVE_TOTAL as float), 0) - ISNULL(CAST(NEGACTIVE_TOTAL as float), 0)) as netConsumption,
        MAX(ISNULL(CAST(ACTIVE_TOTAL as float), 0)) - MIN(ISNULL(CAST(ACTIVE_TOTAL as float), 0)) as consumption
      FROM HIS_DATA_METER
      ${where}
      GROUP BY ${convertExpr}
      ORDER BY period
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/logger/chart — Dữ liệu biểu đồ (gộp theo ngày)
router.post("/logger/chart", async (req: Request, res: Response) => {
  try {
    const { meterNo, gatewayNo, dateFrom, dateTo } = req.body;

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      SELECT
        CONVERT(varchar(10), DATA_TIME, 120)                                          as date,
        COUNT(*)                                                                       as readingCount,
        SUM(ISNULL(CAST(FLOW         as float), 0))                                   as totalFlow,
        SUM(ISNULL(CAST(REVERSE_FLOW as float), 0))                                   as totalReverseFlow,
        AVG(ISNULL(CAST(PRESSURE     as float), 0))                                   as avgPressure,
        AVG(ISNULL(CAST(PRESSURE_2   as float), 0))                                   as avgPressure2,
        MAX(ISNULL(CAST(ACTIVE_TOTAL as float), 0)) - MIN(ISNULL(CAST(ACTIVE_TOTAL as float), 0)) as dailyConsumption
      FROM HIS_DATA_METER
      ${where}
      GROUP BY CONVERT(varchar(10), DATA_TIME, 120)
      ORDER BY date
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
