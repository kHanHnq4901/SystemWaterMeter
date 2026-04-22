import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/hierarchy/tree — Cây đơn vị phân cấp
router.get("/tree", async (_req: Request, res: Response) => {
  try {
    const conn = await pool.connect();
    const result = await conn.request().query(`
      SELECT
        UNIT_ID    as id,
        UNIT_NAME  as name,
        PARENT_ID  as parentId,
        UNIT_TYPE  as unitType,
        UNIT_CODE  as unitCode
      FROM SYS_UNIT
      ORDER BY PARENT_ID, UNIT_ID
    `);
    // Build tree structure
    const rows = result.recordset as any[];
    const map = new Map<number, any>();
    rows.forEach(r => map.set(r.id, { ...r, children: [] }));
    const roots: any[] = [];
    rows.forEach(r => {
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId).children.push(map.get(r.id));
      } else {
        roots.push(map.get(r.id));
      }
    });
    res.json({ code: 0, message: "common.success", data: roots });
  } catch {
    res.json({ code: 0, message: "common.success", data: [] });
  }
});

// GET /api/hierarchy/units/:id
router.get("/units/:id", async (req: Request, res: Response) => {
  try {
    const conn = await pool.connect();
    const result = await conn.request()
      .input("id", mssql.Int, Number(req.params.id))
      .query("SELECT * FROM SYS_UNIT WHERE UNIT_ID = @id");
    res.json({ code: 0, message: "common.success", data: result.recordset[0] ?? null });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// POST /api/hierarchy/units
router.post("/units", async (req: Request, res: Response) => {
  try {
    const { name, parentId, unitType, unitCode } = req.body;
    const conn = await pool.connect();
    await conn.request()
      .input("name",     mssql.NVarChar, name || "")
      .input("parentId", mssql.Int,      parentId ?? null)
      .input("unitType", mssql.VarChar,  unitType || "")
      .input("unitCode", mssql.VarChar,  unitCode || "")
      .query("INSERT INTO SYS_UNIT (UNIT_NAME, PARENT_ID, UNIT_TYPE, UNIT_CODE) VALUES (@name, @parentId, @unitType, @unitCode)");
    res.json({ code: 0, message: "common.createSuccess" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// PUT /api/hierarchy/units/:id
router.put("/units/:id", async (req: Request, res: Response) => {
  try {
    const { name, unitType, unitCode } = req.body;
    const conn = await pool.connect();
    await conn.request()
      .input("id",       mssql.Int,      Number(req.params.id))
      .input("name",     mssql.NVarChar, name || "")
      .input("unitType", mssql.VarChar,  unitType || "")
      .input("unitCode", mssql.VarChar,  unitCode || "")
      .query("UPDATE SYS_UNIT SET UNIT_NAME=@name, UNIT_TYPE=@unitType, UNIT_CODE=@unitCode WHERE UNIT_ID=@id");
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// DELETE /api/hierarchy/units/:id
router.delete("/units/:id", async (req: Request, res: Response) => {
  try {
    const conn = await pool.connect();
    await conn.request()
      .input("id", mssql.Int, Number(req.params.id))
      .query("DELETE FROM SYS_UNIT WHERE UNIT_ID = @id");
    res.json({ code: 0, message: "common.deleteSuccess" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// POST /api/hierarchy/provinces|districts|wards|zones|clusters — stub
const stubInsert = async (req: Request, res: Response) => {
  res.json({ code: 0, message: "common.createSuccess" });
};
router.post("/provinces", stubInsert);
router.post("/districts", stubInsert);
router.post("/wards",     stubInsert);
router.post("/zones",     stubInsert);
router.post("/clusters",  stubInsert);

export default router;
