import { dayjs, cloneDeep, getRandomIntBetween } from "./utils";

// =============================================================================
// 1. KPI TỔNG QUAN - Các chỉ số chính
// =============================================================================
export const kpiData = [
  {
    title: "Tổng số Gateway",
    value: "15",
    icon: "fa-solid fa-server",
    color: "#14b8a6",
    subValue: "13 đang hoạt động",
    subColor: "#10b981"
  },
  {
    title: "Tổng số Đồng hồ",
    value: "367",
    icon: "fa-solid fa-gauge-high",
    color: "#3b82f6",
    subValue: "320 đang hoạt động",
    subColor: "#10b981"
  },
  {
    title: "Sự kiện tháng này",
    value: "19,338",
    icon: "fa-solid fa-clock",
    color: "#ef4444",
    subValue: "156 cảnh báo",
    subColor: "#f59e0b"
  },
  {
    title: "Tỷ lệ thu thập TB",
    value: "97.15%",
    icon: "fa-solid fa-chart-pie",
    color: "#10b981",
    subValue: "+2.3% so với tháng trước",
    subColor: "#10b981"
  }
];

// =============================================================================
// 2. TRẠNG THÁI ĐỒNG HỒ NƯỚC
// =============================================================================
export const statusMeterData = [
  { name: "Đang hoạt động", value: 320, itemStyle: { color: "#10b981" } },
  { name: "Ngừng hoạt động", value: 28, itemStyle: { color: "#64748b" } },
  { name: "Bảo trì", value: 12, itemStyle: { color: "#f59e0b" } },
  { name: "Hỏng hóc", value: 7, itemStyle: { color: "#ef4444" } }
];

// =============================================================================
// 3. TRẠNG THÁI GATEWAY
// =============================================================================
export const statusGatewayData = [
  { name: "Online", value: 11, itemStyle: { color: "#10b981" } },
  { name: "Offline < 24h", value: 2, itemStyle: { color: "#f59e0b" } },
  { name: "Offline > 24h", value: 2, itemStyle: { color: "#ef4444" } }
];

// =============================================================================
// 4. LOẠI ĐỒNG HỒ NƯỚC
// =============================================================================
export const typeMeterData = [
  { name: "WM-01", value: 316, itemStyle: { color: "#14c49d" } },
  { name: "WM-01A", value: 25, itemStyle: { color: "#4ba3e3" } },
  { name: "WM-02", value: 10, itemStyle: { color: "#f87171" } },
  { name: "WM-02A", value: 1, itemStyle: { color: "#fbbf24" } },
  { name: "WM-03", value: 2, itemStyle: { color: "#1d4ed8" } },
  { name: "Khác", value: 13, itemStyle: { color: "#c084fc" } }
];

// =============================================================================
// 5. PHIÊN BẢN GATEWAY
// =============================================================================
export const typeGatewayData = [
  { name: "GW v4.x", value: 12, itemStyle: { color: "#14c49d" } },
  { name: "GW v3.x", value: 3, itemStyle: { color: "#4ba3e3" } }
];

// =============================================================================
// 6. KẾT NỐI GATEWAY - Trạng thái kết nối
// =============================================================================
export const connectionGatewayData = [
  { name: "Online", value: 11, itemStyle: { color: "#10b981" } },
  { name: "Offline", value: 4, itemStyle: { color: "#ef4444" } }
];

// =============================================================================
// 7. KHU VỰC / VÙNG
// =============================================================================
export const areaMeterData = [
  { name: "Cầu Giấy", value: 125, itemStyle: { color: "#14c49d" } },
  { name: "Ba Đình", value: 98, itemStyle: { color: "#4ba3e3" } },
  { name: "Đống Đa", value: 87, itemStyle: { color: "#f87171" } },
  { name: "Hoàn Kiếm", value: 57, itemStyle: { color: "#fbbf24" } }
];

