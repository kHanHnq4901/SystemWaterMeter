import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: any;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    /** Danh sách dữ liệu */
    list: Array<any>;
    total?: number;
    pageSize?: number;
    currentPage?: number;
  };
};

/** LẤY DANH SÁCH MENU */
// Ghi chú: Vue-Pure-Admin có thể gọi API này không cần phân trang nên trả về dạng list phẳng
export const getMenuList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/menus/list", { data });
};

/** THÊM MỚI MENU */
export const addMenu = (data?: object) => {
  return http.request<Result>("post", "/api/menus/add", { data });
};

/** CẬP NHẬT MENU */
export const updateMenu = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/menus/update/${id}`, { data });
};

/** XÓA MENU */
export const deleteMenu = (id: number) => {
  return http.request<Result>("delete", `/api/menus/${id}`);
};

export const getAsyncRoutes = () => {
  // Thay thế URL cũ bằng URL mới này
  return http.request<Result>("get", "/api/menus/get-async-routes"); 
};