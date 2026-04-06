import express from 'express';
import mssql from 'mssql';
import md5 from 'md5';
import pool from '../config/database.js';

const router = express.Router();

// POST /api/auth/login - Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Mã hóa password sang MD5
    const hashedPassword = md5(password);
    
    const connection = await pool.connect();
    const result = await connection.request()
      .input('username', mssql.VarChar, username)
      .input('password', mssql.VarChar, hashedPassword)
      .query(`
        SELECT TOP 1 
          USER_ID,
          USER_ACCOUNT,
          USER_NAME,
          USER_TYPE,
          ROLE_ID,
          USER_ADDRESS,
          USER_TEL,
          USER_EMAIL,
          STATE
        FROM IAUDIT_USER 
        WHERE USER_ACCOUNT = @username 
          AND USER_PWD = @password
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const user = result.recordset[0];
    
    // Check user state
    if (user.STATE === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is disabled' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Login successful',
      data: {
        userId: user.USER_ID,
        username: user.USER_ACCOUNT,
        name: user.USER_NAME,
        userType: user.USER_TYPE,
        roleId: user.ROLE_ID,
        email: user.USER_EMAIL,
        tel: user.USER_TEL,
        address: user.USER_ADDRESS,
        state: user.STATE
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;