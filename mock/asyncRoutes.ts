// Mock routes for Water Meter Collection System
import { defineFakeRoute } from "vite-plugin-fake-server/client";
import {
  system,
  map,
  monitoring,
  device,
  customer,
  billing,
  analysis,
  logs
} from "@/router/enums";

const mapRouter = {
  path: "/map",
  meta: { icon: "ri:map-2-line", title: "Bản đồ", rank: map },
  children: [
    {
      path: "/map/overview",
      name: "MapOverview",
      component: "map/overview/index",
      meta: { icon: "ri:map-range-line", title: "Tổng quan Bản đồ" }
    },
    {
      path: "/map/gateway",
      name: "MapGateway",
      component: "map/gateway/index",
      meta: { icon: "ri:router-line", title: "Bản đồ Gateway" }
    },
    {
      path: "/map/meter",
      name: "MapMeter",
      component: "map/meter/index",
      meta: { icon: "ri:water-drop-line", title: "Bản đồ Đồng hồ" }
    }
  ]
};

const deviceRouter = {
  path: "/device",
  meta: {
    icon: "ri:wireless-charging-line",
    title: "Khai báo Thiết bị",
    rank: device
  },
  children: [
    {
      path: "/device/unit",
      name: "DeviceUnit",
      component: "device/unit/index",
      meta: { icon: "ri:organisation-chart", title: "Quản lý Đơn vị" }
    },
    {
      path: "/device/gateway",
      name: "DeviceGateway",
      component: "device/gateway/index",
      meta: { icon: "ri:router-line", title: "Quản lý Gateway" }
    },
    {
      path: "/device/meter",
      name: "DeviceMeter",
      component: "device/meter/index",
      meta: { icon: "ri:water-drop-line", title: "Quản lý Đồng hồ" }
    },
    {
      path: "/device/model",
      name: "DeviceModel",
      component: "device/model/index",
      meta: { icon: "ri:apps-line", title: "Quản lý Model" }
    }
  ]
};

const monitoringRouter = {
  path: "/monitoring",
  meta: {
    icon: "ri:dashboard-3-line",
    title: "Giám sát",
    rank: monitoring
  },
  children: [
    {
      path: "/monitoring/dashboard",
      name: "MonitoringDashboard",
      component: "monitoring/dashboard/index",
      meta: { icon: "ri:dashboard-line", title: "Dashboard Giám sát" }
    }
  ]
};

const customerRouter = {
  path: "/customer",
  meta: {
    icon: "ri:user-star-line",
    title: "Khách hàng",
    rank: customer
  },
  children: [
    {
      path: "/customer/list",
      name: "CustomerList",
      component: "customer/index",
      meta: { icon: "ri:user-line", title: "Danh sách Khách hàng" }
    }
  ]
};

const billingRouter = {
  path: "/billing",
  meta: {
    icon: "ri:bill-line",
    title: "Thanh toán",
    rank: billing
  },
  children: [
    {
      path: "/billing/invoices",
      name: "BillingInvoices",
      component: "billing/index",
      meta: { icon: "ri:file-text-line", title: "Quản lý Hóa đơn" }
    }
  ]
};

const analysisRouter = {
  path: "/analysis",
  meta: {
    icon: "ri:bar-chart-box-line",
    title: "Phân tích Dữ liệu",
    rank: analysis
  },
  children: [
    {
      path: "/analysis/data",
      name: "AnalysisData",
      component: "analysis/data/index",
      meta: { icon: "ri:database-line", title: "Xem Dữ liệu" }
    },
    {
      path: "/analysis/production",
      name: "AnalysisProduction",
      component: "analysis/production/index",
      meta: { icon: "ri:water-flash-line", title: "Sản lượng Nước" }
    },
    {
      path: "/analysis/loss",
      name: "AnalysisLoss",
      component: "analysis/loss/index",
      meta: { icon: "ri:alarm-warning-line", title: "Tổn thất Nước" }
    },
    {
      path: "/analysis/alert",
      name: "AnalysisAlert",
      component: "analysis/alert/index",
      meta: { icon: "ri:notification-3-line", title: "Cảnh báo" }
    },
    {
      path: "/analysis/report",
      name: "AnalysisReport",
      component: "analysis/report/index",
      meta: { icon: "ri:file-chart-line", title: "Báo cáo" }
    }
  ]
};

const systemRouter = {
  path: "/system",
  meta: {
    icon: "ri:settings-3-line",
    title: "menus.pureSysManagement",
    rank: system
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: "system/user/index",
      meta: {
        icon: "ri:user-settings-line",
        title: "Quản lý Người dùng",
        roles: ["admin"]
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      component: "system/role/index",
      meta: {
        icon: "ri:shield-user-line",
        title: "Quản lý Vai trò",
        roles: ["admin"]
      }
    },
    {
      path: "/system/dept",
      name: "SystemDept",
      component: "system/dept/index",
      meta: {
        icon: "ri:organisation-chart",
        title: "Quản lý Vùng",
        roles: ["admin"]
      }
    },
    {
      path: "/system/menu",
      name: "SystemMenu",
      component: "system/menu/index",
      meta: { icon: "ri:menu-2-line", title: "Quản lý Menu", roles: ["admin"] }
    }
  ]
};

const logsRouter = {
  path: "/logs",
  meta: { icon: "ri:file-history-line", title: "Nhật ký Hệ thống", rank: logs },
  children: [
    {
      path: "/logs/login",
      name: "LoginLog",
      component: "logs/login/index",
      meta: {
        icon: "ri:login-circle-line",
        title: "menus.pureLoginLog",
        roles: ["admin"]
      }
    },
    {
      path: "/logs/operation",
      name: "OperationLog",
      component: "logs/operation/index",
      meta: {
        icon: "ri:history-line",
        title: "menus.pureOperationLog",
        roles: ["admin"]
      }
    },
    {
      path: "/logs/system",
      name: "SystemLog",
      component: "logs/system/index",
      meta: {
        icon: "ri:server-line",
        title: "menus.pureSystemLog",
        roles: ["admin"]
      }
    }
  ]
};

export default defineFakeRoute([
  {
    url: "/api/menus/get-async-routes",
    method: "get",
    response: () => ({
      code: 0,
      info: "SUCCESS",
      data: [
        mapRouter,
        monitoringRouter,
        deviceRouter,
        customerRouter,
        billingRouter,
        analysisRouter,
        systemRouter,
        logsRouter
      ]
    })
  },
  {
    url: "/getMenuList",
    method: "get",
    response: () => ({
      code: 0,
      info: "SUCCESS",
      data: [
        mapRouter,
        monitoringRouter,
        deviceRouter,
        customerRouter,
        billingRouter,
        analysisRouter,
        systemRouter,
        logsRouter
      ]
    })
  }
]);
