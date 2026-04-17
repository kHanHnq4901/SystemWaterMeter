import { http } from "@/utils/http";

type LoginData = {
  username: string;
  password: string;
};

// Sửa lại interface LoginResult
export interface LoginResult {
  success: boolean;
  message?: string;
  data?: {
    ID: number;        // Hoặc userId tùy theo Backend bạn trả về
    NAME: string;
    NICK_NAME: string;
    accessToken: string; // THÊM DÒNG NÀY
    roles: string[];     // THÊM DÒNG NÀY
    COM_ID: string;
    expires: number | Date; // Đọc tiếp lỗi 2 bên dưới
  };
}

// API Đăng nhập
export const loginApi = (data: LoginData) => {
  return http.post<LoginResult, any>("/api/auth/login", { data });
};

// API Refresh Token
export const refreshTokenApi = (data: { refreshToken: string }) => {
  return http.post("/api/auth/refresh-token", { data });
};

// API Logout
export const logoutApi = () => {
  return http.post("/api/auth/logout");
};