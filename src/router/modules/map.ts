import { $t } from "@/plugins/i18n";
import { map } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/map",
  name: "Map",
  component: Layout,
  redirect: "/map/index",
  meta: {
    icon: "ri:map-2-line",
    title: "Bản đồ",
    rank: map
  },
  children: [
    {
      path: "/map/index",
      name: "MapIndex",
      component: () => import("@/views/map/index.vue"),
      meta: {
        icon: "ri:map-range-line",
        title: "Bản đồ",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
