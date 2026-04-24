<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";

defineOptions({ name: "ReportProduction" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const year = ref(dayjs().format("YYYY"));
const selectedZone = ref("");

const zones = [
  { label: "Tất cả vùng", value: "" },
  { label: "Vùng A", value: "A" },
  { label: "Vùng B", value: "B" },
  { label: "Vùng C", value: "C" },
  { label: "Vùng D", value: "D" }
];

const statCards = [
  { label: "Tổng sản lượng năm", value: "217,420", unit: "m³", color: "#409eff", bg: "#ecf5ff" },
  { label: "Sản lượng TB/tháng", value: "18,118", unit: "m³", color: "#67c23a", bg: "#f0f9eb" },
  { label: "Tháng cao nhất", value: "T7 – 24,310", unit: "m³", color: "#e6a23c", bg: "#fdf6ec" },
  { label: "Tăng trưởng YoY", value: "+8.4", unit: "%", color: "#9b59b6", bg: "#f5f0ff" }
];

const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
const prodData = [15200, 14800, 16400, 17100, 19200, 21000, 24310, 22800, 20100, 18700, 16200, 11610];
const prevData = [13800, 13200, 15000, 15500, 17800, 19200, 22100, 20900, 18400, 17200, 14900, 10500];

const barChartRef = ref();
const { setOptions: setBarOptions } = useECharts(barChartRef, { theme });

function renderBar() {
  setBarOptions({
    tooltip: {
      trigger: "axis",
      formatter: (params: any) =>
        `${params[0].axisValue}<br/>${params.map((p: any) =>
          `${p.marker}${p.seriesName}: <b>${p.value.toLocaleString()}</b> m³`).join("<br/>")}`
    },
    legend: { data: ["Năm nay", "Năm trước"], bottom: 0 },
    grid: { left: 70, right: 20, top: 20, bottom: 50 },
    xAxis: { type: "category", data: months },
    yAxis: { type: "value", name: "m³", axisLabel: { formatter: (v: number) => (v / 1000).toFixed(0) + "k" } },
    series: [
      {
        name: "Năm nay",
        type: "bar",
        data: prodData,
        itemStyle: { color: "#409eff", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28
      },
      {
        name: "Năm trước",
        type: "bar",
        data: prevData,
        itemStyle: { color: "#c0d9ff", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28
      }
    ]
  });
}

const tableData = months.map((m, i) => ({
  month: m,
  current: prodData[i],
  prev: prevData[i],
  growth: +(((prodData[i] - prevData[i]) / prevData[i]) * 100).toFixed(1),
  target: Math.floor(prodData[i] * (0.9 + Math.random() * 0.2)),
  achieve: 0
})).map(r => { r.achieve = +((r.current / r.target) * 100).toFixed(1); return r; });

function handleSearch() {
  loading.value = true;
  setTimeout(() => { loading.value = false; renderBar(); }, 600);
}

onMounted(async () => { await nextTick(); renderBar(); });
watch(theme, () => renderBar());
</script>

<template>
  <div class="main p-4 space-y-4">
    <!-- Filter -->
    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-center gap-3">
      <el-date-picker
        v-model="year"
        type="year"
        placeholder="Chọn năm"
        format="YYYY"
        value-format="YYYY"
        style="width: 120px"
      />
      <el-select v-model="selectedZone" placeholder="Chọn vùng" style="width: 160px" clearable>
        <el-option v-for="z in zones" :key="z.value" :label="z.label" :value="z.value" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="handleSearch">Tìm kiếm</el-button>
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
        <div class="text-xl font-bold leading-tight" :style="{ color: card.color }">
          {{ card.value }}
          <span class="text-sm font-normal ml-1">{{ card.unit }}</span>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">Sản lượng nước theo tháng (m³)</div>
      <div ref="barChartRef" style="height: 300px" />
    </div>

    <!-- Table -->
    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">Bảng sản lượng theo tháng</div>
      <el-table :data="tableData" size="small" stripe border show-summary
        :summary-method="() => ['Tổng / TB', '', prodData.reduce((a,b)=>a+b,0).toLocaleString(), prevData.reduce((a,b)=>a+b,0).toLocaleString(), '', '', '']"
      >
        <el-table-column prop="month" label="Tháng" align="center" width="70" />
        <el-table-column prop="current" label="Năm nay (m³)" align="right">
          <template #default="{ row }">{{ row.current.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="prev" label="Năm trước (m³)" align="right">
          <template #default="{ row }">{{ row.prev.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="growth" label="Tăng trưởng" align="center" width="110">
          <template #default="{ row }">
            <span :class="row.growth >= 0 ? 'text-success' : 'text-danger'" class="font-semibold">
              {{ row.growth >= 0 ? "+" : "" }}{{ row.growth }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="Kế hoạch (m³)" align="right">
          <template #default="{ row }">{{ row.target.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="achieve" label="Đạt KH (%)" align="center" width="110">
          <template #default="{ row }">
            <el-tag :type="row.achieve >= 100 ? 'success' : row.achieve >= 90 ? 'warning' : 'danger'" size="small">
              {{ row.achieve }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
