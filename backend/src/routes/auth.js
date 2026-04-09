import express from "express";
import mssql from "mssql";
import md5 from "md5";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

const router = express.Router();

// Secret keys để ký JWT (Trong thực tế nên lưu ở file .env)
const JWT_SECRET = process.env.JWT_SECRET || "songda-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "songda-refresh-key";

// POST /api/auth/login - Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Thay vì trả text, ta trả về key i18n
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "login.pureUsernameReg" // Key: Vui lòng nhập tài khoản/mật khẩu
      });
    }

    // Mã hóa password sang MD5
    const hashedPassword = md5(password);
    console.log("Login attempt:", username);

    const connection = await pool.connect();

    // Đã bổ sung lại truy vấn lấy mảng ROLES bị thiếu trong code của bạn
    const result = await connection
      .request()
      .input("username", mssql.VarChar, username.trim())
      .input("password", mssql.VarChar, hashedPassword).query(`
        SELECT TOP 1 
          u.USER_ID,
          u.USER_ACCOUNT,
          u.USER_NAME,
          u.USER_TYPE,
          u.DEPT_ID,
          u.USER_ADDRESS,
          u.USER_TEL,
          u.USER_EMAIL,
          u.STATE,
          (
            SELECT STUFF((
              SELECT ',' + r.ROLE_CODE 
              FROM IAUDIT_USER_ROLE ur 
              JOIN IAUDIT_ROLE r ON ur.ROLE_ID = r.ROLE_ID 
              WHERE ur.USER_ID = u.USER_ID 
              FOR XML PATH('')
            ), 1, 1, '')
          ) as ROLES
        FROM IAUDIT_USER u
        WHERE u.USER_ACCOUNT = @username 
          AND u.USER_PWD = @password
      `);

    // 1. Kiểm tra tài khoản có tồn tại / Sai pass
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "login.pureLoginFail" // Key: Đăng nhập thất bại / Sai thông tin
      });
    }

    const user = result.recordset[0];

    // 2. Kiểm tra trạng thái khóa tài khoản
    if (user.STATE === 0) {
      return res.status(403).json({
        success: false,
        message: "login.pureAccountDisabled" // Key mới: Tài khoản bị khóa
      });
    }

    // 3. Xử lý dữ liệu Roles thành mảng (VD: ["admin", "common"])
    const userRoles = user.ROLES ? user.ROLES.split(",") : [];

    // 4. Sinh JWT Tokens cho vue-pure-admin
    const accessToken = jwt.sign(
      { userId: user.USER_ID, account: user.USER_ACCOUNT },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.USER_ID, account: user.USER_ACCOUNT },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    const expires = new Date().getTime() + 2 * 60 * 60 * 1000;

    // 5. Cập nhật thời gian đăng nhập và lưu TOKEN
    await connection
      .request()
      .input("id", mssql.Int, user.USER_ID)
      .input("token", mssql.NVarChar, accessToken)
      .input("ip", mssql.VarChar, req.ip || "").query(`
        UPDATE IAUDIT_USER 
        SET LASTACTIVE_TIME = GETDATE(), 
            TOKEN = @token,
            IP = @ip
        WHERE USER_ID = @id
      `);

    // 6. Trả về thành công
    res.json({
      success: true,
      message: "login.pureLoginSuccess", // Key: Đăng nhập thành công
      data: {
        userId: user.USER_ID,
        username: user.USER_ACCOUNT,
        name: user.USER_NAME,
        userType: user.USER_TYPE,
        deptId: user.DEPT_ID,
        email: user.USER_EMAIL,
        tel: user.USER_TEL,
        address: user.USER_ADDRESS,
        state: user.STATE,
        roles: userRoles,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expires: expires
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