// =============================================================================
// 8. BIỂU ĐỒ TỶ LỆ THU THẬP 30 NGÀY
// =============================================================================
export const collectionRateData = {
  xAxis: Array.from({ length: 30 }).map((_, i) =>
    dayjs()
      .subtract(29 - i, "day")
      .format("DD/MM")
  ),
  series: [
    94, 96, 95, 97, 96, 98, 97, 99, 96, 97, 98, 96, 97, 95, 96, 97, 98, 99, 97,
    98, 96, 97, 98, 99, 97, 96, 95, 97, 98, 97
  ]
};

// =============================================================================
// 9. BIỂU ĐỒ TIÊU THỤ NƯỚC 7 NGÀY (m³)
// =============================================================================
export const waterConsumptionData = {
  xAxis: Array.from({ length: 7 }).map((_, i) =>
    dayjs()
      .subtract(6 - i, "day")
      .format("DD/MM")
  ),
  series: [12450, 13200, 12800, 14100, 13900, 15000, 14850]
};

// =============================================================================
// 10. BIỂU ĐỒ TỔN THẤT NƯỚC 7 NGÀY (%)
// =============================================================================
export const waterLossTrendData = {
  xAxis: Array.from({ length: 7 }).map((_, i) =>
    dayjs()
      .subtract(6 - i, "day")
      .format("DD/MM")
  ),
  series: [17.0, 18.5, 18.9, 17.5, 17.7, 16.6, 16.8]
};

// =============================================================================
// 11. CẢNH BÁO LIVE - Timeline
// =============================================================================
export const liveAlerts = [
  {
    time: "15:30 Hôm nay",
    title: "Mất kết nối",
    desc: "Gateway GW-CầuGiấy-02 mất tín hiệu 2 giờ.",
    type: "danger",
    color: "#ef4444"
  },
  {
    time: "14:15 Hôm nay",
    title: "Pin yếu",
    desc: "Đồng hồ CE-14A (MTR-1029) dung lượng pin < 15%.",
    type: "warning",
    color: "#f59e0b"
  },
  {
    time: "13:00 Hôm nay",
    title: "Nghi ngờ rò rỉ",
    desc: "Lưu lượng ban đêm khu vực Ba Đình tăng bất thường.",
    type: "danger",
    color: "#ef4444"
  },
  {
    time: "11:45 Hôm nay",
    title: "Cảnh báo mở nắp",
    desc: "Cảm biến vỏ hộp Gateway GW-05 bị mở.",
    type: "warning",
    color: "#f59e0b"
  },
  {
    time: "10:20 Hôm nay",
    title: "Đã khắc phục",
    desc: "Trạm GW-01 đã online trở lại.",
    type: "success",
    color: "#10b981"
  },
  {
    time: "09:30 Hôm nay",
    title: "Báo cáo định kỳ",
    desc: "Báo cáo tuần đã được gửi qua email.",
    type: "success",
    color: "#10b981"
  },
  {
    time: "08:00 Hôm nay",
    title: "Cập nhật FW",
    desc: "Gateway GW-03 đã cập nhật firmware thành công.",
    type: "success",
    color: "#10b981"
  }
];

// =============================================================================
// 12. DỮ LIỆU CHO CÁC THẺ KPI NHỎ (phía trên)
// =============================================================================
export const chartData = [
  {
    icon: "ri:router-line",
    bgColor: "#effaff",
    color: "#41b6ff",
    duration: 2200,
    name: "Gateway hoạt động",
    value: 13,
    percent: "+8%",
    data: [10, 11, 12, 11, 13, 12, 13]
  },
  {
    icon: "ri:water-drop-line",
    bgColor: "#e0f2fe",
    color: "#0ea5e9",
    duration: 1600,
    name: "Đồng hồ gửi dữ liệu",
    value: 315,
    percent: "+5%",
    data: [280, 290, 300, 305, 310, 312, 315]
  },
  {
    icon: "ri:alert-line",
    bgColor: "#fef2f2",
    color: "#ef4444",
    duration: 1500,
    name: "Cảnh báo chưa xử lý",
    value: 23,
    percent: "-12%",
    data: [35, 32, 28, 30, 25, 27, 23]
  },
  {
    icon: "ri:checkbox-circle-line",
    bgColor: "#ecfdf5",
    color: "#10b981",
    duration: 100,
    name: "Sự kiện hôm nay",
    value: 1847,
    percent: "+15%",
    data: [1200, 1350, 1400, 1500, 1600, 1750, 1847]
  }
];

