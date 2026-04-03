# Vue Pure Admin - Backend API

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/
│   │   └── database.js    # Cấu hình kết nối MSSQL
│   └── server.js          # Express server chính
├── .env                   # Biến môi trường
├── package.json           # Dependencies
└── README.md
```

## Cài đặt

```bash
cd backend
npm install
```

## Cấu hình Database (MSSQL)

Chỉnh sửa file `.env` để kết nối đến SQL Server:

```env
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=your_password
DB_NAME=vue_pure_admin
PORT=3000
```

## Khởi động Server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Welcome message |
| GET | `/api/health` | Health check |
| GET | `/api/users` | Lấy danh sách users |
| GET | `/api/users/:id` | Lấy user theo ID |

## Tạo Database và Table (nếu chưa có)

```sql
-- Tạo database
CREATE DATABASE vue_pure_admin;
GO

-- Sử dụng database
USE vue_pure_admin;
GO

-- Tạo table users
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);
GO
```
