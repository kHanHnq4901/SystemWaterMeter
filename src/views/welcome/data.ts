import { dayjs, cloneDeep, getRandomIntBetween } from "./utils";
import GroupLine from "~icons/ri/group-line";
import Question from "~icons/ri/question-answer-line";
import CheckLine from "~icons/ri/chat-check-line";
import Smile from "~icons/ri/star-smile-line";


// 1. Dữ liệu 4 thẻ trên cùng
export const kpiData = [
  { title: "Tổng số lượng Gateway", value: "15", icon: "fa-solid fa-server", color: "#14b8a6" },
  { title: "Tổng số đồng hồ", value: "367", icon: "fa-solid fa-gauge-high", color: "#3b82f6" },
  { title: "Số lượng sự kiện tháng", value: "19,338", icon: "fa-solid fa-earth-americas", color: "#ef4444" },
  { title: "Tỷ lệ thu thập trung bình", value: "97.15 %", icon: "fa-solid fa-chart-simple", color: "#10b981" }
];

// 2. Dữ liệu 4 biểu đồ tròn ở giữa
export const statusMeterData = [
  { name: "Đã cài đặt", value: 320, itemStyle: { color: "#14c49d" } },
  { name: "Đã lưu trữ", value: 40, itemStyle: { color: "#4ba3e3" } },
  { name: "Đã phân bổ", value: 3, itemStyle: { color: "#f87171" } },
  { name: "Đã xoá", value: 4, itemStyle: { color: "#fbbf24" } }
];

export const statusGatewayData = [
  { name: "Đã cài đặt", value: 13, itemStyle: { color: "#14c49d" } },
  { name: "Đã lưu trữ", value: 2, itemStyle: { color: "#4ba3e3" } }
];

export const typeMeterData = [
  { name: "WM-01", value: 316, itemStyle: { color: "#14c49d" } },
  { name: "WM-01A", value: 25, itemStyle: { color: "#4ba3e3" } },
  { name: "WM-02", value: 10, itemStyle: { color: "#f87171" } },
  { name: "WM-02A", value: 1, itemStyle: { color: "#fbbf24" } },
  { name: "WM-03", value: 2, itemStyle: { color: "#1d4ed8" } },
  { name: "Khác", value: 13, itemStyle: { color: "#c084fc" } }
];

export const typeGatewayData = [
  { name: "GW v4", value: 15, itemStyle: { color: "#14c49d" } }
];

// 3. Dữ liệu biểu đồ tròn dưới cùng (Trạng thái kết nối GW)
export const connectionGatewayData = [
  { name: "Online", value: 2, itemStyle: { color: "#16a34a" } },
  { name: "Offline(24h < t)", value: 10, itemStyle: { color: "#f97316" } },
  { name: "Chưa bao giờ online", value: 1, itemStyle: { color: "#8b5cf6" } }
];

// 4. Dữ liệu biểu đồ cột (Tỷ lệ thu thập 30 ngày)
export const collectionRateData = {
  xAxis: Array.from({ length: 30 }).map((_, i) => dayjs().subtract(29 - i, "day").format("YYYY-MM-DD")),
  series: Array.from({ length: 30 }).map(() => Math.floor(Math.random() * (100 - 90 + 1) + 90)) // Random 90-100%
};

export const waterConsumptionData = {
  xAxis: Array.from({ length: 7 }).map((_, i) => dayjs().subtract(6 - i, "day").format("DD/MM")),
  series: [12450, 13200, 12800, 14100, 13900, 15000, 14850] // m³ nước
};

