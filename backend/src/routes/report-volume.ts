import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// ============================================================================
// GET /list
// ============================================================================
router.get("/list", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        r.RPT_ID,
        r.NAME,
        r.CREATED,
        r.USER_ID,
        r.START_DATE,
        r.PERIOD_NUM,
        r.TIME_RECORD,
        COUNT(DISTINCT g.GROUP_ID)  AS GROUP_COUNT,
        COUNT(DISTINCT gm.METER_NO) AS METER_COUNT
      FROM RPT_VOLUME r WITH(NOLOCK)
      LEFT JOIN RPT_VOLUME_GROUP g WITH(NOLOCK) ON g.RPT_ID = r.RPT_ID
      LEFT JOIN RPT_VOLUME_GROUP_METER gm WITH(NOLOCK) ON gm.GROUP_ID = g.GROUP_ID
      GROUP BY r.RPT_ID, r.NAME, r.CREATED, r.USER_ID, r.START_DATE, r.PERIOD_NUM, r.TIME_RECORD
      ORDER BY r.CREATED DESC
    `);
    res.json({ code: 0, message: "common.success", data: result.recordset });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// POST /add
// ============================================================================
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { name, startDate, periodNum, timeRecord } = req.body;
    const connection = await pool.connect();
    const result = await connection.request()
      .input("name",       mssql.NVarChar, name)
      .input("startDate",  mssql.Date,     startDate)
      .input("periodNum",  mssql.Int,      Number(periodNum))
      .input("timeRecord", mssql.VarChar,  timeRecord)
      .input("created",    mssql.DateTime, new Date())
      .query(`
        INSERT INTO RPT_VOLUME (NAME, CREATED, START_DATE, PERIOD_NUM, TIME_RECORD)
        OUTPUT INSERTED.RPT_ID
        VALUES (@name, @created, @startDate, @periodNum, @timeRecord)
      `);
    res.json({ code: 0, message: "common.success", data: { rptId: result.recordset[0].RPT_ID } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// PUT /update/:id
// ============================================================================
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const { name, startDate, periodNum, timeRecord } = req.body;
    const connection = await pool.connect();
    await connection.request()
      .input("rptId",      mssql.Int,      Number(req.params.id))
      .input("name",       mssql.NVarChar, name)
      .input("startDate",  mssql.Date,     startDate)
      .input("periodNum",  mssql.Int,      Number(periodNum))
      .input("timeRecord", mssql.VarChar,  timeRecord)
      .query(`
        UPDATE RPT_VOLUME
        SET NAME=@name, START_DATE=@startDate, PERIOD_NUM=@periodNum, TIME_RECORD=@timeRecord
        WHERE RPT_ID=@rptId
      `);
    res.json({ code: 0, message: "common.success" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// DELETE /delete/:id — cascade (sequential: meters → groups → report)
// ============================================================================
router.delete("/delete/:id", async (req: Request, res: Response) => {
  try {
    const rptId = Number(req.params.id);
    const connection = await pool.connect();
    await connection.request().input("rptId", mssql.Int, rptId).query(`
      DELETE gm
      FROM RPT_VOLUME_GROUP_METER gm
      INNER JOIN RPT_VOLUME_GROUP g ON g.GROUP_ID = gm.GROUP_ID
      WHERE g.RPT_ID = @rptId
    `);
    await connection.request().input("rptId", mssql.Int, rptId)
      .query(`DELETE FROM RPT_VOLUME_GROUP WHERE RPT_ID = @rptId`);
    await connection.request().input("rptId", mssql.Int, rptId)
      .query(`DELETE FROM RPT_VOLUME WHERE RPT_ID = @rptId`);
    res.json({ code: 0, message: "common.success" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// GET /:rptId/detail — groups + meters fetched in parallel
// ============================================================================
router.get("/:rptId/detail", async (req: Request, res: Response) => {
  try {
    const rptId = Number(req.params.rptId);
    const connection = await pool.connect();

    const rptResult = await connection.request()
      .input("rptId", mssql.Int, rptId)
      .query(`SELECT * FROM RPT_VOLUME WITH(NOLOCK) WHERE RPT_ID = @rptId`);

    if (rptResult.recordset.length === 0) {
      return res.status(404).json({ code: 404, message: "Not found" });
    }
    const rpt = rptResult.recordset[0];

    const [groupResult, meterResult] = await Promise.all([
      connection.request()
        .input("rptId", mssql.Int, rptId)
        .query(`SELECT * FROM RPT_VOLUME_GROUP WITH(NOLOCK) WHERE RPT_ID = @rptId ORDER BY GROUP_ID`),
      connection.request()
        .input("rptId", mssql.Int, rptId)
        .query(`
          SELECT gm.GROUP_ID, gm.METER_NO, gm.ORDER_NO, m.METER_NAME, m.STATE
          FROM RPT_VOLUME_GROUP_METER gm WITH(NOLOCK)
          INNER JOIN RPT_VOLUME_GROUP g WITH(NOLOCK) ON g.GROUP_ID = gm.GROUP_ID
          LEFT JOIN INFO_METER m WITH(NOLOCK) ON m.METER_NO = gm.METER_NO
          WHERE g.RPT_ID = @rptId
          ORDER BY gm.GROUP_ID, gm.ORDER_NO
        `)
    ]);

    const meterRows = meterResult.recordset;
    const groupsWithMeters = groupResult.recordset.map((g: any) => ({
      groupId: g.GROUP_ID,
      name: g.NAME,
      created: g.CREATED,
      meters: meterRows
        .filter((m: any) => m.GROUP_ID === g.GROUP_ID)
        .map((m: any) => ({ meterNo: m.METER_NO, meterName: m.METER_NAME, state: m.STATE, orderNo: m.ORDER_NO }))
    }));

    res.json({
      code: 0, message: "common.success",
      data: {
        rptId: rpt.RPT_ID, name: rpt.NAME, startDate: rpt.START_DATE,
        periodNum: rpt.PERIOD_NUM, timeRecord: rpt.TIME_RECORD, created: rpt.CREATED,
        groups: groupsWithMeters
      }
    });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// POST /group/add
// ============================================================================
router.post("/group/add", async (req: Request, res: Response) => {
  try {
    const { rptId, name } = req.body;
    const connection = await pool.connect();
    const result = await connection.request()
      .input("rptId",   mssql.Int,      Number(rptId))
      .input("name",    mssql.NVarChar, name)
      .input("created", mssql.DateTime, new Date())
      .query(`
        INSERT INTO RPT_VOLUME_GROUP (RPT_ID, NAME, CREATED)
        OUTPUT INSERTED.GROUP_ID
        VALUES (@rptId, @name, @created)
      `);
    res.json({ code: 0, message: "common.success", data: { groupId: result.recordset[0].GROUP_ID } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// PUT /group/update/:id
// ============================================================================
router.put("/group/update/:id", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const connection = await pool.connect();
    await connection.request()
      .input("groupId", mssql.Int,      Number(req.params.id))
      .input("name",    mssql.NVarChar, name)
      .query(`UPDATE RPT_VOLUME_GROUP SET NAME=@name WHERE GROUP_ID=@groupId`);
    res.json({ code: 0, message: "common.success" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// DELETE /group/delete/:id
// ============================================================================
router.delete("/group/delete/:id", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const connection = await pool.connect();
    await connection.request().input("groupId", mssql.Int, groupId)
      .query(`DELETE FROM RPT_VOLUME_GROUP_METER WHERE GROUP_ID = @groupId`);
    await connection.request().input("groupId", mssql.Int, groupId)
      .query(`DELETE FROM RPT_VOLUME_GROUP WHERE GROUP_ID = @groupId`);
    res.json({ code: 0, message: "common.success" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// POST /group/:groupId/meter/add — batch insert (1 query instead of N loops)
// ============================================================================
router.post("/group/:groupId/meter/add", async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const { meterNos } = req.body as { meterNos: string[] };

    if (!Array.isArray(meterNos) || meterNos.length === 0) {
      return res.json({ code: 0, message: "common.success", data: { added: 0 } });
    }

    const connection = await pool.connect();

    // Fetch existing meters and current max ORDER_NO in parallel
    const [existResult, maxResult] = await Promise.all([
      connection.request()
        .input("groupId", mssql.Int, groupId)
        .query(`SELECT METER_NO FROM RPT_VOLUME_GROUP_METER WITH(NOLOCK) WHERE GROUP_ID = @groupId`),
      connection.request()
        .input("groupId", mssql.Int, groupId)
        .query(`SELECT ISNULL(MAX(ORDER_NO), 0) as maxOrder FROM RPT_VOLUME_GROUP_METER WITH(NOLOCK) WHERE GROUP_ID = @groupId`)
    ]);

    const existingSet = new Set(existResult.recordset.map((r: any) => r.METER_NO));
    const newMeters = meterNos.filter(m => !existingSet.has(m));

    if (newMeters.length === 0) {
      return res.json({ code: 0, message: "common.success", data: { added: 0 } });
    }

    let nextOrder: number = maxResult.recordset[0].maxOrder + 1;
    const insertReq = connection.request().input("groupId", mssql.Int, groupId);
    const rows = newMeters.map((meterNo, i) => {
      insertReq.input(`meterNo${i}`, mssql.VarChar, meterNo);
      insertReq.input(`orderNo${i}`, mssql.Int,     nextOrder + i);
      return `(@meterNo${i}, @groupId, @orderNo${i})`;
    });
    await insertReq.query(
      `INSERT INTO RPT_VOLUME_GROUP_METER (METER_NO, GROUP_ID, ORDER_NO) VALUES ${rows.join(", ")}`
    );

    res.json({ code: 0, message: "common.success", data: { added: newMeters.length } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// DELETE /group/:groupId/meter/remove
// ============================================================================
router.delete("/group/:groupId/meter/remove", async (req: Request, res: Response) => {
  try {
    const { meterNo } = req.body as { meterNo: string };
    const connection = await pool.connect();
    await connection.request()
      .input("groupId", mssql.Int,     Number(req.params.groupId))
      .input("meterNo", mssql.VarChar, meterNo)
      .query(`DELETE FROM RPT_VOLUME_GROUP_METER WHERE GROUP_ID=@groupId AND METER_NO=@meterNo`);
    res.json({ code: 0, message: "common.success" });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// POST /:rptId/calculate — groups + meters fetched in parallel after rpt check
// ============================================================================
router.post("/:rptId/calculate", async (req: Request, res: Response) => {
  try {
    const rptId = Number(req.params.rptId);
    const connection = await pool.connect();

    const rptResult = await connection.request()
      .input("rptId", mssql.Int, rptId)
      .query(`SELECT * FROM RPT_VOLUME WITH(NOLOCK) WHERE RPT_ID = @rptId`);

    if (rptResult.recordset.length === 0) {
      return res.status(404).json({ code: 404, message: "Report not found" });
    }
    const rpt = rptResult.recordset[0];

    // Calculate date range
    const startDate  = new Date(rpt.START_DATE);
    const periodNum  = Number(rpt.PERIOD_NUM);
    const timeRecord = rpt.TIME_RECORD as string;

    const endDate = new Date(startDate);
    if (timeRecord === "MONTH")     endDate.setMonth(endDate.getMonth() + periodNum);
    else if (timeRecord === "DAY")  endDate.setDate(endDate.getDate() + periodNum);
    else if (timeRecord === "YEAR") endDate.setFullYear(endDate.getFullYear() + periodNum);

    const dateFrom = startDate.toISOString().slice(0, 10);
    const dateTo   = new Date(endDate.getTime() - 86400000).toISOString().slice(0, 10);

    // Groups + meters in parallel
    const [groupResult, meterResult] = await Promise.all([
      connection.request()
        .input("rptId", mssql.Int, rptId)
        .query(`SELECT * FROM RPT_VOLUME_GROUP WITH(NOLOCK) WHERE RPT_ID = @rptId ORDER BY GROUP_ID`),
      connection.request()
        .input("rptId", mssql.Int, rptId)
        .query(`
          SELECT gm.GROUP_ID, gm.METER_NO, gm.ORDER_NO, m.METER_NAME
          FROM RPT_VOLUME_GROUP_METER gm WITH(NOLOCK)
          INNER JOIN RPT_VOLUME_GROUP g WITH(NOLOCK) ON g.GROUP_ID = gm.GROUP_ID
          LEFT JOIN INFO_METER m WITH(NOLOCK) ON m.METER_NO = gm.METER_NO
          WHERE g.RPT_ID = @rptId
          ORDER BY gm.GROUP_ID, gm.ORDER_NO
        `)
    ]);

    const groups      = groupResult.recordset;
    const allMeterRows = meterResult.recordset;
    const allMeterNos  = [...new Set(allMeterRows.map((m: any) => m.METER_NO as string))];

    if (allMeterNos.length === 0) {
      return res.json({
        code: 0, message: "common.success",
        data: {
          rpt, periods: [],
          groups: groups.map((g: any) => ({
            groupId: g.GROUP_ID, groupName: g.NAME, meterNos: [], periodTotals: {}, total: 0
          })),
          grandTotal: 0
        }
      });
    }

    // Period expression (sargable)
    let periodExpr: string;
    if (timeRecord === "MONTH")     periodExpr = `FORMAT(DATA_TIME, 'yyyy-MM')`;
    else if (timeRecord === "DAY")  periodExpr = `CONVERT(varchar(10), DATA_TIME, 120)`;
    else                            periodExpr = `FORMAT(DATA_TIME, 'yyyy')`;

    const placeholders = allMeterNos.map((_: string, i: number) => `@meter${i}`).join(", ");

    const calcReq = connection.request()
      .input("dateFrom", mssql.VarChar, dateFrom)
      .input("dateTo",   mssql.VarChar, dateTo);
    allMeterNos.forEach((meterNo: string, i: number) => calcReq.input(`meter${i}`, mssql.VarChar, meterNo));

    const calcResult = await calcReq.query(`
      SELECT
        METER_NO,
        ${periodExpr} AS period,
        MAX(ISNULL(CAST(ACTIVE_TOTAL AS float), 0)) - MIN(ISNULL(CAST(ACTIVE_TOTAL AS float), 0)) AS consumption
      FROM HIS_DATA_METER WITH(NOLOCK)
      WHERE METER_NO IN (${placeholders})
        AND DATA_TIME >= @dateFrom
        AND DATA_TIME < DATEADD(day, 1, CAST(@dateTo AS date))
      GROUP BY METER_NO, ${periodExpr}
      ORDER BY period, METER_NO
    `);

    const calcRows = calcResult.recordset;

    // Build lookup: meterNo → period → consumption
    const lookup: Record<string, Record<string, number>> = {};
    for (const row of calcRows) {
      if (!lookup[row.METER_NO]) lookup[row.METER_NO] = {};
      lookup[row.METER_NO][row.period] = row.consumption;
    }

    const periodSet = new Set<string>();
    for (const row of calcRows) periodSet.add(row.period);
    const periods = Array.from(periodSet).sort();

    let grandTotal = 0;
    const resultGroups = groups.map((g: any) => {
      const groupMeters = allMeterRows
        .filter((m: any) => m.GROUP_ID === g.GROUP_ID)
        .map((m: any) => ({ meterNo: m.METER_NO, meterName: m.METER_NAME }));

      const periodTotals: Record<string, number> = {};
      let total = 0;
      for (const period of periods) {
        let sum = 0;
        for (const meter of groupMeters) sum += lookup[meter.meterNo]?.[period] ?? 0;
        periodTotals[period] = sum;
        total += sum;
      }
      grandTotal += total;
      return { groupId: g.GROUP_ID, groupName: g.NAME, meterNos: groupMeters, periodTotals, total };
    });

    res.json({ code: 0, message: "common.success", data: { rpt, periods, groups: resultGroups, grandTotal } });
  } catch (error: any) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;
