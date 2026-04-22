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

// Water Meters (INFO_METER)
export const getWaterMeterList = (data?: object) =>
  http.request<ResultTable>("post", "/api/water-meters/list", { data });
export const addWaterMeter = (data: object) =>
  http.request<Result>("post", "/api/water-meters/add", { data });
export const updateWaterMeter = (no: string, data: object) =>
  http.request<Result>("put", `/api/water-meters/update/${no}`, { data });
export const deleteWaterMeter = (no: string) =>
  http.request<Result>("delete", `/api/water-meters/${no}`);

// Customers
export const getCustomers = (data?: object) =>
  http.request<ResultTable>("get", "/api/customers", { params: data });
export const getCustomer = (id: number) =>
  http.request<Result>("get", `/api/customers/${id}`);
export const createCustomer = (data: object) =>
  http.request<Result>("post", "/api/customers", { data });
export const updateCustomer = (id: number, data: object) =>
  http.request<Result>("put", `/api/customers/${id}`, { data });
export const deleteCustomer = (id: number) =>
  http.request<Result>("delete", `/api/customers/${id}`);
export const getCustomerStats = () =>
  http.request<Result>("get", "/api/customers/stats/summary");

// Invoices/Billing
export const getInvoices = (data?: object) =>
  http.request<ResultTable>("get", "/api/invoices", { params: data });
export const getInvoice = (id: number) =>
  http.request<Result>("get", `/api/invoices/${id}`);
export const createInvoice = (data: object) =>
  http.request<Result>("post", "/api/invoices", { data });
export const updateInvoice = (id: number, data: object) =>
  http.request<Result>("put", `/api/invoices/${id}`, { data });
export const payInvoice = (id: number, data: object) =>
  http.request<Result>("post", `/api/invoices/${id}/pay`, { data });
export const getBillingStats = () =>
  http.request<Result>("get", "/api/invoices/stats/summary");


export const createProvince = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/provinces", { data });
export const createDistrict = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/districts", { data });
export const createWard = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/wards", { data });
export const createZone = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/zones", { data });
export const createCluster = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/clusters", { data });

// Gateways
export const getGatewayList = (data?: object) =>
  http.request<ResultTable>("post", "/api/gateways/list", { data });
export const addGateway = (data: object) =>
  http.request<Result>("post", "/api/gateways/add", { data });
export const updateGateway = (no: string, data: object) =>
  http.request<Result>("put", `/api/gateways/update/${no}`, { data });
export const deleteGateway = (no: string) =>
  http.request<Result>("delete", `/api/gateways/${no}`);


// Alerts

export const getAlert = (id: number) =>
  http.request<Result>("get", `/api/alerts/${id}`);
export const markAlertRead = (id: number) =>
  http.request<Result>("put", `/api/alerts/${id}/read`);
export const markAllAlertsRead = () =>
  http.request<Result>("put", "/api/alerts/read-all");
export const deleteAlert = (id: number) =>
  http.request<Result>("delete", `/api/alerts/${id}`);
export const getAlertStats = () =>
  http.request<Result>("get", "/api/alerts/stats/summary");

// Maintenance
export const getMaintenanceOrders = (data?: object) =>
  http.request<ResultTable>("get", "/api/maintenance", { params: data });
export const getMaintenanceOrder = (id: number) =>
  http.request<Result>("get", `/api/maintenance/${id}`);
export const createMaintenanceOrder = (data: object) =>
  http.request<Result>("post", "/api/maintenance", { data });
export const updateMaintenanceOrder = (id: number, data: object) =>
  http.request<Result>("put", `/api/maintenance/${id}`, { data });
export const completeMaintenanceOrder = (id: number, data: object) =>
  http.request<Result>("put", `/api/maintenance/${id}/complete`, { data });
export const deleteMaintenanceOrder = (id: number) =>
  http.request<Result>("delete", `/api/maintenance/${id}`);
export const getMaintenanceStats = () =>
  http.request<Result>("get", "/api/maintenance/stats/summary");

// Consumption (alias for backward compatibility)
export const getConsumptionData = () =>
  http.request<Result>("get", "/api/dashboard/consumption-chart");

// Models
export const getMeterModelList = (data?: object) =>
  http.request<ResultTable>("post", "/api/models/meter/list", { data });
export const addMeterModel = (data: object) =>
  http.request<Result>("post", "/api/models/meter/add", { data });
export const updateMeterModel = (id: string, data: object) =>
  http.request<Result>("put", `/api/models/meter/update/${id}`, { data });
export const deleteMeterModel = (id: string) =>
  http.request<Result>("delete", `/api/models/meter/${id}`);

export const getGatewayModelList = (data?: object) =>
  http.request<ResultTable>("post", "/api/models/gateway/list", { data });
export const addGatewayModel = (data: object) =>
  http.request<Result>("post", "/api/models/gateway/add", { data });
export const updateGatewayModel = (id: string, data: object) =>
  http.request<Result>("put", `/api/models/gateway/update/${id}`, { data });
export const deleteGatewayModel = (id: string) =>
  http.request<Result>("delete", `/api/models/gateway/${id}`);

// Tree: Gateway → Meter
export const getMeterTree = () =>
  http.request<Result>("get", "/api/water-meters/tree");

// Map data: Gateways + Meters với tọa độ
export const getMapData = () =>
  http.request<Result>("get", "/api/water-meters/map/data");

// HIS_INSTANT_METER — Đồng hồ con
export const getInstantList = (data?: object) =>
  http.request<ResultTable>("post", "/api/water-meters/instant/list", { data });
export const getInstantChart = (data?: object) =>
  http.request<Result>("post", "/api/water-meters/instant/chart", { data });

// HIS_DATA_METER — Data Logger
export const getLoggerList = (data?: object) =>
  http.request<ResultTable>("post", "/api/water-meters/logger/list", { data });
export const getLoggerChart = (data?: object) =>
  http.request<Result>("post", "/api/water-meters/logger/chart", { data });
export const getLoggerProduction = (data?: object) =>
  http.request<Result>("post", "/api/water-meters/logger/production", { data });

// Unit Management (Hierarchy Tree)
export const getUnitTree = () =>
  http.request<Result>("get", "/api/hierarchy/tree");
export const getUnitById = (id: number) =>
  http.request<Result>("get", `/api/hierarchy/units/${id}`);
export const createUnit = (data: object) =>
  http.request<Result>("post", "/api/hierarchy/units", { data });
export const updateUnit = (id: number, data: object) =>
  http.request<Result>("put", `/api/hierarchy/units/${id}`, { data });
export const deleteUnit = (id: number) =>
  http.request<Result>("delete", `/api/hierarchy/units/${id}`);
