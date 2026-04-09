import { http } from "@/utils/http";

type LoginData = {
  username: string;
  password: string;
};

type LoginResult = {
  success: boolean;
  message: string;
  data: {
    userId: number;
    username: string;
    name: string;
    userType: number;
    roleId: number;
    email: string;
    tel: string;
    address: string;
    state: number;
  };
};

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