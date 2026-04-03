import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mssql from 'mssql';
import { testConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Vue Pure Admin API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example API route - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const pool = await mssql.connect();
    const result = await pool.request().query('SELECT * FROM users');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Example API route - Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const pool = await mssql.connect();
    const result = await pool.request()
      .input('id', mssql.Int, req.params.id)
      .query('SELECT * FROM users WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  
  // Test database connection
  await testConnection();
});
