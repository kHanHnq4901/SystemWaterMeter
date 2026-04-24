import { Request, Response, NextFunction } from "express";
import mssql from "mssql";
import pool from "../config/database.js";

// Extend Express Request to carry user context
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userZones?: number[] | null; // null = no restriction (access all zones)
      isAdmin?: boolean;
    }
  }
}

export function getUserIdFromToken(req: Request): number | null {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const parts = token.split("_"); // AT_{ID}_{timestamp}
  if (parts.length >= 3 && parts[0] === "AT") {
    const id = parseInt(parts[1]);
    return isNaN(id) ? null : id;
  }
  return null;
}

/** Lấy danh sách REGION_ID mà user được phép truy cập.
 *  - null  → không hạn chế (admin hoặc chưa cấu hình zone)
 *  - []    → không có zone nào (bị chặn hoàn toàn — hiếm gặp)
 *  - [1,2] → chỉ xem dữ liệu thuộc các zone này
 */
export async function getUserZones(userId: number): Promise<number[] | null> {
  try {
    const conn = await pool.connect();

    // Kiểm tra user có role admin không → không giới hạn zone
    const adminCheck = await conn.request()
      .input("userId", mssql.Int, userId)
      .query(`
        SELECT TOP 1 r.CODE
        FROM SYS_ROLE r
        JOIN SYS_USER_ROLE ur ON r.ID = ur.ROLE_ID
        WHERE ur.USER_ID = @userId AND r.CODE = 'admin' AND r.STATUS = 1
      `);
    if (adminCheck.recordset.length > 0) return null; // Admin = xem tất

    // Zone từ SYS_USER_ZONE (cấp trực tiếp cho user)
    const userZoneRes = await conn.request()
      .input("userId", mssql.Int, userId)
      .query("SELECT ZONE_ID FROM SYS_USER_ZONE WHERE USER_ID = @userId");

    // Zone từ SYS_ROLE_REGION (cấp qua role)
    const roleZoneRes = await conn.request()
      .input("userId", mssql.Int, userId)
      .query(`
        SELECT DISTINCT rr.REGION_ID
        FROM SYS_ROLE_REGION rr
        JOIN SYS_USER_ROLE ur ON rr.ROLE_ID = ur.ROLE_ID
        WHERE ur.USER_ID = @userId
      `);

    const merged = [
      ...userZoneRes.recordset.map((r: any) => Number(r.ZONE_ID)),
      ...roleZoneRes.recordset.map((r: any) => Number(r.REGION_ID))
    ];
    const unique = [...new Set(merged)];

    // Không cấu hình zone nào → không hạn chế
    return unique.length > 0 ? unique : null;
  } catch (err) {
    console.warn("[zoneAuth] Không thể đọc zone của user, mặc định cho qua:", err);
    return null;
  }
}

/** Middleware: gắn userId + userZones vào request. Dùng cho các route dữ liệu. */
export async function zoneAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });

  req.userId = userId;
  req.userZones = await getUserZones(userId);
  next();
}

/** Build mệnh đề SQL IN cho zone IDs và gắn params vào request object.
 *  Trả về chuỗi điều kiện để chèn vào WHERE, hoặc "" nếu không hạn chế. */
export function buildZoneFilter(
  req: Request,
  sqlReq: mssql.Request,
  column: string
): string {
  const zones = req.userZones;
  if (!zones) return ""; // Không hạn chế

  if (zones.length === 0) return "1=0"; // Không có zone nào → chặn tất cả

  zones.forEach((id, i) => sqlReq.input(`zone_${i}`, mssql.Int, id));
  const placeholders = zones.map((_, i) => `@zone_${i}`).join(", ");
  return `${column} IN (${placeholders})`;
}
