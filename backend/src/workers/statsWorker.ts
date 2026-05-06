/**
 * Stats Worker — chạy ngầm, tính toán dashboard stats định kỳ.
 * Lưu kết quả vào cache → dashboard API chỉ đọc cache (không hit DB mỗi request).
 * Emit "dashboard:update" để SSE endpoint đẩy realtime tới tất cả clients.
 */
import pool from "../config/database.js";
import { cache } from "../config/cache.js";

export const STATS_CACHE_KEY = "dashboard:stats";
const CACHE_TTL_MS  = 90_000;   // 90s TTL — dài hơn interval để tránh cache miss
const PUSH_INTERVAL = 30_000;   // push mỗi 30s

let _worker: ReturnType<typeof setInterval> | null = null;

export async function computeDashboardStats(): Promise<any> {
  const connection = await pool.connect();

  // 7 query chạy song song
  const [
    meterStats,
    gatewayStats,
    monthlyEvents,
    collectionRate,
    meterTypeStats,
    onlineTrend,
    meterOnline
  ] = await Promise.all([

    connection.request().query(`
      SELECT
        COUNT(*)                                          as total,
        SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END)       as active,
        SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END)       as notInstalled,
        SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END)       as broken,
        SUM(CASE WHEN STATE = 3 THEN 1 ELSE 0 END)       as removed
      FROM INFO_METER WITH(NOLOCK)
    `),

    connection.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN LASTTIME_CONNECT >= DATEADD(hour,-24,GETDATE()) THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN LASTTIME_CONNECT <  DATEADD(hour,-24,GETDATE()) OR LASTTIME_CONNECT IS NULL THEN 1 ELSE 0 END) as offline
      FROM INFO_GATEWAY WITH(NOLOCK)
    `),

    // Sargable range thay vì YEAR()/MONTH() — dùng được index
    connection.request().query(`
      SELECT COUNT(*) as count
      FROM HIS_INSTANT_METER WITH(NOLOCK)
      WHERE CREATED >= DATEADD(month, DATEDIFF(month,0,GETDATE()), 0)
        AND CREATED <  DATEADD(month, DATEDIFF(month,0,GETDATE())+1, 0)
    `),

    connection.request().query(`
      SELECT
        CASE WHEN total = 0 THEN 0
             ELSE CAST(online * 100.0 / total AS DECIMAL(5,1))
        END as rate
      FROM (
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN lastSeen >= DATEADD(hour,-24,GETDATE()) THEN 1 ELSE 0 END) as online
        FROM (
          SELECT m.METER_NO, MAX(d.DATA_TIME) as lastSeen
          FROM INFO_METER m WITH(NOLOCK)
          LEFT JOIN HIS_DATA_METER d WITH(NOLOCK) ON m.METER_NO = d.METER_NO
          GROUP BY m.METER_NO
        ) t
      ) s
    `),

    connection.request().query(`
      SELECT ISNULL(CAST(METER_TYPE as VARCHAR),'N/A') as meterType, COUNT(*) as count
      FROM INFO_METER WITH(NOLOCK)
      GROUP BY METER_TYPE
      ORDER BY count DESC
    `),

    // Sargable: range thay vì CAST(DATA_TIME AS DATE) — dùng được index
    connection.request().query(`
      SELECT
        CONVERT(varchar(10), d.day, 120) as day,
        CAST(
          COUNT(DISTINCT h.METER_NO) * 100.0
          / NULLIF((SELECT COUNT(*) FROM INFO_METER WITH(NOLOCK) WHERE STATE = 1), 0)
          AS DECIMAL(5,1)
        ) as rate
      FROM (
        SELECT CAST(DATEADD(day,-n,CAST(GETDATE() AS DATE)) AS DATE) as day
        FROM (VALUES
          (0),(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),
          (15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25),(26),(27),(28),(29)
        ) t(n)
      ) d
      LEFT JOIN HIS_DATA_METER h WITH(NOLOCK)
        ON h.DATA_TIME >= d.day AND h.DATA_TIME < DATEADD(day,1,d.day)
      GROUP BY d.day
      ORDER BY d.day
    `),

    connection.request().query(`
      SELECT
        ISNULL(SUM(CASE WHEN lastSeen >= DATEADD(hour,-24,GETDATE()) THEN 1 ELSE 0 END), 0) as onlineCount,
        ISNULL(SUM(CASE WHEN lastSeen IS NULL OR lastSeen < DATEADD(hour,-24,GETDATE()) THEN 1 ELSE 0 END), 0) as offlineCount
      FROM (
        SELECT m.METER_NO, MAX(d.DATA_TIME) as lastSeen
        FROM INFO_METER m WITH(NOLOCK)
        LEFT JOIN HIS_DATA_METER d WITH(NOLOCK) ON m.METER_NO = d.METER_NO
        GROUP BY m.METER_NO
      ) t
    `)
  ]);

  const data = {
    meters:         meterStats.recordset[0],
    gateways:       gatewayStats.recordset[0],
    monthlyEvents:  monthlyEvents.recordset[0].count,
    collectionRate: Number(collectionRate.recordset[0]?.rate ?? 0),
    meterTypeStats: meterTypeStats.recordset,
    meterOnline:    meterOnline.recordset[0],
    onlineTrend:    onlineTrend.recordset
  };

  // Lưu cache → SSE endpoint đọc + emit event để push tới clients
  await cache.set(STATS_CACHE_KEY, data, CACHE_TTL_MS);
  cache.emit("dashboard:update", data);

  return data;
}

export function startStatsWorker(): void {
  if (_worker) return;
  // Chạy ngay lập tức lần đầu
  computeDashboardStats().catch(e => console.error("[StatsWorker] error:", e));
  // Sau đó mỗi 30s
  _worker = setInterval(
    () => computeDashboardStats().catch(e => console.error("[StatsWorker] error:", e)),
    PUSH_INTERVAL
  );
  console.log(`✅ Stats worker started — pushing every ${PUSH_INTERVAL / 1000}s`);
}

export function stopStatsWorker(): void {
  if (_worker) { clearInterval(_worker); _worker = null; }
}
