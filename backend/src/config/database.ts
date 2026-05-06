import mssql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.DB_HOST || "DESKTOP-G171CPL",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "gelex@123",
  database: process.env.DB_NAME || "WS02",
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  requestTimeout:    60_000,   // 60s — đủ cho query nặng
  connectionTimeout: 15_000,   // 15s
  pool: {
    max: 20,                   // tăng từ 10 → 20 để xử lý parallel queries
    min: 2,                    // giữ sẵn 2 connection, tránh cold-start
    idleTimeoutMillis: 30_000,
    acquireTimeoutMillis: 15_000
  }
};

const pool = new mssql.ConnectionPool(config);

export const testConnection = async () => {
  try {
    await pool.connect();
    console.log("✅ Database connected successfully!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

export default pool;
