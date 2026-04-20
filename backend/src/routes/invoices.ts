import express from "express";
import pool from "../config/database.js";

const router = express.Router();

// GET /api/invoices/stats/summary - Get billing statistics (derived from HIS_INSTANT_METER readings)
router.get("/stats/summary", async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request().query(`
      SELECT
        COUNT(DISTINCT METER_NO) as totalMeters,
        COUNT(*) as totalReadings,
        MAX(CREATED) as lastReading,
        AVG(CAST(REALTIME as float)) as avgReading
      FROM HIS_INSTANT_METER
      WHERE CREATED >= DATEADD(month, -1, GETDATE())
    `);

    res.json({
      success: true,
      data: {
        overall: {
          totalInvoices: 0,
          totalAmount: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          paidAmount: 0,
          pendingAmount: 0
        },
        monthly: {
          totalInvoices: 0,
          totalAmount: 0,
          collectedAmount: 0
        },
        readings: result.recordset[0]
      }
    });
  } catch (error) {
    console.error("Get billing stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices - List (no invoice table in DB — returns empty)
router.get("/", async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  res.json({
    success: true,
    data: {
      list: [],
      total: 0,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    }
  });
});

// GET /api/invoices/:id - Single invoice (not available)
router.get("/:id", async (req, res) => {
  res.status(404).json({ success: false, message: "Chức năng hóa đơn chưa được triển khai" });
});

export default router;
