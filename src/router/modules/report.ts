import { report } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/report",
  name: "Report",
  component: Layout,
  redirect: "/report/pressure",
  meta: {
    icon: "ri:file-chart-2-line",
    title: "Báo cáo mạng lưới",
    rank: report
  },
  children: [
    {
      path: "/report/pressure",
      name: "ReportPressure",
      component: () => import("@/views/report/pressure/index.vue"),
      meta: {
        icon: "ri:speed-up-line",
        title: "Áp lực",
        showLink: true
      }
    },
    {
      path: "/report/flow",
      name: "ReportFlow",
      component: () => import("@/views/report/flow/index.vue"),
      meta: {
        icon: "ri:water-flash-line",
        title: "Lưu lượng",
        showLink: true
      }
    },
    {
      path: "/report/loss-detail",
      name: "ReportLossDetail",
      component: () => import("@/views/report/loss-detail/index.vue"),
      meta: {
        icon: "ri:error-warning-line",
        title: "Thất thoát chi tiết",
        showLink: true
      }
    },
    {
      path: "/report/loss-total",
      name: "ReportLossTotal",
      component: () => import("@/views/report/loss-total/index.vue"),
      meta: {
        icon: "ri:pie-chart-2-line",
        title: "Thất thoát tổng",
        showLink: true
      }
    },
    {
      path: "/report/production",
      name: "ReportProduction",
      component: () => import("@/views/report/production/index.vue"),
      meta: {
        icon: "ri:bar-chart-grouped-line",
        title: "Báo cáo sản lượng",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
