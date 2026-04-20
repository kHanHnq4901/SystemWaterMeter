import { http } from "@/utils/http";

type LoginData = {
  username: string;
  password: string;
};

export interface LoginResult {
  code: number;
  message?: string;
  data?: {
    username: string;
    nickname: string;
    avatar: string;
    roles: string[];
    permissions: string[];
    accessToken: string;
    refreshToken: string;
    expires: number | Date;
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