// =============================================================================
// 13. BIỂU ĐỒ CỘT - So sánh sản lượng yêu cầu vs thực tế
// =============================================================================
export const barChartData = [
  {
    requireData: [2101, 5288, 4239, 4962, 6752, 5208, 7450],
    questionData: [2216, 1148, 1255, 1788, 4821, 1973, 4379]
  },
  {
    requireData: [2101, 3280, 4400, 4962, 5752, 6889, 7600],
    questionData: [2116, 3148, 3255, 3788, 4821, 4970, 5390]
  }
];

// =============================================================================
// 14. TỶ LỆ THU THẬP THEO NGÀY
// =============================================================================
export const progressData = Array.from({ length: 7 }).map((_, i) => {
  const percentages = [85, 86, 88, 89, 94, 96, 100];
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return {
    week: days[i],
    percentage: percentages[6 - i],
    duration: 110 - i * 5,
    color: percentages[6 - i] >= 90 ? "#10b981" : "#41b6ff"
  };
});

// =============================================================================
// 15. DỮ LIỆU BẢNG - Danh sách Gateway/Trạm
// =============================================================================
export const tableData = [
  {
    id: "GW-CG-01",
    meterCount: 45,
    online: 43,
    offline: 2,
    lastUpdate: "15:30",
    power: 98,
    status: "online",
    area: "Cầu Giấy"
  },
  {
    id: "GW-CG-02",
    meterCount: 52,
    online: 50,
    offline: 2,
    lastUpdate: "15:28",
    power: 95,
    status: "offline",
    area: "Cầu Giấy"
  },
  {
    id: "GW-BD-01",
    meterCount: 48,
    online: 47,
    offline: 1,
    lastUpdate: "15:30",
    power: 92,
    status: "online",
    area: "Ba Đình"
  },
  {
    id: "GW-BD-02",
    meterCount: 50,
    online: 48,
    offline: 2,
    lastUpdate: "15:25",
    power: 88,
    status: "online",
    area: "Ba Đình"
  },
  {
    id: "GW-DD-01",
    meterCount: 47,
    online: 45,
    offline: 2,
    lastUpdate: "15:29",
    power: 97,
    status: "online",
    area: "Đống Đa"
  },
  {
    id: "GW-DD-02",
    meterCount: 40,
    online: 38,
    offline: 2,
    lastUpdate: "15:20",
    power: 90,
    status: "online",
    area: "Đống Đa"
  },
  {
    id: "GW-HK-01",
    meterCount: 57,
    online: 53,
    offline: 4,
    lastUpdate: "15:30",
    power: 85,
    status: "online",
    area: "Hoàn Kiếm"
  },
  {
    id: "GW-HK-02",
    meterCount: 28,
    online: 0,
    offline: 28,
    lastUpdate: "08:15",
    power: 0,
    status: "offline",
    area: "Hoàn Kiếm"
  }
];

// =============================================================================
// 16. TIMELINE - Hoạt động gần đây
// =============================================================================
const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const latestNewsData = cloneDeep(tableData)
  .slice(0, 10)
  .map((item: (typeof tableData)[number], index: number) => ({
    id: item.id,
    date: `${dayjs().subtract(index, "day").format("YYYY-MM-DD")} ${days[dayjs().subtract(index, "day").day()]}`,
    requiredNumber: getRandomIntBetween(13500, 19999),
    questionNumber: getRandomIntBetween(100, 500),
    resolveNumber: getRandomIntBetween(50, 300),
    satisfaction: getRandomIntBetween(85, 100)
  }));
