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
  http.request<Result>("get", "/api/dashboard/summary");
export const getConsumptionChart = (data?: any) =>
  http.request<ResultTable>("get", "/api/dashboard/consumption-chart", {
    data
  });
export const getZoneConsumption = () =>
  http.request<Result>("get", "/api/dashboard/zone-consumption");
export const getMeterStatus = () =>
  http.request<Result>("get", "/api/dashboard/meter-status");
export const getRealtimeData = () =>
  http.request<Result>("get", "/api/dashboard/realtime");

// Water Meters
export const getWaterMeterList = (data?: object) =>
  http.request<ResultTable>("get", "/api/water-meters", { params: data });
export const getWaterMeterDetail = (id: number) =>
  http.request<Result>("get", `/api/water-meters/${id}`);
export const getWaterMeterReadings = (id: number, data?: any) =>
  http.request<Result>("get", `/api/water-meters/${id}/readings`, {
    params: data
  });
export const createWaterMeter = (data: object) =>
  http.request<Result>("post", "/api/water-meters", { data });
export const updateWaterMeter = (id: number, data: object) =>
  http.request<Result>("put", `/api/water-meters/${id}`, { data });
export const deleteWaterMeter = (id: number) =>
  http.request<Result>("delete", `/api/water-meters/${id}`);
export const addWaterMeterReading = (data: object) =>
  http.request<Result>("post", "/api/water-meters/readings", { data });
export const getWaterMeterStats = () =>
  http.request<Result>("get", "/api/water-meters/stats/summary");

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

// Hierarchy
export const getProvinces = (data?: object) =>
  http.request<Result>("get", "/api/hierarchy/provinces", { params: data });
export const getProvince = (id: number) =>
  http.request<Result>("get", `/api/hierarchy/provinces/${id}`);
export const getDistricts = (data?: object) =>
  http.request<Result>("get", "/api/hierarchy/districts", { params: data });
export const getDistrict = (id: number) =>
  http.request<Result>("get", `/api/hierarchy/districts/${id}`);
export const getWards = (data?: object) =>
  http.request<Result>("get", "/api/hierarchy/wards", { params: data });
export const getZones = (data?: object) =>
  http.request<Result>("get", "/api/hierarchy/zones", { params: data });
export const getClusters = (data?: object) =>
  http.request<Result>("get", "/api/hierarchy/clusters", { params: data });

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
export const getGateways = (data?: object) =>
  http.request<ResultTable>("get", "/api/gateways", { params: data });
export const getGateway = (id: number) =>
  http.request<Result>("get", `/api/gateways/${id}`);
export const createGateway = (data: object) =>
  http.request<Result>("post", "/api/gateways", { data });
export const updateGateway = (id: number, data: object) =>
  http.request<Result>("put", `/api/gateways/${id}`, { data });
export const deleteGateway = (id: number) =>
  http.request<Result>("delete", `/api/gateways/${id}`);
export const getGatewayStats = () =>
  http.request<Result>("get", "/api/gateways/stats/summary");

// Alerts
export const getWaterAlerts = (data?: object) =>
  http.request<ResultTable>("get", "/api/alerts", { params: data });
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