// [MỚI] 3. Dữ liệu Cảnh báo Live (Timeline)
export const liveAlerts = [
  { time: "10:30 Hôm nay", title: "Mất kết nối", desc: "Gateway GW-CầuGiấy-02 mất tín hiệu 2 giờ.", type: "danger", color: "#ef4444" },
  { time: "09:15 Hôm nay", title: "Pin yếu", desc: "Đồng hồ CE-14A (MTR-1029) dung lượng pin < 15%.", type: "warning", color: "#f59e0b" },
  { time: "08:00 Hôm nay", title: "Nghi ngờ rò rỉ", desc: "Lưu lượng ban đêm khu vực Ba Đình tăng bất thường.", type: "danger", color: "#ef4444" },
  { time: "18:45 Hôm qua", title: "Cảnh báo mở nắp", desc: "Cảm biến vỏ hộp Gateway GW-05 bị mở.", type: "warning", color: "#f59e0b" },
  { time: "14:20 Hôm qua", title: "Đã khắc phục", desc: "Trạm GW-01 đã online trở lại.", type: "success", color: "#10b981" },
];

// [MỚI] Dữ liệu Xu hướng Tổn thất nước 7 ngày qua (%)
export const waterLossTrendData = [17.0, 18.5, 18.9, 17.5, 17.7, 16.6, 16.8];

const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 需求人数、提问数量、解决数量、用户满意度 */
const chartData = [
  {
    icon: GroupLine,
    bgColor: "#effaff",
    color: "#41b6ff",
    duration: 2200,
    name: "需求人数",
    value: 36000,
    percent: "+88%",
    data: [2101, 5288, 4239, 4962, 6752, 5208, 7450] // 平滑折线图数据
  },
  {
    icon: Question,
    bgColor: "#fff5f4",
    color: "#e85f33",
    duration: 1600,
    name: "提问数量",
    value: 16580,
    percent: "+70%",
    data: [2216, 1148, 1255, 788, 4821, 1973, 4379]
  },
  {
    icon: CheckLine,
    bgColor: "#eff8f4",
    color: "#26ce83",
    duration: 1500,
    name: "解决数量",
    value: 16499,
    percent: "+99%",
    data: [861, 1002, 3195, 1715, 3666, 2415, 3645]
  },
  {
    icon: Smile,
    bgColor: "#f6f4fe",
    color: "#7846e5",
    duration: 100,
    name: "用户满意度",
    value: 100,
    percent: "+100%",
    data: [100]
  }
];

/** 分析概览 */
const barChartData = [
  {
    requireData: [2101, 5288, 4239, 4962, 6752, 5208, 7450],
    questionData: [2216, 1148, 1255, 1788, 4821, 1973, 4379]
  },
  {
    requireData: [2101, 3280, 4400, 4962, 5752, 6889, 7600],
    questionData: [2116, 3148, 3255, 3788, 4821, 4970, 5390]
  }
];

/** 解决概率 */
const progressData = [
  {
    week: "周一",
    percentage: 85,
    duration: 110,
    color: "#41b6ff"
  },
  {
    week: "周二",
    percentage: 86,
    duration: 105,
    color: "#41b6ff"
  },
  {
    week: "周三",
    percentage: 88,
    duration: 100,
    color: "#41b6ff"
  },
  {
    week: "周四",
    percentage: 89,
    duration: 95,
    color: "#41b6ff"
  },
  {
    week: "周五",
    percentage: 94,
    duration: 90,
    color: "#26ce83"
  },
  {
    week: "周六",
    percentage: 96,
    duration: 85,
    color: "#26ce83"
  },
  {
    week: "周日",
    percentage: 100,
    duration: 80,
    color: "#26ce83"
  }
].reverse();

/** 数据统计 */
const tableData = Array.from({ length: 30 }).map((_, index) => {
  return {
    id: index + 1,
    requiredNumber: getRandomIntBetween(13500, 19999),
    questionNumber: getRandomIntBetween(12600, 16999),
    resolveNumber: getRandomIntBetween(13500, 17999),
    satisfaction: getRandomIntBetween(95, 100),
    date: dayjs().subtract(index, "day").format("YYYY-MM-DD")
  };
});

/** 最新动态 */
const latestNewsData = cloneDeep(tableData)
  .slice(0, 14)
  .map((item, index) => {
    return Object.assign(item, {
      date: `${dayjs().subtract(index, "day").format("YYYY-MM-DD")} ${
        days[dayjs().subtract(index, "day").day()]
      }`
    });
  });

export { chartData, barChartData, progressData, tableData, latestNewsData };
