import express from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import crypto from "crypto";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const connection = await pool.connect();
    const result = await connection.request()
      .input("username", mssql.NVarChar, username)
      .query(`
        SELECT ID, NAME, NICK_NAME, PASSWORD, SALT, STATUS, COM_ID 
        FROM SYS_USER 
        WHERE NAME = @username AND DEL_FLAG = 0
      `);

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ code: 401, message: "login.userNotFound" });
    }

    // Thực hiện băm mật khẩu nhập vào
    const salt = user.SALT || "";
    const inputToHash = password + salt;
    const inputPasswordHash = crypto
      .createHash("md5")
      .update(inputToHash)
      .digest("hex");


    if (inputPasswordHash !== user.PASSWORD) {
      console.log("=> Lỗi: Mật khẩu không khớp!");
      return res.status(401).json({ code: 401, message: "login.passwordError" });
    }

    console.log("=> Đăng nhập thành công!");
    const now = Date.now();
    const expires = new Date(now + 2 * 60 * 60 * 1000); // accessToken hết hạn sau 2 giờ
    res.json({
      code: 0,
      message: "login.loginSuccess",
      data: {
        username: user.NAME,
        nickname: user.NICK_NAME || user.NAME,
        avatar: "",
        roles: ["admin"],
        permissions: [],
        accessToken: `AT_${user.ID}_${now}`,
        refreshToken: `RT_${user.ID}_${now}`,
        expires
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ code: 500, message: "login.serverError" });
  }
});

export default router;