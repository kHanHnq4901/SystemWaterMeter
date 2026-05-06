/**
 * Dashboard routes:
 *   GET /api/dashboard/stats  — đọc từ cache (không hit DB)
 *   GET /api/dashboard/stream — SSE: server push realtime mỗi 30s
 *   POST /api/dashboard/refresh — force recompute ngay lập tức
 */
import express from "express";
import type { Response } from "express";
import { cache } from "../config/cache.js";
import { computeDashboardStats, STATS_CACHE_KEY } from "../workers/statsWorker.js";

const router = express.Router();

// Quản lý danh sách SSE clients đang kết nối
const sseClients = new Set<Response>();

// ── REST: đọc từ cache, không bao giờ hit DB trực tiếp ────────────
router.get("/stats", async (_req, res) => {
  try {
    const cached = await cache.get(STATS_CACHE_KEY);
    if (cached) return res.json({ code: 0, data: cached });

    // Cache miss (khởi động lần đầu) — compute on demand
    const data = await computeDashboardStats();
    res.json({ code: 0, data });
  } catch (e: any) {
    console.error("Dashboard /stats error:", e);
    res.status(500).json({ code: 500, message: e.message });
  }
});

// ── SSE: push realtime khi worker cập nhật ─────────────────────────
router.get("/stream", async (req, res) => {
  // Headers chuẩn SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");  // tắt nginx buffering
  res.flushHeaders();

  // Gửi dữ liệu hiện tại ngay khi client kết nối
  const current = await cache.get(STATS_CACHE_KEY);
  if (current) {
    res.write(`data: ${JSON.stringify(current)}\n\n`);
  }

  // Keepalive comment mỗi 20s — tránh proxy/firewall ngắt kết nối
  const keepalive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { cleanup(); }
  }, 20_000);

  sseClients.add(res);

  function cleanup() {
    clearInterval(keepalive);
    sseClients.delete(res);
  }
  req.on("close", cleanup);
});

// ── Force refresh: dùng cho nút "Làm mới ngay" ───────────────────
router.post("/refresh", async (_req, res) => {
  try {
    const data = await computeDashboardStats();
    res.json({ code: 0, data });
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

// ── Worker emits → push tới tất cả SSE clients ────────────────────
cache.on("dashboard:update", (data: any) => {
  if (sseClients.size === 0) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of [...sseClients]) {
    try { client.write(msg); }
    catch { sseClients.delete(client); }
  }
});

export default router;
