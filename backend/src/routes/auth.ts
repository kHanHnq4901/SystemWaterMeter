import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import crypto from "crypto";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────
async function getLocation(ip: string): Promise<string> {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Mạng nội bộ";
  }
  return new Promise(resolve => {
    const cleanIp = ip.replace(/^::ffff:/, "");
    const url = `http://ip-api.com/json/${cleanIp}?lang=vi&fields=status,country,regionName,city`;
    const req = http.get(url, { timeout: 3000 }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.status === "success") {
            const parts = [json.city, json.regionName, json.country].filter(Boolean);
            resolve(parts.join(", ") || "Không xác định");
          } else {
            resolve("Không xác định");
          }
        } catch {
          resolve("Không xác định");
        }
      });
    });
    req.on("error", () => resolve("Không xác định"));
    req.on("timeout", () => { req.destroy(); resolve("Không xác định"); });
  });
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "unknown";
}

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown";
  let os      = "Unknown";

  if (/Edg\//i.test(ua))          browser = "Edge";
  else if (/OPR\//i.test(ua))     browser = "Opera";
  else if (/Chrome\//i.test(ua))  browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua))  browser = "Safari";

  if (/Windows NT 10/i.test(ua))      os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/i.test(ua)) os = "Windows 7";
  else if (/Windows/i.test(ua))       os = "Windows";
  else if (/Mac OS X/i.test(ua))      os = "macOS";
  else if (/Android/i.test(ua))       os = "Android";
  else if (/iPhone|iPad/i.test(ua))   os = "iOS";
  else if (/Linux/i.test(ua))         os = "Linux";

  return { browser, os };
}

async function writeLoginLog(username: string, status: 0 | 1, ip: string, browser: string, os: string) {
  try {
    const [location, conn] = await Promise.all([getLocation(ip), pool.connect()]);
    const now = new Date();
    await conn.request()
      .input("USER_NAME",      mssql.NVarChar, username)
      .input("STATUS",         mssql.VarChar,  String(status))
      .input("IP",             mssql.VarChar,  ip)
      .input("LOGIN_LOCATION", mssql.NVarChar, location)
      .input("BROWSER",        mssql.VarChar,  browser)
      .input("OS",             mssql.VarChar,  os)
      .input("LOGIN_STATUS",   mssql.Int,      status)
      .input("CREATE_BY",      mssql.NVarChar, username)
      .input("CREATE_TIME",    mssql.DateTime, now)
      .query(`
        INSERT INTO SYS_LOGIN_LOG
          (USER_NAME, STATUS, IP, LOGIN_LOCATION, BROWSER, OS, LOGIN_STATUS, CREATE_BY, CREATE_TIME)
        VALUES
          (@USER_NAME, @STATUS, @IP, @LOGIN_LOCATION, @BROWSER, @OS, @LOGIN_STATUS, @CREATE_BY, @CREATE_TIME)
      `);
  } catch (err) {
    console.error("Ghi nhật ký đăng nhập thất bại:", err);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);
  const { browser, os } = parseUserAgent(req.headers["user-agent"] || "");

  try {
    const connection = await pool.connect();
    const result = await connection.request()
      .input("username", mssql.NVarChar, username)
      .query(`
        SELECT ID, NAME, NICK_NAME, AVATAR, PASSWORD, SALT, STATUS, COM_ID
        FROM SYS_USER WITH(NOLOCK)
        WHERE NAME = @username AND DEL_FLAG = 0
      `);

    const user = result.recordset[0];

    if (!user) {
      await writeLoginLog(username, 0, ip, browser, os);
      return res.status(401).json({ code: 401, message: "login.userNotFound" });
    }

    const salt = user.SALT || "";
    const inputPasswordHash = crypto.createHash("md5").update(password + salt).digest("hex");

    if (inputPasswordHash !== user.PASSWORD) {
      console.log("=> Lỗi: Mật khẩu không khớp!");
      await writeLoginLog(username, 0, ip, browser, os);
      return res.status(401).json({ code: 401, message: "login.passwordError" });
    }

    console.log("=> Đăng nhập thành công!");
    await writeLoginLog(username, 1, ip, browser, os);

    // Roles + zones 3 queries chạy song song trên cùng 1 connection pool
    let roles: string[] = [];
    let zones: number[] = [];

    try {
      const [roleRes, uzRes, rzRes] = await Promise.all([
        connection.request()
          .input("userId", mssql.Int, user.ID)
          .query(`
            SELECT r.CODE
            FROM SYS_ROLE r WITH(NOLOCK)
            JOIN SYS_USER_ROLE ur WITH(NOLOCK) ON r.ID = ur.ROLE_ID
            WHERE ur.USER_ID = @userId AND r.STATUS = 1
          `),
        connection.request()
          .input("userIdUz", mssql.Int, user.ID)
          .query(`
            SELECT DISTINCT sr.ID as REGION_ID
            FROM SYS_USER_ZONE uz WITH(NOLOCK)
            JOIN SYS_REGION sr WITH(NOLOCK) ON sr.ZONE_ID = uz.ZONE_ID AND sr.DEL_FLAG = 0
            WHERE uz.USER_ID = @userIdUz
          `),
        connection.request()
          .input("userIdRr", mssql.Int, user.ID)
          .query(`
            SELECT DISTINCT rr.REGION_ID
            FROM SYS_ROLE_REGION rr WITH(NOLOCK)
            JOIN SYS_USER_ROLE ur WITH(NOLOCK) ON rr.ROLE_ID = ur.ROLE_ID
            WHERE ur.USER_ID = @userIdRr
          `)
      ]);

      roles = roleRes.recordset.map((r: any) => r.CODE);
      if (roles.length === 0) roles = ["common"];

      if (!roles.includes("admin")) {
        const direct = [
          ...uzRes.recordset.map((r: any) => Number(r.REGION_ID)),
          ...rzRes.recordset.map((r: any) => Number(r.REGION_ID))
        ];
        const unique = [...new Set(direct)];
        if (unique.length > 0) {
          // Expand sang các region con để UI hiển thị đúng vùng phân cấp
          const expReq = connection.request();
          unique.forEach((id, i) => expReq.input(`z${i}`, mssql.Int, id));
          const inClause = unique.map((_, i) => `@z${i}`).join(", ");
          const expRes = await expReq.query(`
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
          zones = expRes.recordset.map((r: any) => Number(r.ID));
        }
      }
    } catch (e) {
      console.warn("[Auth] Không đọc được roles/zones:", e);
      roles = ["common"];
    }

    const now = Date.now();
    const expires = new Date(now + 2 * 60 * 60 * 1000);
    res.json({
      code: 0,
      message: "login.loginSuccess",
      data: {
        username: user.NAME,
        nickname: user.NICK_NAME || user.NAME,
        avatar: user.AVATAR || "",
        roles,
        permissions: [],
        zones,
        accessToken: `AT_${user.ID}_${now}`,
        refreshToken: `RT_${user.ID}_${now}`,
        expires
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    await writeLoginLog(username || "unknown", 0, ip, browser, os);
    res.status(500).json({ code: 500, message: "login.serverError" });
  }
});


// ── Lấy userId từ Authorization header ───────────────────────
function getUserIdFromToken(req: express.Request): number | null {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return null;
  const parts = token.split("_"); // AT_{ID}_{timestamp}
  if (parts.length >= 3 && parts[0] === "AT") {
    const id = parseInt(parts[1]);
    return isNaN(id) ? null : id;
  }
  return null;
}

// GET /api/auth/mine — Thông tin cá nhân
router.get("/mine", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });
  try {
    const conn = await pool.connect();
    const result = await conn.request()
      .input("id", mssql.Int, userId)
      .query(`SELECT ID, NAME, NICK_NAME, AVATAR, EMAIL, MOBILE, REMARKS FROM SYS_USER WITH(NOLOCK) WHERE ID=@id AND DEL_FLAG=0`);
    const u = result.recordset[0];
    if (!u) return res.status(404).json({ code: 404, message: "Không tìm thấy người dùng" });
    res.json({
      code: 0, message: "common.success",
      data: {
        username:    u.NAME,
        nickname:    u.NICK_NAME  || "",
        avatar:      u.AVATAR     || "",
        email:       u.EMAIL      || "",
        phone:       u.MOBILE     || "",
        description: u.REMARKS    || ""
      }
    });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// PUT /api/auth/mine — Cập nhật thông tin cá nhân
router.put("/mine", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });
  try {
    const { nickname, email, phone, description } = req.body;
    const conn = await pool.connect();
    await conn.request()
      .input("id",          mssql.Int,      userId)
      .input("nickname",    mssql.NVarChar, nickname    || "")
      .input("email",       mssql.NVarChar, email       || "")
      .input("phone",       mssql.VarChar,  phone       || "")
      .input("description", mssql.NVarChar, description || "")
      .input("now",         mssql.DateTime, new Date())
      .query(`UPDATE SYS_USER SET NICK_NAME=@nickname, EMAIL=@email, MOBILE=@phone, REMARKS=@description, LAST_UPDATE_TIME=@now WHERE ID=@id`);
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// PUT /api/auth/mine/password — Đổi mật khẩu
router.put("/mine/password", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });
  try {
    const { oldPassword, newPassword } = req.body;
    const conn = await pool.connect();
    const result = await conn.request()
      .input("id", mssql.Int, userId)
      .query("SELECT PASSWORD, SALT FROM SYS_USER WITH(NOLOCK) WHERE ID=@id");
    const u = result.recordset[0];
    if (!u) return res.status(404).json({ code: 404, message: "Không tìm thấy người dùng" });

    const salt    = u.SALT || "";
    const oldHash = crypto.createHash("md5").update(oldPassword + salt).digest("hex");
    if (oldHash !== u.PASSWORD) {
      return res.status(400).json({ code: 400, message: "Mật khẩu cũ không đúng" });
    }
    const newHash = crypto.createHash("md5").update(newPassword + salt).digest("hex");
    await conn.request()
      .input("id",       mssql.Int,      userId)
      .input("password", mssql.VarChar,  newHash)
      .input("now",      mssql.DateTime, new Date())
      .query("UPDATE SYS_USER SET PASSWORD=@password, LAST_UPDATE_TIME=@now WHERE ID=@id");
    res.json({ code: 0, message: "common.updateSuccess" });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// GET /api/auth/mine-logs — Nhật ký đăng nhập của tôi
router.get("/mine-logs", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });
  try {
    const conn = await pool.connect();
    const userRes = await conn.request()
      .input("id", mssql.Int, userId)
      .query("SELECT NAME FROM SYS_USER WITH(NOLOCK) WHERE ID=@id");
    const username = userRes.recordset[0]?.NAME;
    if (!username) return res.status(404).json({ code: 404, message: "Không tìm thấy người dùng" });

    const currentPage = Number(req.query.currentPage) || 1;
    const pageSize    = Number(req.query.pageSize)    || 10;
    const offset      = (currentPage - 1) * pageSize;

    const [countRes, dataRes] = await Promise.all([
      conn.request().input("un", mssql.NVarChar, username)
        .query("SELECT COUNT(*) as total FROM SYS_LOGIN_LOG WITH(NOLOCK) WHERE USER_NAME=@un"),
      conn.request()
        .input("un",       mssql.NVarChar, username)
        .input("offset",   mssql.Int,      offset)
        .input("pageSize", mssql.Int,      pageSize)
        .query(`
          SELECT
            IP             as ip,
            LOGIN_LOCATION as address,
            BROWSER        as browser,
            OS             as system,
            LOGIN_STATUS   as loginStatus,
            CREATE_TIME    as operatingTime
          FROM SYS_LOGIN_LOG WITH(NOLOCK)
          WHERE USER_NAME=@un
          ORDER BY CREATE_TIME DESC
          OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `)
    ]);

    res.json({
      code: 0, message: "common.success",
      data: {
        list:        dataRes.recordset,
        total:       countRes.recordset[0].total,
        pageSize,
        currentPage
      }
    });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// PUT /api/auth/mine/avatar — Cập nhật ảnh đại diện
router.put("/mine/avatar", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ code: 401, message: "Unauthorized" });
  try {
    const { avatar } = req.body;
    if (!avatar || !avatar.startsWith("data:image/")) {
      return res.status(400).json({ code: 400, message: "Dữ liệu ảnh không hợp lệ" });
    }

    const matches = avatar.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ code: 400, message: "Định dạng base64 không hợp lệ" });

    const ext    = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    const uploadDir = path.join(process.cwd(), "uploads", "avatars");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${userId}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;
    const conn = await pool.connect();
    await conn.request()
      .input("id",  mssql.Int,      userId)
      .input("url", mssql.NVarChar, avatarUrl)
      .input("now", mssql.DateTime, new Date())
      .query("UPDATE SYS_USER SET AVATAR=@url, LAST_UPDATE_TIME=@now WHERE ID=@id");

    res.json({ code: 0, message: "common.updateSuccess", data: { avatar: avatarUrl } });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

export default router;
