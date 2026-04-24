import { $t } from "@/plugins/i18n";
import { logs } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/logs",
  name: "Logs",
  component: Layout,
  redirect: "/logs/login",
  meta: {
    icon: "ri:file-history-line",
    title: "Nhật ký Hệ thống",
    rank: logs,
    roles: ["admin"]
  },
  children: [
    {
      path: "/logs/login",
      name: "LoginLog",
      component: () => import("@/views/logs/login/index.vue"),
      meta: {
        icon: "ri:login-circle-line",
        title: $t("menus.pureLoginLog"),
        showLink: true
      }
    },
    {
      path: "/logs/operation",
      name: "OperationLog",
      component: () => import("@/views/logs/operation/index.vue"),
      meta: {
        icon: "ri:history-line",
        title: $t("menus.pureOperationLog"),
        showLink: true
      }
    },
    {
      path: "/logs/system",
      name: "SystemLog",
      component: () => import("@/views/logs/system/index.vue"),
      meta: {
        icon: "ri:server-line",
        title: $t("menus.pureSystemLog"),
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
