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
    list: Array<any>;
    total: number;
    pageSize: number;
    currentPage: number;
  };
};

// Dashboard
export const getWaterDashboard = () =>
  http.request<Result>("get", "/api/dashboard/stats");
export const getConsumptionChart = (data?: any) =>
  http.request<ResultTable>("get", "/api/dashboard/consumption-chart", {
    data
  });
  
  // Dashboard
  export const getZoneConsumption = () =>
    http.request<Result>("get", "/api/dashboard/zone-consumption");
  export const getMeterStatus = () =>
    http.request<Result>("get", "/api/dashboard/meter-status");
  export const getRealtimeData = () =>
    http.request<Result>("get", "/api/dashboard/realtime");
  export const getWaterAlerts = (data?: object) =>
  http.request<ResultTable>("get", "/api/alerts", { params: data });
  export const confirmAlert = (id: number) =>
  http.request<Result>("put", `/api/alerts/${id}/confirm`);
  export const getGatewayStats = () =>
  http.request<Result>("get", "/api/gateways/stats/summary");