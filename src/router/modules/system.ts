import { $t } from "@/plugins/i18n";
import { system } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/system",
  name: "System",
  component: Layout,
  redirect: "/system/user",
  meta: {
    icon: "ri:settings-3-line",
    title: $t("menus.pureSysManagement"),
    rank: system
  },
  children: [
    {
      path: "/system/user",
      name: "SystemUser",
      component: () => import("@/views/system/user/index.vue"),
      meta: {
        icon: "ri:user-settings-line",
        title: "Quản lý Người dùng",
        showLink: true
      }
    },
    {
      path: "/system/role",
      name: "SystemRole",
      component: () => import("@/views/system/role/index.vue"),
      meta: {
        icon: "ri:shield-user-line",
        title: "Quản lý Vai trò",
        showLink: true
      }
    },
    {
      path: "/system/dept",
      name: "SystemDept",
      component: () => import("@/views/system/dept/index.vue"),
      meta: {
        icon: "ri:organisation-chart",
        title: "Quản lý Phòng ban",
        showLink: true
      }
    },
    {
      path: "/system/menu",
      name: "SystemMenu",
      component: () => import("@/views/system/menu/index.vue"),
      meta: {
        icon: "ri:menu-2-line",
        title: "Quản lý Menu",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
