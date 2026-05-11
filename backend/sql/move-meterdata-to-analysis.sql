-- ============================================================
-- Di chuyển ID=15 "Dữ liệu ĐH" từ Thiết bị (ID=2) → Phân tích (ID=3)
-- Chạy trong SSMS, database WS02
-- ============================================================

-- Kiểm tra trước
SELECT ID, NAME, PARENT_ID, URL, COMPONENT, TYPE, DEL_FLAG
FROM SYS_MENU
WHERE ID IN (2, 3, 15);

-- Di chuyển
UPDATE SYS_MENU
SET
    PARENT_ID = 3,
    URL       = '/analysis/meter-data',
    COMPONENT = 'views/analysis/meter-data/index'
WHERE ID = 15;

-- Kiểm tra sau — Phân tích phải có 3 mục
SELECT ID, NAME, URL, COMPONENT, DEL_FLAG
FROM SYS_MENU
WHERE PARENT_ID = 3 AND DEL_FLAG = 0
ORDER BY ORDER_NUM;
