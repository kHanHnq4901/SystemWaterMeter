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
      return res.status(401).json({ success: false, message: "login.userNotFound" });
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
      return res.status(401).json({ success: false, message: "login.passwordError" });
    }

    console.log("=> Đăng nhập thành công!");
    res.json({
      success: true,
      message: "login.loginSuccess",
      data: {
        ID: user.ID,
        NAME: user.NAME,
        NICK_NAME: user.NICK_NAME,
        COM_ID: user.COM_ID,
        accessToken: `JWT_TOKEN_${user.ID}_${Date.now()}`,
        roles: ["admin"]
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "login.serverError" });
  }
});

export default router;