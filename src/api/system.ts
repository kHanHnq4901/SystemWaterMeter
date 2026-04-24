import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: Array<any>;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    /** Dữ liệu danh sách */
    list: Array<any>;
    /** Tổng số bản ghi */
    total?: number;
    /** Số bản ghi trên 1 trang */
    pageSize?: number;
    /** Trang hiện tại */
    currentPage?: number;
  };
};

// ==========================================
// API QUẢN LÝ NGƯỜI DÙNG (USERS)
// ==========================================

/** Lấy danh sách người dùng (Có phân trang) */
export const getUserList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/users/list", { data });
};

// THÊM 3 HÀM NÀY ĐỂ XỬ LÝ THÊM, SỬA, XÓA NGƯỜI DÙNG
export const addUser = (data?: object) => {
  return http.request<Result>("post", "/api/users/add", { data });
};

export const updateUser = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/users/update/${id}`, { data });
};

export const deleteUser = (id: number) => {
  return http.request<Result>("delete", `/api/users/${id}`);
};

// Hàm xóa hàng loạt (dùng cho mảng ID)
export const batchDeleteUser = (data?: object) => {
  return http.request<Result>("post", "/api/users/batch-delete", { data });
};
/** Lưu danh sách Role cho user */
export const saveUserRoles = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/users/${id}/roles`, { data });
};

/** Lấy danh sách Zone IDs của user */
export const getUserZones = (id: number) => {
  return http.request<Result>("get", `/api/users/${id}/zones`);
};

/** Cập nhật danh sách Zone cho user */
export const updateUserZones = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/users/${id}/zones`, { data });
};

/** Toàn bộ vùng (không lọc zone, dùng cho màn hình gán quyền vùng) */
export const getAllRegions = () => {
  return http.request<Result>("get", "/api/regions/all");
};

/** Cây role-user cho panel bên trái màn hình quản lý người dùng */
export const getRoleUserTree = () => {
  return http.request<Result>("get", "/api/users/role-user-tree");
};

/** Lấy danh sách Role IDs mà user đang sở hữu (Dùng cho Popup phân quyền) */
export const getRoleIds = (data?: object) => {
  // Lưu ý: Cần đảm bảo Backend có API này (VD: POST /api/users/role-ids)
  return http.request<Result>("post", "/api/users/role-ids", { data });
};

// ==========================================
// API QUẢN LÝ VAI TRÒ (ROLES) & PHÒNG BAN
// ==========================================

/** Lấy tất cả danh sách vai trò (Không phân trang - Đổ vào dropdown) */
export const getAllRoleList = () => {
  return http.request<Result>("get", "/api/roles/list-all");
};

/** Lấy danh sách vai trò (Có phân trang - Cho màn hình Quản lý Role) */
export const getRoleList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/roles/list", { data });
};

export const addRole = (data?: object) => {
  return http.request<Result>("post", "/api/roles/add", { data });
};

export const updateRole = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/roles/update/${id}`, { data });
};

export const deleteRole = (id: number) => {
  return http.request<Result>("delete", `/api/roles/delete/${id}`);
};

export const saveRoleMenus = (data?: object) => {
  return http.request<Result>("post", "/api/roles/save-menu", { data });
};

/** Lấy danh sách cây phòng ban (Đã đổi sang gọi Role để vẽ cây theo Role) */
export const getDeptList = (data?: object) => {
  // Đổi từ POST "/dept" sang GET "/api/roles/list-all"
  return http.request<Result>("get", "/api/roles/list-all", { params: data });
};

// ==========================================
// CÁC API KHÁC (MENU, LOGS...) 
// (Tạm thời trỏ về /api/... để chuẩn bị cho tương lai)
// ==========================================

/** Lấy danh sách Menu */
export const getMenuList = (data?: object) => {
  return http.request<Result>("post", "/api/menus/list", { data });
};

export const addMenu = (data?: object) => {
  return http.request<Result>("post", "/api/menus/add", { data });
};

export const updateMenu = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/menus/update/${id}`, { data });
};

export const deleteMenu = (id: number) => {
  return http.request<Result>("delete", `/api/menus/${id}`);
};

/** Lấy danh sách Menu của Role (Phân quyền) */
export const getRoleMenu = (data?: object) => {
  return http.request<Result>("post", "/api/roles/menu", { data });
};

/** Lấy danh sách ID Menu mà Role đang giữ */
export const getRoleMenuIds = (data?: object) => {
  return http.request<Result>("post", "/api/roles/menu-ids", { data });
};

/** Quản lý Log - User Online */
export const getOnlineLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/logs/online", { data });
};

/** Quản lý Log - Đăng nhập */
export const getLoginLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/logs/login", { data });
};

/** Quản lý Log - Thao tác */
export const getOperationLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/logs/operation", { data });
};

/** Quản lý Log - Hệ thống */
export const getSystemLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/logs/system", { data });
};

/** Chi tiết Log hệ thống */
export const getSystemLogsDetail = (data?: object) => {
  return http.request<Result>("post", "/api/logs/system-detail", { data });
};

/** Xóa toàn bộ nhật ký hệ thống */
export const clearSystemLogs = () => {
  return http.request<Result>("delete", "/api/logs/system/clear-all");
};

/** Xóa nhiều bản ghi nhật ký hệ thống */
export const batchDeleteSystemLogs = (data?: object) => {
  return http.request<Result>("post", "/api/logs/system/batch-delete", { data });
};