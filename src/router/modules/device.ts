import { device } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/device",
  name: "Device",
  component: Layout,
  redirect: "/device/unit",
  meta: {
    icon: "ri:wireless-charging-line",
    title: "Khai báo Thiết bị",
    rank: device
  },
  children: [
    {
      path: "/device/unit",
      name: "DeviceUnit",
      component: () => import("@/views/device/unit/index.vue"),
      meta: {
        icon: "ri:organisation-chart",
        title: "Quản lý Đơn vị",
        showLink: true
      }
    },
    {
      path: "/device/province",
      name: "DeviceProvince",
      component: () => import("@/views/device/province/index.vue"),
      meta: {
        icon: "ri:map-pin-2-line",
        title: "Quản lý Tỉnh/TP",
        showLink: true
      }
    },
    {
      path: "/device/district",
      name: "DeviceDistrict",
      component: () => import("@/views/device/district/index.vue"),
      meta: {
        icon: "ri:map-pin-line",
        title: "Quản lý Quận/Huyện",
        showLink: true
      }
    },
    {
      path: "/device/ward",
      name: "DeviceWard",
      component: () => import("@/views/device/ward/index.vue"),
      meta: {
        icon: "ri:map-2-line",
        title: "Quản lý Phường/Xã",
        showLink: true
      }
    },
    {
      path: "/device/zone",
      name: "DeviceZone",
      component: () => import("@/views/device/zone/index.vue"),
      meta: {
        icon: "ri:focus-3-line",
        title: "Quản lý Khu vực",
        showLink: true
      }
    },
    {
      path: "/device/cluster",
      name: "DeviceCluster",
      component: () => import("@/views/device/cluster/index.vue"),
      meta: {
        icon: "ri:apps-line",
        title: "Quản lý Cụm",
        showLink: true
      }
    },
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
      path: "/device/model",
      name: "DeviceModel",
      component: () => import("@/views/device/model/index.vue"),
      meta: {
        icon: "ri:server-line",
        title: "Quản lý Model",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
