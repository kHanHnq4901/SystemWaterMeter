import { $t } from "@/plugins/i18n";
import { analysis } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/analysis",
  name: "Analysis",
  component: Layout,
  redirect: "/analysis/data",
  meta: {
    icon: "ri:bar-chart-box-line",
    title: "Phân tích Dữ liệu",
    rank: analysis
  },
  children: [
    {
      path: "/analysis/data",
      name: "AnalysisData",
      component: () => import("@/views/analysis/data/index.vue"),
      meta: { icon: "ri:database-line", title: "Xem Dữ liệu", showLink: true }
    },
    {
      path: "/analysis/production",
      name: "AnalysisProduction",
      component: () => import("@/views/analysis/production/index.vue"),
      meta: { icon: "ri:water-flash-line", title: "Sản lượng Nước", showLink: true }
    },
    {
      path: "/analysis/loss",
      name: "AnalysisLoss",
      component: () => import("@/views/analysis/loss/index.vue"),
      meta: { icon: "ri:alarm-warning-line", title: "Tổn thất Nước", showLink: true }
    },
    {
      path: "/analysis/alert",
      name: "AnalysisAlert",
      component: () => import("@/views/analysis/alert/index.vue"),
      meta: { icon: "ri:notification-3-line", title: "Cảnh báo", showLink: true }
    },
    {
      path: "/analysis/report",
      name: "AnalysisReport",
      component: () => import("@/views/analysis/report/index.vue"),
      meta: { icon: "ri:file-chart-line", title: "Báo cáo", showLink: true }
    }
  ]
} satisfies RouteConfigsTable;
