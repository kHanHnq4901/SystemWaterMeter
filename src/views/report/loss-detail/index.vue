<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";

defineOptions({ name: "ReportLossDetail" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const month = ref(dayjs().format("YYYY-MM"));
const selectedZone = ref("");

const zones = [
  { label: "Tất cả", value: "" },
  { label: "Vùng A", value: "A" },
  { label: "Vùng B", value: "B" },
  { label: "Vùng C", value: "C" },
  { label: "Vùng D", value: "D" }
];

const statCards = [
  { label: "Tổng thất thoát", value: "3,840", unit: "m³", color: "#f56c6c", bg: "#fef0f0" },
  { label: "Tỷ lệ thất thoát TB", value: "15.8", unit: "%", color: "#e6a23c", bg: "#fdf6ec" },
  { label: "Vùng cao nhất", value: "Vùng C", unit: "22.1%", color: "#9b59b6", bg: "#f5f0ff" },
  { label: "Điểm rò rỉ phát hiện", value: "7", unit: "điểm", color: "#409eff", bg: "#ecf5ff" }
];

const tableData = ref([
  { zone: "Vùng A - Trung tâm", pipes: 12, input: 8200, output: 7010, loss: 1190, rate: 14.5, status: "warning" },
  { zone: "Vùng B - Đông", pipes: 8, input: 5600, output: 4900, loss: 700, rate: 12.5, status: "normal" },
  { zone: "Vùng C - Tây", pipes: 15, input: 6800, output: 5298, loss: 1502, rate: 22.1, status: "danger" },
  { zone: "Vùng D - Nam", pipes: 10, input: 4900, output: 4352, loss: 548, rate: 11.2, status: "normal" },
  { zone: "Vùng E - Bắc", pipes: 6, input: 3100, output: 2800, loss: 300, rate: 9.7, status: "normal" },
  { zone: "Vùng F - Ngoại ô", pipes: 9, input: 2400, output: 1940, loss: 460, rate: 19.2, status: "warning" }
]);

const chartRef = ref();
const { setOptions } = useECharts(chartRef, { theme });

function renderChart() {
  const zones = tableData.value.map(r => r.zone.split(" - ")[0]);
  const losses = tableData.value.map(r => r.loss);
  const rates = tableData.value.map(r => r.rate);

  setOptions({
    tooltip: { trigger: "axis" },
    legend: { data: ["Lượng thất thoát (m³)", "Tỷ lệ (%)"], bottom: 0 },
    grid: { left: 70, right: 60, top: 20, bottom: 50 },
    xAxis: { type: "category", data: zones },
    yAxis: [
      { type: "value", name: "m³", position: "left" },
      { type: "value", name: "%", position: "right", min: 0, max: 30, axisLabel: { formatter: "{value}%" } }
    ],
    series: [
      {
        name: "Lượng thất thoát (m³)",
        type: "bar",
        data: losses,
        itemStyle: {
          color: (p: any) => {
            const rate = rates[p.dataIndex];
            return rate >= 20 ? "#f56c6c" : rate >= 15 ? "#e6a23c" : "#67c23a";
          },
          borderRadius: [3, 3, 0, 0]
        },
        barMaxWidth: 36
      },
      {
        name: "Tỷ lệ (%)",
        type: "line",
        yAxisIndex: 1,
        data: rates,
        smooth: true,
        lineStyle: { color: "#9b59b6", width: 2 },
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: "#9b59b6" }
      }
    ]
  });
}

function statusType(s: string) {
  return s === "danger" ? "danger" : s === "warning" ? "warning" : "success";
}
function statusLabel(s: string) {
  return s === "danger" ? "Nguy hiểm" : s === "warning" ? "Cảnh báo" : "Bình thường";
}

function handleSearch() {
  loading.value = true;
  setTimeout(() => { loading.value = false; renderChart(); }, 600);
}

onMounted(async () => { await nextTick(); renderChart(); });
watch(theme, () => renderChart());
</script>

<template>
  <div class="main p-4 space-y-4">
    <!-- Filter -->
    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-center gap-3">
      <el-date-picker
        v-model="month"
        type="month"
        placeholder="Chọn tháng"
        format="MM/YYYY"
        value-format="YYYY-MM"
        style="width: 150px"
      />
      <el-select v-model="selectedZone" placeholder="Chọn vùng" style="width: 160px" clearable>
        <el-option v-for="z in zones" :key="z.value" :label="z.label" :value="z.value" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="handleSearch">Tìm kiếm</el-button>
      <el-button @click="handleSearch">Làm mới</el-button>
      <el-button type="success" class="ml-auto">
        <template #icon><i class="i-ri:download-line" /></template>
        Xuất Excel
      </el-button>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="rounded-lg p-4"
        :style="{ background: card.bg }"
      >
        <div class="text-xs text-gray-500 mb-1">{{ card.label }}</div>
        <div class="text-2xl font-bold" :style="{ color: card.color }">
          {{ card.value }}
          <span class="text-sm font-normal ml-1">{{ card.unit }}</span>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">Thất thoát theo vùng</div>
      <div ref="chartRef" style="height: 280px" />
    </div>

    <!-- Table -->
    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">Chi tiết thất thoát từng vùng</div>
      <el-table :data="tableData" size="small" stripe border>
        <el-table-column prop="zone" label="Vùng / Khu vực" min-width="160" />
        <el-table-column prop="pipes" label="Số tuyến ống" align="center" width="100" />
        <el-table-column prop="input" label="Đầu vào (m³)" align="right">
          <template #default="{ row }">{{ row.input.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="output" label="Đầu ra (m³)" align="right">
          <template #default="{ row }">{{ row.output.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="loss" label="Thất thoát (m³)" align="right">
          <template #default="{ row }">
            <span class="font-semibold text-danger">{{ row.loss.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rate" label="Tỷ lệ (%)" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.rate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Đánh giá" align="center" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" align="center" width="90">
          <template #default>
            <el-button class="reset-margin" link type="primary" size="small">Chi tiết</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
