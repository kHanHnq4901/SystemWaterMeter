-- ============================================================
-- Di chuyển "Dữ liệu đồng hồ" từ Thiết bị → Phân tích
-- Chạy trong SSMS, database WS02
-- ============================================================

-- Bước 1: Xem ID hiện tại (kiểm tra trước khi sửa)
SELECT ID, PARENT_ID, MENU_NAME, COMPONENT, PATH, MENU_TYPE, DEL_FLAG
FROM SYS_MENU WITH(NOLOCK)
WHERE DEL_FLAG = 0
ORDER BY PARENT_ID, ORDER_NUM;

-- Bước 2: Cập nhật menu "Dữ liệu" (hoặc tên tương tự) ra khỏi Thiết bị, vào Phân tích
-- Thay @phanTichId và @menuDataId sau khi xem kết quả Bước 1

-- Lấy ID của folder "Phân tích"
DECLARE @phanTichId INT;
SELECT @phanTichId = ID FROM SYS_MENU WHERE MENU_NAME = N'Phân tích' AND MENU_TYPE = 0 AND DEL_FLAG = 0;

-- Lấy ID của menu "Dữ liệu" hiện đang nằm trong Thiết bị
DECLARE @menuDataId INT;
SELECT @menuDataId = ID
FROM SYS_MENU
WHERE MENU_TYPE = 1              -- page
  AND DEL_FLAG  = 0
  AND (COMPONENT LIKE '%meter-data%' OR MENU_NAME LIKE N'%Dữ liệu%')
  AND PARENT_ID = (SELECT ID FROM SYS_MENU WHERE MENU_NAME = N'Thiết bị' AND MENU_TYPE = 0 AND DEL_FLAG = 0);

-- Kiểm tra ID tìm được
SELECT @phanTichId AS phanTichId, @menuDataId AS menuDataId;

-- Bước 3: Thực sự di chuyển (bỏ comment dòng UPDATE sau khi xác nhận ID đúng)
UPDATE SYS_MENU
SET
    PARENT_ID  = @phanTichId,
    COMPONENT  = 'analysis/meter-data/index',    -- đường dẫn file mới
    PATH       = '/analysis/meter-data'
WHERE ID = @menuDataId
  AND @phanTichId IS NOT NULL
  AND @menuDataId IS NOT NULL;

PRINT CONCAT('Đã di chuyển menu ID=', @menuDataId, ' sang Phân tích (ID=', @phanTichId, ')');

-- Bước 4: Kiểm tra lại
SELECT ID, PARENT_ID, MENU_NAME, COMPONENT, PATH
FROM SYS_MENU
WHERE PARENT_ID = @phanTichId AND DEL_FLAG = 0
ORDER BY ORDER_NUM;
