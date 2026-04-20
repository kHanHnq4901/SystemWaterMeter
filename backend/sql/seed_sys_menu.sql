-- Xóa dữ liệu cũ và seed lại SYS_MENU khớp với static routes của frontend
-- Chạy script này một lần để đồng bộ DB với src/router/modules/

DELETE FROM SYS_MENU;
DBCC CHECKIDENT ('SYS_MENU', RESEED, 0);

-- ============================================================
-- MENU CHA (TYPE = 0: thư mục, không có component)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Bảng điều khiển', 'Welcome',        '/welcome',       'views/welcome/index.vue',            'ri:dashboard-line',         0, 0, 0,  0, GETDATE()),
('Bản đồ',          'Map',            '/map',           '',                                   'ri:map-2-line',             0, 0, 1,  0, GETDATE()),
('Khai báo Thiết bị','Device',        '/device',        '',                                   'ri:wireless-charging-line', 0, 0, 2,  0, GETDATE()),
('Phân tích Dữ liệu','Analysis',      '/analysis',      '',                                   'ri:bar-chart-box-line',     0, 0, 3,  0, GETDATE()),
('Quản lý Hệ thống','System',         '/system',        '',                                   'ri:settings-3-line',        0, 0, 4,  0, GETDATE()),
('Nhật ký Hệ thống','Logs',           '/logs',          '',                                   'ri:file-history-line',      0, 0, 5,  0, GETDATE());

-- ============================================================
-- CON CỦA BẢN ĐỒ (parent = id của 'Bản đồ' = 2)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Tổng quan Bản đồ', 'MapOverview', '/map/overview', 'views/map/overview/index.vue', 'ri:map-range-line',  2, 0, 10, 0, GETDATE()),
('Bản đồ Gateway',   'MapGateway',  '/map/gateway',  'views/map/gateway/index.vue',  'ri:router-line',     2, 0, 11, 0, GETDATE()),
('Bản đồ Đồng hồ',  'MapMeter',    '/map/meter',    'views/map/meter/index.vue',    'ri:water-drop-line', 2, 0, 12, 0, GETDATE());

-- ============================================================
-- CON CỦA KHAI BÁO THIẾT BỊ (parent = id của 'Device' = 3)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Quản lý Đơn vị',    'DeviceUnit',     '/device/unit',     'views/device/unit/index.vue',     'ri:organisation-chart', 3, 0, 20, 0, GETDATE()),
('Quản lý Tỉnh/TP',   'DeviceProvince', '/device/province', 'views/device/province/index.vue', 'ri:map-pin-2-line',     3, 0, 21, 0, GETDATE()),
('Quản lý Quận/Huyện','DeviceDistrict', '/device/district', 'views/device/district/index.vue', 'ri:map-pin-line',       3, 0, 22, 0, GETDATE()),
('Quản lý Phường/Xã', 'DeviceWard',     '/device/ward',     'views/device/ward/index.vue',     'ri:map-2-line',         3, 0, 23, 0, GETDATE()),
('Quản lý Khu vực',   'DeviceZone',     '/device/zone',     'views/device/zone/index.vue',     'ri:focus-3-line',       3, 0, 24, 0, GETDATE()),
('Quản lý Cụm',       'DeviceCluster',  '/device/cluster',  'views/device/cluster/index.vue',  'ri:apps-line',          3, 0, 25, 0, GETDATE()),
('Quản lý Gateway',   'DeviceGateway',  '/device/gateway',  'views/device/gateway/index.vue',  'ri:router-line',        3, 0, 26, 0, GETDATE()),
('Quản lý Đồng hồ',   'DeviceMeter',    '/device/meter',    'views/device/meter/index.vue',    'ri:water-drop-line',    3, 0, 27, 0, GETDATE()),
('Quản lý Model',     'DeviceModel',    '/device/model',    'views/device/model/index.vue',    'ri:server-line',        3, 0, 28, 0, GETDATE());

-- ============================================================
-- CON CỦA PHÂN TÍCH DỮ LIỆU (parent = id của 'Analysis' = 4)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Xem Dữ liệu',    'AnalysisData',       '/analysis/data',       'views/analysis/data/index.vue',       'ri:database-line',        4, 0, 30, 0, GETDATE()),
('Sản lượng Nước', 'AnalysisProduction', '/analysis/production', 'views/analysis/production/index.vue', 'ri:water-flash-line',     4, 0, 31, 0, GETDATE()),
('Tổn thất Nước',  'AnalysisLoss',       '/analysis/loss',       'views/analysis/loss/index.vue',       'ri:alarm-warning-line',   4, 0, 32, 0, GETDATE()),
('Cảnh báo',       'AnalysisAlert',      '/analysis/alert',      'views/analysis/alert/index.vue',      'ri:notification-3-line',  4, 0, 33, 0, GETDATE()),
('Báo cáo',        'AnalysisReport',     '/analysis/report',     'views/analysis/report/index.vue',     'ri:file-chart-line',      4, 0, 34, 0, GETDATE());

-- ============================================================
-- CON CỦA QUẢN LÝ HỆ THỐNG (parent = id của 'System' = 5)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Quản lý Người dùng', 'SystemUser', '/system/user', 'views/system/user/index.vue', 'ri:user-settings-line',  5, 0, 40, 0, GETDATE()),
('Quản lý Vai trò',    'SystemRole', '/system/role', 'views/system/role/index.vue', 'ri:shield-user-line',    5, 0, 41, 0, GETDATE()),
('Quản lý Vùng',       'SystemDept', '/system/dept', 'views/system/dept/index.vue', 'ri:organisation-chart',  5, 0, 42, 0, GETDATE()),
('Quản lý Menu',       'SystemMenu', '/system/menu', 'views/system/menu/index.vue', 'ri:menu-2-line',         5, 0, 43, 0, GETDATE());

-- ============================================================
-- CON CỦA NHẬT KÝ HỆ THỐNG (parent = id của 'Logs' = 6)
-- ============================================================
INSERT INTO SYS_MENU (NAME, KEY_NAME, URL, COMPONENT, ICON, PARENT_ID, TYPE, ORDER_NUM, DEL_FLAG, CREATE_TIME) VALUES
('Nhật ký Đăng nhập',  'LoginLog',     '/logs/login',     'views/logs/login/index.vue',     'ri:login-circle-line', 6, 0, 50, 0, GETDATE()),
('Nhật ký Thao tác',   'OperationLog', '/logs/operation', 'views/logs/operation/index.vue', 'ri:history-line',      6, 0, 51, 0, GETDATE()),
('Nhật ký Hệ thống',   'SystemLog',    '/logs/system',    'views/logs/system/index.vue',    'ri:server-line',       6, 0, 52, 0, GETDATE());
