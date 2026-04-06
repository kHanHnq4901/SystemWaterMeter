import express from 'express';
import mssql from 'mssql';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/users - Lấy danh sách tất cả users
router.get('/', async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request()
      .query(`
        SELECT 
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
        ORDER BY USER_ID DESC
      `);
    
    res.json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id - Lấy thông tin user theo ID
router.get('/:id', async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request()
      .input('id', mssql.Int, req.params.id)
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
        WHERE USER_ID = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Tạo user mới
router.post('/', async (req, res) => {
  try {
    const { 
      USER_ACCOUNT, 
      USER_NAME, 
      USER_PWD, 
      USER_TYPE, 
      ROLE_ID, 
      USER_ADDRESS, 
      USER_TEL, 
      USER_EMAIL 
    } = req.body;

    if (!USER_ACCOUNT || !USER_PWD) {
      return res.status(400).json({ 
        success: false, 
        message: 'USER_ACCOUNT and USER_PWD are required' 
      });
    }

    const connection = await pool.connect();
    const result = await connection.request()
      .input('USER_ACCOUNT', mssql.VarChar, USER_ACCOUNT)
      .input('USER_NAME', mssql.NVarChar, USER_NAME || '')
      .input('USER_PWD', mssql.VarChar, USER_PWD)
      .input('USER_TYPE', mssql.Int, USER_TYPE || 1)
      .input('ROLE_ID', mssql.Int, ROLE_ID || null)
      .input('USER_ADDRESS', mssql.NVarChar, USER_ADDRESS || '')
      .input('USER_TEL', mssql.VarChar, USER_TEL || '')
      .input('USER_EMAIL', mssql.VarChar, USER_EMAIL || '')
      .query(`
        INSERT INTO IAUDIT_USER (
          USER_ACCOUNT, USER_NAME, USER_PWD, USER_TYPE, ROLE_ID,
          USER_ADDRESS, USER_TEL, USER_EMAIL, STATE
        )
        VALUES (
          @USER_ACCOUNT, @USER_NAME, @USER_PWD, @USER_TYPE, @ROLE_ID,
          @USER_ADDRESS, @USER_TEL, @USER_EMAIL, 1
        );
        SELECT SCOPE_IDENTITY() as USER_ID;
      `);

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      data: { USER_ID: result.recordset[0].USER_ID }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id - Cập nhật user
router.put('/:id', async (req, res) => {
  try {
    const { 
      USER_NAME, 
      USER_TYPE, 
      ROLE_ID, 
      USER_ADDRESS, 
      USER_TEL, 
      USER_EMAIL,
      STATE 
    } = req.body;

    const connection = await pool.connect();
    const result = await connection.request()
      .input('id', mssql.Int, req.params.id)
      .input('USER_NAME', mssql.NVarChar, USER_NAME)
      .input('USER_TYPE', mssql.Int, USER_TYPE)
      .input('ROLE_ID', mssql.Int, ROLE_ID)
      .input('USER_ADDRESS', mssql.NVarChar, USER_ADDRESS)
      .input('USER_TEL', mssql.VarChar, USER_TEL)
      .input('USER_EMAIL', mssql.VarChar, USER_EMAIL)
      .input('STATE', mssql.Int, STATE)
      .query(`
        UPDATE IAUDIT_USER
        SET USER_NAME = @USER_NAME,
            USER_TYPE = @USER_TYPE,
            ROLE_ID = @ROLE_ID,
            USER_ADDRESS = @USER_ADDRESS,
            USER_TEL = @USER_TEL,
            USER_EMAIL = @USER_EMAIL,
            STATE = @STATE
        WHERE USER_ID = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id - Xóa user
router.delete('/:id', async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.request()
      .input('id', mssql.Int, req.params.id)
      .query(`DELETE FROM IAUDIT_USER WHERE USER_ID = @id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;