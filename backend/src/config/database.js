import mssql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.DB_HOST || "DESKTOP-G171CPL",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "gelex@123",
  database: process.env.DB_NAME || "SONGDA",
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create connection pool
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
