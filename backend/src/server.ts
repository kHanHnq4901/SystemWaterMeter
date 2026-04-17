import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.ts";
import usersRoutes from "./routes/users.ts";
import menusRoutes from "./routes/menus.ts";
import rolesRoutes from "./routes/roles.ts";
import deptsRoutes from "./routes/depts.ts";
import regionsRoutes from "./routes/regions.ts";

import waterMetersRoutes from "./routes/water-meters.ts";
import customersRoutes from "./routes/customers.ts";
import invoicesRoutes from "./routes/invoices.ts";
import hierarchyRoutes from "./routes/hierarchy.ts";
import gatewaysRoutes from "./routes/gateways.ts";
import dashboardRoutes from "./routes/dashboard.ts";
import alertsRoutes from "./routes/alerts.ts";
import maintenanceRoutes from "./routes/maintenance.ts";

// Import database
import { testConnection } from "./config/database.ts";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Vue Pure Admin API",
    version: "1.0.0",
    status: "running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// API Routes - chia theo module
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/depts", deptsRoutes);
app.use("/api/regions", regionsRoutes);
// Water Meter System APIs
app.use("/api/water-meters", waterMetersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/gateways", gatewaysRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);

  // Test database connection ngay khi khởi động
  await testConnection();
});
