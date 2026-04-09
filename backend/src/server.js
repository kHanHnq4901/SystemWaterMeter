import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import menusRoutes from "./routes/menus.js"; // THÊM MỚI: Import Menu
import rolesRoutes from "./routes/roles.js"; // THÊM MỚI: Import Role

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
app.use("/api/auth", authRoutes); // Quản lý Đăng nhập, Refresh Token
app.use("/api/users", usersRoutes); // Quản lý CRUD Người dùng

// THÊM MỚI 2 DÒNG NÀY VÀO:
app.use("/api/roles", rolesRoutes); // Quản lý CRUD Vai trò
app.use("/api/menus", menusRoutes); // Quản lý CRUD Menu & get-async-routes

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);

  // Test database connection ngay khi khởi động
  await testConnection();
});
