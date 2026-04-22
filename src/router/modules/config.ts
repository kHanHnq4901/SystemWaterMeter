import { config } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/config",
  name: "Config",
  component: Layout,
  redirect: "/config/meter-model",
  meta: {
    icon: "ri:settings-4-line",
    title: "Cấu hình hệ thống",
    rank: config
  },
  children: [
    {
      path: "/config/meter-model",
      name: "ConfigMeterModel",
      component: () => import("@/views/config/meter-model/index.vue"),
      meta: {
        icon: "ri:drop-line",
        title: "Cài đặt loại đồng hồ",
        showLink: true
      }
    },
    {
      path: "/config/gateway-model",
      name: "ConfigGatewayModel",
      component: () => import("@/views/config/gateway-model/index.vue"),
      meta: {
        icon: "ri:router-line",
        title: "Cài đặt kiểu Gateway",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
