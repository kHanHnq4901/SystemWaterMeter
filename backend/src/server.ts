import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes         from "./routes/auth.ts";
import usersRoutes        from "./routes/users.ts";
import menusRoutes        from "./routes/menus.ts";
import rolesRoutes        from "./routes/roles.ts";
import deptsRoutes        from "./routes/depts.ts";
import regionsRoutes      from "./routes/regions.ts";
import waterMetersRoutes  from "./routes/water-meters.ts";
import modelsRoutes       from "./routes/models.ts";
import customersRoutes    from "./routes/customers.ts";
import invoicesRoutes     from "./routes/invoices.ts";
import hierarchyRoutes    from "./routes/hierarchy.ts";
import gatewaysRoutes     from "./routes/gateways.ts";
import dashboardRoutes    from "./routes/dashboard.ts";
import alertsRoutes       from "./routes/alerts.ts";
import maintenanceRoutes  from "./routes/maintenance.ts";
import logsRoutes         from "./routes/logs.ts";
import reportVolumeRoutes from "./routes/report-volume.ts";

import { testConnection } from "./config/database.ts";
import { cache }          from "./config/cache.ts";
import { startStatsWorker, stopStatsWorker } from "./workers/statsWorker.ts";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());

// Gzip/Brotli tất cả JSON responses — giảm ~70% bandwidth
app.use(compression());

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Routes ────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ message: "Vue Pure Admin API", version: "2.0.0", status: "running" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth",          authRoutes);
app.use("/api/users",         usersRoutes);
app.use("/api/roles",         rolesRoutes);
app.use("/api/menus",         menusRoutes);
app.use("/api/depts",         deptsRoutes);
app.use("/api/regions",       regionsRoutes);
app.use("/api/water-meters",  waterMetersRoutes);
app.use("/api/models",        modelsRoutes);
app.use("/api/customers",     customersRoutes);
app.use("/api/invoices",      invoicesRoutes);
app.use("/api/gateways",      gatewaysRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/alerts",        alertsRoutes);
app.use("/api/maintenance",   maintenanceRoutes);
app.use("/api/logs",          logsRoutes);
app.use("/api/hierarchy",     hierarchyRoutes);
app.use("/api/report-volume", reportVolumeRoutes);

// ── Bootstrap ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // 1. Kiểm tra DB connection
  await testConnection();

  // 2. Thử kết nối Redis (không bắt buộc — tự fallback sang memory)
  try {
    const { default: Redis } = await import("ioredis") as any;
    cache.init(new Redis({
      host:                 process.env.REDIS_HOST     || "127.0.0.1",
      port:                 Number(process.env.REDIS_PORT) || 6379,
      password:             process.env.REDIS_PASSWORD || undefined,
      lazyConnect:          true,
      connectTimeout:       3_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue:   false,
      retryStrategy:        () => null,  // không retry — tự fallback
    }));
  } catch {
    console.log("ℹ️  ioredis not available — using in-memory cache");
  }

  // 3. Khởi động background worker tính dashboard stats mỗi 30s
  startStatsWorker();
});

// Graceful shutdown
process.on("SIGTERM", () => { stopStatsWorker(); process.exit(0); });
process.on("SIGINT",  () => { stopStatsWorker(); process.exit(0); });
