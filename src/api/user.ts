import { http } from "@/utils/http";

export type UserResult = {
  code: number;
  message: string;
  data: {
    avatar: string;
    username: string;
    nickname: string;
    roles: Array<string>;
    permissions: Array<string>;
    accessToken: string;
    refreshToken: string;
    expires: Date;
  };
};

export type RefreshTokenResult = {
  code: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expires: Date;
  };
};

export type UserInfo = {
  avatar: string;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  description: string;
};

export type UserInfoResult = {
  code: number;
  message: string;
  data: UserInfo;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    list: Array<any>;
    total?: number;
    pageSize?: number;
    currentPage?: number;
  };
};

type Result = { code: number; message: string; data?: any };

/** Đăng nhập */
export const getLogin = (data?: object) =>
  http.request<UserResult>("post", "/login", { data });

/** Refresh token */
export const refreshTokenApi = (data?: object) =>
  http.request<RefreshTokenResult>("post", "/refresh-token", { data });

/** Thông tin cá nhân */
export const getMine = () =>
  http.request<UserInfoResult>("get", "/api/auth/mine");

/** Cập nhật thông tin cá nhân */
export const updateMine = (data: object) =>
  http.request<Result>("put", "/api/auth/mine", { data });

/** Đổi mật khẩu */
export const changePassword = (data: object) =>
  http.request<Result>("put", "/api/auth/mine/password", { data });

/** Cập nhật ảnh đại diện */
export const uploadAvatar = (data: { avatar: string }) =>
  http.request<Result>("put", "/api/auth/mine/avatar", { data });

/** Nhật ký đăng nhập của tôi */
export const getMineLogs = (params?: object) =>
  http.request<ResultTable>("get", "/api/auth/mine-logs", { params });
