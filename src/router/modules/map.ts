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
        icon: "ri:map-pin-range-line",
        title: "Bản đồ Chi tiết",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
