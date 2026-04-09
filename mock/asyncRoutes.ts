// Mock routes for Water Meter Collection System
import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { system, map, device, analysis, logs } from "@/router/enums";

const mapRouter = {
  path: "/map",
  meta: { icon: "ri:map-2-line", title: "Bản đồ", rank: map },
  children: [
    {
      path: "/map/overview",
      name: "MapOverview",
      meta: { icon: "ri:map-range-line", title: "Tổng quan Bản đồ" }
    },
    {
      path: "/map/gateway",
      name: "MapGateway",
      meta: { icon: "ri:router-line", title: "Bản đồ Gateway" }
    },
    {
      path: "/map/meter",
      name: "MapMeter",
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
      path: "/device/gateway",
      name: "DeviceGateway",
      meta: { icon: "ri:router-line", title: "Quản lý Gateway" }
    },
    {
      path: "/device/meter",
      name: "DeviceMeter",
      meta: { icon: "ri:water-drop-line", title: "Quản lý Đồng hồ" }
    },
    {
      path: "/device/area",
      name: "DeviceArea",
      meta: { icon: "ri:map-pin-range-line", title: "Quản lý Khu vực" }
    },
    {
      path: "/device/model",
      name: "DeviceModel",
      meta: { icon: "ri:apps-line", title: "Quản lý Model" }
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
      meta: { icon: "ri:database-line", title: "Xem Dữ liệu" }
    },
    {
      path: "/analysis/production",
      name: "AnalysisProduction",
      meta: { icon: "ri:water-flash-line", title: "Sản lượng Nước" }
    },
    {
      path: "/analysis/loss",
      name: "AnalysisLoss",
      meta: { icon: "ri:alarm-warning-line", title: "Tổn thất Nước" }
    },
    {
      path: "/analysis/alert",
      name: "AnalysisAlert",
      meta: { icon: "ri:notification-3-line", title: "Cảnh báo" }
    },
    {
      path: "/analysis/report",
      name: "AnalysisReport",
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
      meta: {
        icon: "ri:user-settings-line",
        title: "Quản lý Người dùng",
        roles: ["admin"]
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      meta: {
        icon: "ri:shield-user-line",
        title: "Quản lý Vai trò",
        roles: ["admin"]
      }
    },
    {
      path: "/system/dept",
      name: "SystemDept",
      meta: {
        icon: "ri:organisation-chart",
        title: "Quản lý Phòng ban",
        roles: ["admin"]
      }
    },
    {
      path: "/system/menu",
      name: "SystemMenu",
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
      meta: {
        icon: "ri:login-circle-line",
        title: "menus.pureLoginLog",
        roles: ["admin"]
      }
    },
    {
      path: "/logs/operation",
      name: "OperationLog",
      meta: {
        icon: "ri:history-line",
        title: "menus.pureOperationLog",
        roles: ["admin"]
      }
    },
    {
      path: "/logs/system",
      name: "SystemLog",
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
    url: "/getMenuList",
    method: "get",
    response: () => {
      return {
        code: 0,
        info: "SUCCESS",
        data: [
          mapRouter,
          deviceRouter,
          analysisRouter,
          systemRouter,
          logsRouter
        ]
      };
    }
  }
]);
