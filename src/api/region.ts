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

/** LẤY DANH SÁCH MẠNG LƯỚI / TRẠM (REGION) */
export const getRegionList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/regions/list", { data });
};

/** THÊM MỚI (Trạm/Nhánh) */
export const addRegion = (data?: object) => {
  return http.request<Result>("post", "/api/regions/add", { data });
};

/** CẬP NHẬT (Trạm/Nhánh) */
export const updateRegion = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/regions/update/${id}`, { data });
};

/** XÓA (Trạm/Nhánh) */
export const deleteRegion = (id: number) => {
  return http.request<Result>("delete", `/api/regions/${id}`);
};