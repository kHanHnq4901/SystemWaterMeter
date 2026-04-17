import { http } from "@/utils/http";

export type LoginResult = {
  success: boolean;
  message?: string;
  data?: {
    ID: number;
    NAME: string;
    NICK_NAME: string;
    accessToken: string;
    roles: Array<string>;
    COM_ID: string;
  };
};

/** Đăng nhập API */
export const loginApi = (data: object) => {
  return http.request<LoginResult>("post", "/api/auth/login", { data });
};