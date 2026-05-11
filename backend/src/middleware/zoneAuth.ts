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

    // Zone từ SYS_USER_ZONE → convert sang REGION_ID qua SYS_REGION.ZONE_ID
    // (SYS_USER_ZONE.ZONE_ID là ID của SYS_ZONE, không phải SYS_REGION.ID)
    const userZoneRes = await conn.request()
      .input("userId", mssql.Int, userId)
      .query(`
        SELECT DISTINCT sr.ID as REGION_ID
        FROM SYS_USER_ZONE uz
        JOIN SYS_REGION sr ON sr.ZONE_ID = uz.ZONE_ID AND sr.DEL_FLAG = 0
        WHERE uz.USER_ID = @userId
      `);

    // Zone từ SYS_ROLE_REGION (cấp qua role — đây đã là REGION_ID trực tiếp)
    const roleZoneRes = await conn.request()
      .input("userId", mssql.Int, userId)
      .query(`
        SELECT DISTINCT rr.REGION_ID
        FROM SYS_ROLE_REGION rr
        JOIN SYS_USER_ROLE ur ON rr.ROLE_ID = ur.ROLE_ID
        WHERE ur.USER_ID = @userId
      `);

    const merged = [
      ...userZoneRes.recordset.map((r: any) => Number(r.REGION_ID)),
      ...roleZoneRes.recordset.map((r: any) => Number(r.REGION_ID))
    ];
    const unique = [...new Set(merged)];

    // Không cấu hình zone nào → không hạn chế
    if (unique.length === 0) return null;

    // Expand: thêm tất cả region con (descendant) của các vùng được gán
    // để filter đúng khi user được gán vào region cha
    const expandReq = conn.request();
    unique.forEach((id, i) => expandReq.input(`z${i}`, mssql.Int, id));
    const inClause = unique.map((_, i) => `@z${i}`).join(", ");
    const expandRes = await expandReq.query(`
      WITH BaseZones AS (
        SELECT ID FROM SYS_REGION WHERE ID IN (${inClause}) AND DEL_FLAG = 0
      ),
      RegionCTE AS (
        SELECT ID FROM BaseZones
        UNION ALL
        SELECT r.ID FROM SYS_REGION r
        JOIN RegionCTE rc ON r.PARENT_ID = rc.ID
        WHERE r.DEL_FLAG = 0
      )
      SELECT DISTINCT ID FROM RegionCTE
    `);
    return expandRes.recordset.map((r: any) => Number(r.ID));
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
