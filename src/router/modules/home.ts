import { $t } from "@/plugins/i18n";
import { home } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Dashboard",
  component: Layout,
  redirect: "/welcome",
  meta: {
    icon: "ri:dashboard-line",
    title: "Bảng điều khiển",
    rank: home
  },
  children: [
    {
      path: "/welcome",
      name: "Welcome",
      component: () => import("@/views/welcome/index.vue"),
      meta: {
        title: "Bảng điều khiển",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
