import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import { zoneAuth, buildZoneFilter } from "../middleware/zoneAuth.js";

const router = express.Router();

/** Lấy tất cả IDs của regionId và toàn bộ region con (descendants) */
async function expandRegionId(conn: any, regionId: number): Promise<number[]> {
  const req = conn.request().input("rid", mssql.Int, regionId);
  const res = await req.query(`
    WITH RegionCTE AS (
      SELECT ID FROM SYS_REGION WHERE ID = @rid AND DEL_FLAG = 0
      UNION ALL
      SELECT r.ID FROM SYS_REGION r
      JOIN RegionCTE rc ON r.PARENT_ID = rc.ID
      WHERE r.DEL_FLAG = 0
    )
    SELECT DISTINCT ID FROM RegionCTE
  `);
  return res.recordset.map((r: any) => Number(r.ID));
}

// POST /api/water-meters/list — Danh sách đồng hồ (phân trang + tìm kiếm)
router.post("/list", zoneAuth, async (req: Request, res: Response) => {
  try {
    const { keyword, state, meterType, lineId, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    // Expand lineId sang tất cả region con để lọc đúng vùng phân cấp
    const lineIdList = (lineId !== undefined && lineId !== "")
      ? await expandRegionId(connection, Number(lineId))
      : null;

    // Xây điều kiện lọc
    const conditions: string[] = [];
    if (keyword) conditions.push("(m.METER_NO LIKE @keyword OR m.METER_NAME LIKE @keyword OR m.CUSTOMER_CODE LIKE @keyword)");
    if (state !== undefined && state !== "") conditions.push("m.STATE = @state");
    if (meterType !== undefined && meterType !== "") conditions.push("m.METER_TYPE = @meterType");
    if (lineIdList) conditions.push(`m.REGION_ID IN (${lineIdList.map((_, i) => `@rid${i}`).join(", ")})`);

    // Hàm thêm params vào request
    const addParams = (r: mssql.Request) => {
      if (keyword) r.input("keyword", mssql.NVarChar, `%${keyword}%`);
      if (state !== undefined && state !== "") r.input("state", mssql.NVarChar, String(state));
      if (meterType !== undefined && meterType !== "") r.input("meterType", mssql.NVarChar, String(meterType));
      if (lineIdList) lineIdList.forEach((id, i) => r.input(`rid${i}`, mssql.Int, id));
    };

    // Lấy zone condition string và thêm vào conditions (dùng countReq để build lần đầu)
    // REGION_ID là cột mới trong INFO_METER, tham chiếu tới SYS_REGION.ID
    const countReq = connection.request();
    addParams(countReq);
    const zoneCondition = buildZoneFilter(req, countReq, "REGION_ID");
    if (zoneCondition) conditions.push(zoneCondition);

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countResult = await countReq.query(
      `SELECT COUNT(*) as total FROM INFO_METER m LEFT JOIN SYS_REGION r ON m.REGION_ID = r.ID AND r.DEL_FLAG = 0 ${where}`
    );

    // Data request — thêm lại zone params riêng (request object khác nhau)
    const dataReq = connection.request();
    addParams(dataReq);
    buildZoneFilter(req, dataReq, "REGION_ID"); // thêm zone params vào dataReq
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const dataResult = await dataReq.query(`
      SELECT
        m.METER_NO        as meterNo,
        m.METER_NAME      as meterName,
        m.METER_MODEL_ID  as meterModelId,
        m.METER_TYPE      as meterType,
        m.CUSTOMER_CODE   as customerCode,
        m.PHONE           as phone,
        m.ADDRESS         as address,
        m.PIPE_SIZE       as pipeSize,
        m.STATE           as state,
        m.SIM_CARD_NO     as simCardNo,
        m.IMEI            as imei,
        m.MODULE_NO       as moduleNo,
        m.REGION_ID as regionId,
        r.NAME            as regionName,
        m.GROUP_ID        as groupId,
        m.LOCK            as lock,
        m.NOTE            as note,
        m.LASTTIME_DATA   as lasttimeData,
        m.PRODUCTION_DATE as productionDate,
        m.DELIVERY_DATE   as deliveryDate,
        m.WARRANTY        as warranty,
        m.CREATED         as created
      FROM INFO_METER m
      LEFT JOIN SYS_REGION r ON m.REGION_ID = r.ID AND r.DEL_FLAG = 0
      ${where}
      ORDER BY m.CREATED DESC
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
      address, pipeSize, state, simCardNo, imei, moduleNo,
      regionId, groupId, note, warranty
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
      .input("REGION_ID",      mssql.Int,      regionId ?? null)
      .input("GROUP_ID",       mssql.Int,      groupId ?? null)
      .input("NOTE",           mssql.NVarChar, note || "")
      .input("WARRANTY",       mssql.Int,      warranty ?? null)
      .query(`
        INSERT INTO INFO_METER
          (METER_NO, METER_NAME, METER_MODEL_ID, METER_TYPE, CUSTOMER_CODE, PHONE, ADDRESS,
           PIPE_SIZE, STATE, SIM_CARD_NO, IMEI, MODULE_NO, REGION_ID, GROUP_ID, NOTE, WARRANTY, CREATED)
        VALUES
          (@METER_NO, @METER_NAME, @METER_MODEL_ID, @METER_TYPE, @CUSTOMER_CODE, @PHONE, @ADDRESS,
           @PIPE_SIZE, @STATE, @SIM_CARD_NO, @IMEI, @MODULE_NO, @REGION_ID, @GROUP_ID, @NOTE, @WARRANTY, GETDATE())
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
      regionId, groupId, note, warranty
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
      .input("REGION_ID",      mssql.Int,      regionId ?? null)
      .input("GROUP_ID",       mssql.Int,      groupId ?? null)
      .input("NOTE",           mssql.NVarChar, note || "")
      .input("WARRANTY",       mssql.Int,      warranty ?? null)
      .query(`
        UPDATE INFO_METER SET
          METER_NAME=@METER_NAME, METER_MODEL_ID=@METER_MODEL_ID, METER_TYPE=@METER_TYPE,
          CUSTOMER_CODE=@CUSTOMER_CODE, PHONE=@PHONE, ADDRESS=@ADDRESS, PIPE_SIZE=@PIPE_SIZE,
          STATE=@STATE, SIM_CARD_NO=@SIM_CARD_NO, IMEI=@IMEI, MODULE_NO=@MODULE_NO,
          REGION_ID=@REGION_ID, GROUP_ID=@GROUP_ID, NOTE=@NOTE, WARRANTY=@WARRANTY
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

    // Regions: lấy toàn bộ cây vùng để trả về cùng
    const regionRes = await connection.request().query(`
      SELECT ID as id, NAME as name, PARENT_ID as parentId, ORDER_NUM as orderNum
      FROM SYS_REGION WHERE DEL_FLAG = 0
      ORDER BY ORDER_NUM ASC
    `);

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

    // Meters: INFO_METER join SYS_REGION + bản ghi mới nhất từ HIS_INSTANT_METER
    const meterRes = await connection.request().query(`
      SELECT TOP 3000
        m.METER_NO        as meterNo,
        m.METER_NAME      as meterName,
        ISNULL(m.ADDRESS, '')       as address,
        ISNULL(m.CUSTOMER_CODE, '') as customerCode,
        m.STATE           as state,
        m.REGION_ID as regionId,
        r.NAME            as regionName,
        h.GATEWAY_NO      as gatewayNo,
        h.SIGNAL          as signal,
        h.REMAIN_BATTERY  as remainBattery,
        h.REALTIME        as lastDataTime,
        h.STATUS          as deviceStatus
      FROM INFO_METER m
      LEFT JOIN SYS_REGION r ON m.REGION_ID = r.ID AND r.DEL_FLAG = 0
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
        regionId:     m.regionId ?? null,
        regionName:   m.regionName ?? null,
        gatewayNo:    m.gatewayNo,
        signal:       m.signal,
        remainBattery:m.remainBattery,
        lastDataTime: m.lastDataTime,
        online,
        lat: hashCoord(m.meterNo,         bLat, 0.012),
        lng: hashCoord(m.meterNo + "_lng", bLng, 0.012)
      };
    });

    const regions = regionRes.recordset;
    res.json({ code: 0, message: "common.success", data: { regions, gateways, meters } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ===================================================================
// TREE: Gateway → Meter (dùng cho tree view phân tích)
// ===================================================================

// GET /api/water-meters/tree — full N-level region hierarchy
router.get("/tree", async (_req: Request, res: Response) => {
  try {
    const conn = await pool.connect();

    // 1. All regions (full hierarchy via PARENT_ID)
    const regRows = (await conn.request().query(`
      SELECT ID as id, NAME as name, PARENT_ID as parentId, ORDER_NUM as orderNum
      FROM SYS_REGION WHERE DEL_FLAG = 0
      ORDER BY ORDER_NUM ASC, NAME ASC
    `)).recordset;

    // 2. All meters — INFO_METER.REGION_ID references SYS_REGION.ID
    const meterRows = (await conn.request().query(`
      SELECT METER_NO as meterNo, METER_NAME as meterName, STATE as state,
             REGION_ID as regionId
      FROM INFO_METER
      ORDER BY METER_NO
    `)).recordset;
    type ZNode = { id: string; label: string; type: string; regionId: number | null; children: any[]; _cnt: number };
    const nodeMap = new Map<number, ZNode>(); // key: SYS_REGION.ID (normalized to number)
    for (const r of regRows) {
      const rid = Number(r.id);
      const node: ZNode = {
        id:       `Z_${rid}`,
        label:    r.name,
        type:     "zone",
        regionId: rid,
        children: [],
        _cnt:     0
      };
      nodeMap.set(rid, node);
    }

    // Wire parent → child using SYS_REGION.PARENT_ID → SYS_REGION.ID
    const rootZones: ZNode[] = [];
    for (const r of regRows) {
      const rid = Number(r.id);
      const node = nodeMap.get(rid)!;
      const parentId = r.parentId ? Number(r.parentId) : null;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node);
      } else {
        rootZones.push(node);
      }
    }

    // Attach meters: INFO_METER.REGION_ID → SYS_REGION.ID (normalize về number)
    const unassigned: any[] = [];
    for (const m of meterRows) {
      const mNode = {
        id:       `M_${m.meterNo}`,
        label:    m.meterName ? `${m.meterNo} – ${m.meterName}` : m.meterNo,
        type:     "meter",
        meterNo:  m.meterNo,
        regionId: m.regionId != null ? Number(m.regionId) : null,
        state:    m.state
      };
      const targetZone = m.regionId != null
        ? nodeMap.get(Number(m.regionId))
        : null;
      if (targetZone) {
        targetZone.children.push(mNode);
      } else {
        unassigned.push(mNode);
      }
    }

    // Bubble-up meter count and update label
    function bubbleCount(node: ZNode): number {
      let cnt = 0;
      for (const c of node.children) {
        cnt += c.type === "meter" ? 1 : bubbleCount(c as ZNode);
      }
      node._cnt = cnt;
      node.label = `${node.label} (${cnt})`;
      return cnt;
    }
    rootZones.forEach(z => bubbleCount(z));

    if (unassigned.length) {
      rootZones.push({
        id: "Z_0", label: `Chưa phân vùng (${unassigned.length})`,
        type: "zone", regionId: null, children: unassigned, _cnt: unassigned.length
      });
    }

    res.json({ code: 0, message: "common.success", data: rootZones });
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
    const { meterNo, gatewayNo, regionId, dateFrom, dateTo, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (regionId)  conds.push("METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WHERE im.REGION_ID IN (SELECT ID FROM RegionTree))");
    if (dateFrom)  conds.push("REALTIME >= @dateFrom");
    if (dateTo)    conds.push("REALTIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const addP = (r: mssql.Request) => {
      if (meterNo)   r.input("meterNo",   mssql.VarChar,  `%${meterNo}%`);
      if (gatewayNo) r.input("gatewayNo", mssql.VarChar,  `%${gatewayNo}%`);
      if (regionId)  r.input("regionId",  mssql.Int,      Number(regionId));
      if (dateFrom)  r.input("dateFrom",  mssql.VarChar,  dateFrom);
      if (dateTo)    r.input("dateTo",    mssql.VarChar,  dateTo);
      return r;
    };

    const countResult = await addP(connection.request()).query(
      `${regionCte} SELECT COUNT(*) as total FROM HIS_INSTANT_METER ${where}`
    );

    const dataReq = addP(connection.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));
    const dataResult = await dataReq.query(`
      ${regionCte}
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
    const { meterNo, gatewayNo, regionId, dateFrom, dateTo } = req.body;

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (regionId)  conds.push("METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WHERE im.REGION_ID IN (SELECT ID FROM RegionTree))");
    if (dateFrom)  conds.push("REALTIME >= @dateFrom");
    if (dateTo)    conds.push("REALTIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (regionId)  r.input("regionId",  mssql.Int,     Number(regionId));
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      ${regionCte}
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
    const { meterNo, gatewayNo, regionId, dateFrom, dateTo, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const connection = await pool.connect();

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (regionId)  conds.push("METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WHERE im.REGION_ID IN (SELECT ID FROM RegionTree))");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const addP = (r: mssql.Request) => {
      if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
      if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
      if (regionId)  r.input("regionId",  mssql.Int,     Number(regionId));
      if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
      if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);
      return r;
    };

    const countResult = await addP(connection.request()).query(
      `${regionCte} SELECT COUNT(*) as total FROM HIS_DATA_METER ${where}`
    );

    const dataReq = addP(connection.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));
    const dataResult = await dataReq.query(`
      ${regionCte}
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
    const { meterNo, gatewayNo, regionId, dateFrom, dateTo, groupBy = "day" } = req.body;

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (regionId)  conds.push("METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WHERE im.REGION_ID IN (SELECT ID FROM RegionTree))");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const convertExpr = groupBy === "month"
      ? "CONVERT(varchar(7), DATA_TIME, 120)"
      : "CONVERT(varchar(10), DATA_TIME, 120)";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (regionId)  r.input("regionId",  mssql.Int,     Number(regionId));
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      ${regionCte}
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
    const { meterNo, gatewayNo, regionId, dateFrom, dateTo } = req.body;

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const conds: string[] = [];
    if (meterNo)   conds.push("METER_NO LIKE @meterNo");
    if (gatewayNo) conds.push("GATEWAY_NO LIKE @gatewayNo");
    if (regionId)  conds.push("METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WHERE im.REGION_ID IN (SELECT ID FROM RegionTree))");
    if (dateFrom)  conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)    conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const r = (await pool.connect()).request();
    if (meterNo)   r.input("meterNo",   mssql.VarChar, `%${meterNo}%`);
    if (gatewayNo) r.input("gatewayNo", mssql.VarChar, `%${gatewayNo}%`);
    if (regionId)  r.input("regionId",  mssql.Int,     Number(regionId));
    if (dateFrom)  r.input("dateFrom",  mssql.VarChar, dateFrom);
    if (dateTo)    r.input("dateTo",    mssql.VarChar, dateTo);

    const result = await r.query(`
      ${regionCte}
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

// POST /api/water-meters/logger/multi-chart — Per-meter chart data for multiple meters
// Yêu cầu auth; lọc meterNos theo zone của user
router.post("/logger/multi-chart", zoneAuth, async (req: Request, res: Response) => {
  try {
    let { meterNos, dateFrom, dateTo, groupBy = "day" } = req.body;
    if (!meterNos?.length) return res.json({ code: 0, message: "common.success", data: [] });

    const conn = await pool.connect();

    // Lọc meterNos theo zone của user (nếu có hạn chế zone)
    if (req.userZones !== null && req.userZones !== undefined) {
      const zones = req.userZones;
      if (zones.length === 0) return res.json({ code: 0, message: "common.success", data: [] });
      const zReq = conn.request();
      zones.forEach((id, i) => zReq.input(`z${i}`, mssql.Int, id));
      const inZ = zones.map((_, i) => `@z${i}`).join(",");
      const allowed = await zReq.query(
        `SELECT METER_NO FROM INFO_METER WHERE REGION_ID IN (${inZ})`
      );
      const allowedSet = new Set(allowed.recordset.map((r: any) => r.METER_NO));
      meterNos = (meterNos as string[]).filter((no: string) => allowedSet.has(no));
      if (!meterNos.length) return res.json({ code: 0, message: "common.success", data: [] });
    }

    const r = conn.request();
    const placeholders = (meterNos as string[]).map((no: string, i: number) => {
      r.input(`m${i}`, mssql.VarChar, no);
      return `@m${i}`;
    }).join(",");
    if (dateFrom) r.input("dateFrom", mssql.VarChar, dateFrom);
    if (dateTo)   r.input("dateTo",   mssql.VarChar, dateTo);

    const conds: string[] = [`METER_NO IN (${placeholders})`];
    if (dateFrom) conds.push("DATA_TIME >= @dateFrom");
    if (dateTo)   conds.push("DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))");
    const where = "WHERE " + conds.join(" AND ");

    const periodExpr = groupBy === "hour"
      ? "CONVERT(varchar(13), DATA_TIME, 120) + ':00'"
      : "CONVERT(varchar(10), DATA_TIME, 120)";

    const result = await r.query(`
      SELECT
        METER_NO as meterNo,
        ${periodExpr} as period,
        SUM(ISNULL(CAST(FLOW as float), 0))      as totalFlow,
        AVG(ISNULL(CAST(FLOW as float), 0))      as avgFlow,
        MIN(ISNULL(CAST(FLOW as float), 0))      as minFlow,
        MAX(ISNULL(CAST(FLOW as float), 0))      as maxFlow,
        AVG(ISNULL(CAST(PRESSURE as float), 0))  as avgPressure,
        MIN(ISNULL(CAST(PRESSURE as float), 0))  as minPressure,
        MAX(ISNULL(CAST(PRESSURE as float), 0))  as maxPressure,
        COUNT(*) as readingCount
      FROM HIS_DATA_METER
      ${where}
      GROUP BY METER_NO, ${periodExpr}
      ORDER BY METER_NO, period
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/logger/thresholds — HLS/LLS ngưỡng áp suất từ INFO_METER
// Dùng cho màn Áp suất để vẽ đường cảnh báo trên chart
router.post("/logger/thresholds", zoneAuth, async (req: Request, res: Response) => {
  try {
    const { meterNos } = req.body;
    if (!meterNos?.length) return res.json({ code: 0, message: "common.success", data: [] });

    const r = (await pool.connect()).request();
    const placeholders = (meterNos as string[]).map((no: string, i: number) => {
      r.input(`m${i}`, mssql.VarChar, no);
      return `@m${i}`;
    }).join(",");

    const result = await r.query(`
      SELECT
        METER_NO  as meterNo,
        METER_NAME as meterName,
        ISNULL(CAST(HLS as float), NULL) as hls,
        ISNULL(CAST(LLS as float), NULL) as lls,
        PIPE_SIZE as pipeSize,
        METER_TYPE as meterType
      FROM INFO_METER
      WHERE METER_NO IN (${placeholders})
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/logger/zone-summary — Zone-level aggregated stats
router.post("/logger/zone-summary", async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, regionId, groupBy = "month" } = req.body;
    const r = (await pool.connect()).request();

    const regionCte = regionId ? `WITH RegionTree AS (
      SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
      UNION ALL
      SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
    )` : "";

    const mConds: string[] = ["1=1"];
    const hConds: string[] = [];
    if (regionId) { r.input("regionId", mssql.Int, Number(regionId)); mConds.push("m.REGION_ID IN (SELECT ID FROM RegionTree)"); }
    if (dateFrom) { r.input("dateFrom", mssql.VarChar, dateFrom); hConds.push("h.DATA_TIME >= @dateFrom"); }
    if (dateTo)   { r.input("dateTo",   mssql.VarChar, dateTo);   hConds.push("h.DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))"); }

    const mWhere = "WHERE " + mConds.join(" AND ");
    const hFilter = hConds.length ? " AND " + hConds.join(" AND ") : "";

    const periodExpr = groupBy === "year"
      ? "CONVERT(varchar(4), h.DATA_TIME, 120)"
      : "CONVERT(varchar(7), h.DATA_TIME, 120)";

    const result = await r.query(`
      ${regionCte}
      SELECT
        ISNULL(r.ID, 0)                as regionId,
        ISNULL(r.NAME, N'Chưa phân vùng') as regionName,
        ${periodExpr}                  as period,
        COUNT(DISTINCT m.METER_NO)     as meterCount,
        SUM(ISNULL(CAST(h.FLOW as float), 0))                                                                as totalFlow,
        AVG(ISNULL(CAST(h.PRESSURE as float), 0))                                                            as avgPressure,
        MAX(ISNULL(CAST(h.ACTIVE_TOTAL as float), 0)) - MIN(ISNULL(CAST(h.ACTIVE_TOTAL as float), 0))        as consumption
      FROM INFO_METER m
      LEFT JOIN SYS_REGION r ON m.REGION_ID = r.ID AND r.DEL_FLAG = 0
      LEFT JOIN HIS_DATA_METER h ON m.METER_NO = h.METER_NO ${hFilter}
      ${mWhere}
      GROUP BY r.ID, r.NAME, ${periodExpr}
      ORDER BY r.ID, period
    `);

    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// GET /api/water-meters/zone-stats — Zone meter counts + today's flow
router.get("/zone-stats", async (_req: Request, res: Response) => {
  try {
    const r = (await pool.connect()).request();
    const result = await r.query(`
      SELECT
        r.ID   as regionId,
        r.NAME as regionName,
        COUNT(m.METER_NO)                                           as totalMeters,
        SUM(CASE WHEN m.STATE = 1 THEN 1 ELSE 0 END)               as activeMeters,
        ISNULL((
          SELECT SUM(ISNULL(CAST(h2.FLOW as float), 0))
          FROM HIS_DATA_METER h2
          INNER JOIN INFO_METER m2 ON h2.METER_NO = m2.METER_NO
          WHERE m2.REGION_ID = r.ID
            AND h2.DATA_TIME >= CAST(GETDATE() AS date)
        ), 0) as todayFlow
      FROM SYS_REGION r
      LEFT JOIN INFO_METER m ON m.REGION_ID = r.ID
      WHERE r.DEL_FLAG = 0
      GROUP BY r.ID, r.NAME
      ORDER BY r.NAME
    `);
    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/logger/hourly — Hourly consumption for a given date
router.post("/logger/hourly", async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const r = (await pool.connect()).request();
    r.input("dateFrom", mssql.VarChar, targetDate);
    r.input("dateTo",   mssql.VarChar, targetDate);

    const result = await r.query(`
      SELECT
        DATEPART(HOUR, DATA_TIME) as hr,
        SUM(ISNULL(CAST(FLOW as float), 0)) as totalFlow
      FROM HIS_DATA_METER
      WHERE DATA_TIME >= @dateFrom
        AND DATA_TIME < DATEADD(day, 1, CAST(@dateTo as date))
      GROUP BY DATEPART(HOUR, DATA_TIME)
      ORDER BY hr
    `);

    const byHour: Record<number, number> = {};
    result.recordset.forEach((row: any) => { byHour[row.hr] = +row.totalFlow.toFixed(1); });
    const data = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      consumption: byHour[i] ?? 0
    }));

    res.json({ code: 0, message: "common.success", data });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/meter-status — Danh sách ĐH kèm trạng thái mới nhất
router.post("/meter-status", async (req: Request, res: Response) => {
  try {
    const { keyword, regionId, state, online, currentPage = 1, pageSize = 20 } = req.body;
    const offset = (Number(currentPage) - 1) * Number(pageSize);
    const conn = await pool.connect();

    const conds: string[] = [];
    if (keyword)  conds.push("(m.METER_NO LIKE @kw OR m.METER_NAME LIKE @kw)");
    if (regionId) conds.push("m.REGION_ID IN (SELECT ID FROM RegionTree)");
    if (state !== undefined && state !== "") conds.push("m.STATE = @state");
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    // online filter applied after CTE (on computed column)
    const onlineFilter = (online === 1 || online === true)
      ? "WHERE online = 1"
      : (online === 0 || online === false)
        ? "WHERE online = 0"
        : "";

    const addP = (r: mssql.Request) => {
      if (keyword)  r.input("kw",       mssql.NVarChar, `%${keyword}%`);
      if (regionId) r.input("regionId", mssql.Int,      Number(regionId));
      if (state !== undefined && state !== "") r.input("state", mssql.Int, Number(state));
      return r;
    };

    // OUTER APPLY TOP 1 nhanh hơn ROW_NUMBER() OVER toàn bảng
    // Nếu có index (METER_NO, DATA_TIME DESC) → seek thay vì full scan
    const baseSql = `
      FROM INFO_METER m WITH(NOLOCK)
      LEFT JOIN SYS_REGION r WITH(NOLOCK) ON m.REGION_ID = r.ID AND r.DEL_FLAG = 0
      OUTER APPLY (
        SELECT TOP 1 DATA_TIME, FLOW, PRESSURE, ACTIVE_TOTAL
        FROM HIS_DATA_METER WITH(NOLOCK)
        WHERE METER_NO = m.METER_NO
        ORDER BY DATA_TIME DESC
      ) d
      OUTER APPLY (
        SELECT TOP 1 REALTIME, SIGNAL, REMAIN_BATTERY, TEMPERATURE, GATEWAY_NO
        FROM HIS_INSTANT_METER WITH(NOLOCK)
        WHERE METER_NO = m.METER_NO
        ORDER BY REALTIME DESC
      ) i
      ${where}
    `;

    // Khi có regionId, thêm RegionTree CTE trước base để lọc đúng vùng phân cấp
    const regionTreeCte = regionId
      ? `RegionTree AS (
          SELECT ID FROM SYS_REGION WHERE ID = @regionId AND DEL_FLAG = 0
          UNION ALL
          SELECT s.ID FROM SYS_REGION s JOIN RegionTree rt ON s.PARENT_ID = rt.ID WHERE s.DEL_FLAG = 0
        ),`
      : "";

    const cteWrap = (inner: string) => `
      WITH ${regionTreeCte} base AS (
        SELECT
          m.METER_NO        as meterNo,
          m.METER_NAME      as meterName,
          m.STATE           as state,
          m.ADDRESS         as address,
          m.REGION_ID       as regionId,
          r.NAME            as regionName,
          d.DATA_TIME       as lastDataTime,
          d.FLOW            as lastFlow,
          d.PRESSURE        as lastPressure,
          d.ACTIVE_TOTAL    as lastActiveTotal,
          i.REALTIME        as lastInstantTime,
          i.SIGNAL          as signal,
          i.REMAIN_BATTERY  as remainBattery,
          i.TEMPERATURE     as temperature,
          i.GATEWAY_NO      as gatewayNo,
          CASE WHEN d.DATA_TIME >= DATEADD(hour, -24, GETDATE()) THEN 1 ELSE 0 END as online
        ${baseSql}
      ) ${inner}
    `;

    // Count + data chạy SONG SONG
    const countReq = addP(conn.request());
    const dataReq  = addP(conn.request());
    dataReq.input("offset",   mssql.Int, offset);
    dataReq.input("pageSize", mssql.Int, Number(pageSize));

    const [countRes, dataRes] = await Promise.all([
      countReq.query(cteWrap(`SELECT COUNT(*) as total FROM base ${onlineFilter}`)),
      dataReq.query(cteWrap(`
        SELECT * FROM base ${onlineFilter}
        ORDER BY CASE WHEN online = 0 THEN 0 ELSE 1 END, lastDataTime DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `))
    ]);

    res.json({
      code: 0, message: "common.success",
      data: {
        list: dataRes.recordset,
        total: countRes.recordset[0].total,
        currentPage: Number(currentPage),
        pageSize: Number(pageSize)
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// POST /api/water-meters/collection-rate — Tỷ lệ thu thập dữ liệu theo ngày
router.post("/collection-rate", zoneAuth, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, regionId } = req.body;
    const conn = await pool.connect();

    // Expand regionId sang con cháu nếu có
    const regionIds = regionId ? await expandRegionId(conn, Number(regionId)) : null;

    // Zone filter từ token
    const zones = req.userZones;
    const buildMeterFilter = (r: mssql.Request, alias = "m"): string => {
      const conds: string[] = [];
      if (regionIds) {
        regionIds.forEach((id, i) => r.input(`cr${i}`, mssql.Int, id));
        conds.push(`${alias}.REGION_ID IN (${regionIds.map((_, i) => `@cr${i}`).join(",")})`);
      }
      if (zones) {
        zones.forEach((id, i) => r.input(`cz${i}`, mssql.Int, id));
        conds.push(`${alias}.REGION_ID IN (${zones.map((_, i) => `@cz${i}`).join(",")})`);
      }
      return conds.length ? "WHERE " + conds.join(" AND ") : "";
    };

    // Tổng đồng hồ STATE=1 (đang hoạt động) theo zone/region filter
    const totalReq = conn.request();
    const totalConds: string[] = ["m.STATE = 1"];
    if (regionIds) {
      regionIds.forEach((id, i) => totalReq.input(`tr${i}`, mssql.Int, id));
      totalConds.push(`m.REGION_ID IN (${regionIds.map((_, i) => `@tr${i}`).join(",")})`);
    }
    if (zones) {
      zones.forEach((id, i) => totalReq.input(`tz${i}`, mssql.Int, id));
      totalConds.push(`m.REGION_ID IN (${zones.map((_, i) => `@tz${i}`).join(",")})`);
    }
    const totalRes = await totalReq.query(
      `SELECT COUNT(*) as total FROM INFO_METER m WITH(NOLOCK) WHERE ${totalConds.join(" AND ")}`
    );
    const total = Number(totalRes.recordset[0]?.total ?? 0);

    // Đồng hồ có ≥1 bản tin trong ngày (HIS_DATA_METER.DATA_TIME) = online
    const dataReq = conn.request();
    if (dateFrom) dataReq.input("dateFrom", mssql.VarChar, dateFrom);
    if (dateTo)   dataReq.input("dateTo",   mssql.VarChar, dateTo);

    const meterSubConds: string[] = ["im.STATE = 1"];
    if (regionIds) {
      regionIds.forEach((id, i) => dataReq.input(`dr${i}`, mssql.Int, id));
      meterSubConds.push(`im.REGION_ID IN (${regionIds.map((_, i) => `@dr${i}`).join(",")})`);
    }
    if (zones) {
      zones.forEach((id, i) => dataReq.input(`dz${i}`, mssql.Int, id));
      meterSubConds.push(`im.REGION_ID IN (${zones.map((_, i) => `@dz${i}`).join(",")})`);
    }
    const meterSubWhere = `AND h.METER_NO IN (SELECT im.METER_NO FROM INFO_METER im WITH(NOLOCK) WHERE ${meterSubConds.join(" AND ")})`;

    const dateConds: string[] = [];
    if (dateFrom) dateConds.push("h.DATA_TIME >= CAST(@dateFrom AS date)");
    if (dateTo)   dateConds.push("h.DATA_TIME <  DATEADD(day,1,CAST(@dateTo AS date))");
    const dateWhere = dateConds.length ? "WHERE " + dateConds.join(" AND ") : "";

    const dataRes = await dataReq.query(`
      SELECT
        CONVERT(varchar(10), h.DATA_TIME, 120) AS day,
        COUNT(DISTINCT h.METER_NO)             AS received
      FROM HIS_DATA_METER h WITH(NOLOCK)
      ${dateWhere}
      ${meterSubWhere}
      GROUP BY CONVERT(varchar(10), h.DATA_TIME, 120)
      ORDER BY day
    `);

    const series = dataRes.recordset.map((r: any) => ({
      date:     r.day,
      received: Number(r.received),
      total,
      rate: total > 0 ? Math.round((Number(r.received) / total) * 1000) / 10 : 0
    }));

    res.json({ code: 0, message: "common.success", data: { total, series } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
