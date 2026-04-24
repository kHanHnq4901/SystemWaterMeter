import express, { Request, Response } from "express";
import mssql from "mssql";
import pool from "../config/database.js";
import { zoneAuth, buildZoneFilter } from "../middleware/zoneAuth.js";

const router = express.Router();

// ============================================================================
// 1. LẤY DANH SÁCH MẠNG LƯỚI / TRẠM (POST /api/regions/list)
// Dùng cho màn hình Tree-Table (System Dept). 
// Lưu ý: Màn hình Tree thường không phân trang, nên ta trả về toàn bộ list phẳng,
// Frontend (hàm handleTree) sẽ tự động cuộn nó thành Cây dựa vào parentId.
// ============================================================================
router.post("/list", zoneAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const conditions: string[] = ["DEL_FLAG = 0"];

    const connection = await pool.connect();
    const request = connection.request();

    if (name) {
      request.input("name", mssql.NVarChar, `%${name}%`);
      conditions.push("NAME LIKE @name");
    }

    // Lọc theo zone nếu user không phải admin
    const zoneFilter = buildZoneFilter(req, request, "ID");
    if (zoneFilter) conditions.push(zoneFilter);

    const whereClause = "WHERE " + conditions.join(" AND ");

    const result = await request.query(`
      SELECT 
        ID as id,
        NAME as name,
        PARENT_ID as parentId,
        ORDER_NUM as orderNum,
        VOLTAGE_CODE as voltageCode,
        CAPACITY as capacity,
        INSTALLATION_ADDR as installationAddr,
        COM_ID as comId,
        CREATE_TIME as createTime
      FROM SYS_REGION
      ${whereClause}
      ORDER BY ORDER_NUM ASC, CREATE_TIME DESC
    `);

    // Trả về cấu trúc mà Vue-Pure-Admin mong đợi
    res.json({
      code: 0,
      message: "Thành công",
      data: {
        list: result.recordset
      }
    });
  } catch (error: any) {
    console.error("Lỗi API get region list:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// GET /api/regions/all — toàn bộ vùng (không lọc zone, dùng cho admin gán quyền)
// ============================================================================
router.get("/all", async (_req: Request, res: Response) => {
  try {
    const conn = await pool.connect();
    const result = await conn.request().query(`
      SELECT ID as id, NAME as name, PARENT_ID as parentId, ORDER_NUM as orderNum
      FROM SYS_REGION WHERE DEL_FLAG = 0
      ORDER BY ORDER_NUM ASC, CREATE_TIME DESC
    `);
    res.json({ code: 0, data: result.recordset });
  } catch (err: any) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// ============================================================================
// 2. THÊM MỚI TRẠM / NHÁNH (POST /api/regions/add)
// ============================================================================
router.post("/add", async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      parentId = 0, 
      orderNum = 0, 
      voltageCode, 
      capacity, 
      comId = 1 // Mặc định gán vào công ty 1 nếu không truyền
    } = req.body;

    if (!name) {
      return res.json({ code: 400, message: "Tên Trạm/Nhánh là bắt buộc!" });
    }

    const connection = await pool.connect();
    
    await connection.request()
      .input("NAME", mssql.NVarChar, name)
      .input("PARENT_ID", mssql.Int, parentId)
      .input("ORDER_NUM", mssql.Int, orderNum)
      .input("VOLTAGE_CODE", mssql.Int, voltageCode || null) // Dùng kiểu số
      .input("CAPACITY", mssql.Int, capacity || null)
      .input("COM_ID", mssql.Int, comId)
      .query(`
        INSERT INTO SYS_REGION (NAME, PARENT_ID, ORDER_NUM, VOLTAGE_CODE, CAPACITY, COM_ID, DEL_FLAG, CREATE_TIME)
        VALUES (@NAME, @PARENT_ID, @ORDER_NUM, @VOLTAGE_CODE, @CAPACITY, @COM_ID, 0, GETDATE())
      `);

    res.json({ code: 0, message: "Thêm thành công" });
  } catch (error: any) {
    console.error("Lỗi thêm Region:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 3. CẬP NHẬT TRẠM / NHÁNH (PUT /api/regions/update/:id)
// ============================================================================
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, parentId, orderNum, voltageCode, capacity } = req.body;

    // Không cho phép Trạm tự làm cha của chính nó (Lỗi vòng lặp vô tận trên Tree)
    if (Number(id) === Number(parentId)) {
      return res.json({ code: 400, message: "Không thể chọn thư mục cha là chính nó!" });
    }

    const connection = await pool.connect();
    
    await connection.request()
      .input("id", mssql.BigInt, id)
      .input("NAME", mssql.NVarChar, name)
      .input("PARENT_ID", mssql.Int, parentId)
      .input("ORDER_NUM", mssql.Int, orderNum)
      .input("VOLTAGE_CODE", mssql.Int, voltageCode || null)
      .input("CAPACITY", mssql.Int, capacity || null)
      .query(`
        UPDATE SYS_REGION 
        SET 
          NAME = @NAME, 
          PARENT_ID = @PARENT_ID, 
          ORDER_NUM = @ORDER_NUM, 
          VOLTAGE_CODE = @VOLTAGE_CODE, 
          CAPACITY = @CAPACITY,
          LAST_UPDATE_TIME = GETDATE()
        WHERE ID = @id
      `);

    res.json({ code: 0, message: "Cập nhật thành công" });
  } catch (error: any) {
    console.error("Lỗi cập nhật Region:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

// ============================================================================
// 4. XÓA MỀM TRẠM / NHÁNH (DELETE /api/regions/:id)
// ============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const connection = await pool.connect();

    // KIỂM TRA QUAN TRỌNG: Nếu đang có Trạm con / Nhánh con thì không cho xóa
    const checkChild = await connection.request()
      .input("id", mssql.BigInt, id)
      .query(`SELECT ID FROM SYS_REGION WHERE PARENT_ID = @id AND DEL_FLAG = 0`);

    if (checkChild.recordset.length > 0) {
      return res.json({ 
        code: 400, 
        message: "Không thể xóa vì đang có đơn vị cấp dưới trực thuộc! Vui lòng xóa đơn vị con trước." 
      });
    }

    // Tiến hành xóa mềm
    await connection.request()
      .input("id", mssql.BigInt, id)
      .query(`UPDATE SYS_REGION SET DEL_FLAG = 1 WHERE ID = @id`);

    res.json({ code: 0, message: "Đã xóa thành công" });
  } catch (error: any) {
    console.error("Lỗi xóa Region:", error);
    res.status(500).json({ code: 500, message: error.message });
  }
});

export default router;