import { $t } from "@/plugins/i18n";
import { map } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/map",
  name: "Map",
  component: Layout,
  redirect: "/map/overview",
  meta: {
    icon: "ri:map-2-line",
    title: "Bản đồ",
    rank: map
  },
  children: [
    {
      path: "/map/overview",
      name: "MapOverview",
      component: () => import("@/views/map/overview/index.vue"),
      meta: {
        icon: "ri:map-range-line",
        title: "Tổng quan Bản đồ",
        showLink: true
      }
    },
    {
      path: "/map/gateway",
      name: "MapGateway",
      component: () => import("@/views/map/gateway/index.vue"),
      meta: {
        icon: "ri:router-line",
        title: "Bản đồ Gateway",
        showLink: true
      }
    },
    {
      path: "/map/meter",
      name: "MapMeter",
      component: () => import("@/views/map/meter/index.vue"),
      meta: {
        icon: "ri:water-drop-line",
        title: "Bản đồ Đồng hồ",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
