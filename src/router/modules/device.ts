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
        icon: "ri:drop-line",
        title: "Quản lý Đồng hồ",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
