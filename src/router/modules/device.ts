import { $t } from "@/plugins/i18n";
import { device } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/device",
  name: "Device",
  component: Layout,
  redirect: "/device/gateway",
  meta: {
    icon: "ri:wireless-charging-line",
    title: "Khai báo Thiết bị",
    rank: device
  },
  children: [
    {
      path: "/device/gateway",
      name: "DeviceGateway",
      component: () => import("@/views/device/gateway/index.vue"),
      meta: {
        icon: "ri:router-line",
        title: "Quản lý Gateway",
        showLink: true
      }
    },
    {
      path: "/device/meter",
      name: "DeviceMeter",
      component: () => import("@/views/device/meter/index.vue"),
      meta: {
        icon: "ri:water-drop-line",
        title: "Quản lý Đồng hồ",
        showLink: true
      }
    },
    {
      path: "/device/area",
      name: "DeviceArea",
      component: () => import("@/views/device/area/index.vue"),
      meta: {
        icon: "ri:map-pin-range-line",
        title: "Quản lý Khu vực",
        showLink: true
      }
    },
    {
      path: "/device/model",
      name: "DeviceModel",
      component: () => import("@/views/device/model/index.vue"),
      meta: {
        icon: "ri:apps-line",
        title: "Quản lý Model",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
