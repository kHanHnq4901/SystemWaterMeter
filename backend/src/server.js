import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import menusRoutes from "./routes/menus.js";
import rolesRoutes from "./routes/roles.js";
import deptsRoutes from "./routes/depts.js";
import waterMetersRoutes from "./routes/water-meters.js";
import customersRoutes from "./routes/customers.js";
import invoicesRoutes from "./routes/invoices.js";
import hierarchyRoutes from "./routes/hierarchy.js";
import gatewaysRoutes from "./routes/gateways.js";
import dashboardRoutes from "./routes/dashboard.js";
import alertsRoutes from "./routes/alerts.js";
import maintenanceRoutes from "./routes/maintenance.js";

// Import database
import { testConnection } from "./config/database.js";

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

// Water Meter System APIs
app.use("/api/water-meters", waterMetersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/hierarchy", hierarchyRoutes);
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
