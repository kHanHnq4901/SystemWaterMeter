<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";

defineOptions({ name: "ReportLossTotal" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const year = ref(dayjs().format("YYYY"));

const statCards = [
  { label: "Tổng thất thoát năm", value: "42,680", unit: "m³", color: "#f56c6c", bg: "#fef0f0" },
  { label: "Tỷ lệ bình quân", value: "16.4", unit: "%", color: "#e6a23c", bg: "#fdf6ec" },
  { label: "Giảm so với năm trước", value: "↓ 2.1", unit: "%", color: "#67c23a", bg: "#f0f9eb" },
  { label: "Tổng đầu vào năm", value: "260,100", unit: "m³", color: "#409eff", bg: "#ecf5ff" }
];

const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

const pieChartRef = ref();
const lineChartRef = ref();
const { setOptions: setPieOptions } = useECharts(pieChartRef, { theme });
const { setOptions: setLineOptions } = useECharts(lineChartRef, { theme });

const zoneData = [
  { name: "Vùng A", value: 11200, rate: 16.1 },
  { name: "Vùng B", value: 7800, rate: 13.9 },
  { name: "Vùng C", value: 13500, rate: 22.1 },
  { name: "Vùng D", value: 6180, rate: 12.4 },
  { name: "Vùng E", value: 4000, rate: 10.8 }
];

function renderPie() {
  setPieOptions({
    tooltip: { trigger: "item", formatter: "{b}: {c} m³ ({d}%)" },
    legend: { orient: "vertical", left: "left", top: "center" },
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      center: ["60%", "50%"],
      data: zoneData.map(d => ({ name: d.name, value: d.value })),
      label: { formatter: "{b}\n{d}%" },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.3)" } }
    }]
  });
}

function renderLine() {
  const lossVals = months.map(() => +(14 + Math.random() * 8).toFixed(1));
  const prevVals = months.map(() => +(16 + Math.random() * 6).toFixed(1));

  setLineOptions({
    tooltip: { trigger: "axis", formatter: (params: any) =>
      `${params[0].axisValue}<br/>${params.map((p: any) => `${p.marker}${p.seriesName}: ${p.value}%`).join("<br/>")}`
    },
    legend: { data: ["Năm nay", "Năm trước"], bottom: 0 },
    grid: { left: 50, right: 20, top: 20, bottom: 50 },
    xAxis: { type: "category", data: months },
    yAxis: { type: "value", name: "%", min: 0, max: 30, axisLabel: { formatter: "{value}%" } },
    series: [
      {
        name: "Năm nay",
        type: "line",
        smooth: true,
        data: lossVals,
        lineStyle: { color: "#f56c6c", width: 2 },
        areaStyle: { color: "rgba(245,108,108,0.1)" },
        itemStyle: { color: "#f56c6c" }
      },
      {
        name: "Năm trước",
        type: "line",
        smooth: true,
        data: prevVals,
        lineStyle: { color: "#909399", width: 2, type: "dashed" },
        itemStyle: { color: "#909399" }
      }
    ]
  });
}

function handleSearch() {
  loading.value = true;
  setTimeout(() => { loading.value = false; renderPie(); renderLine(); }, 600);
}

onMounted(async () => { await nextTick(); renderPie(); renderLine(); });
watch(theme, () => { renderPie(); renderLine(); });
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
        <div class="text-2xl font-bold" :style="{ color: card.color }">
          {{ card.value }}
          <span class="text-sm font-normal ml-1">{{ card.unit }}</span>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div class="xl:col-span-2 bg-bg_color rounded-lg p-4">
        <div class="font-semibold text-sm mb-3">Phân bổ thất thoát theo vùng</div>
        <div ref="pieChartRef" style="height: 280px" />
      </div>
      <div class="xl:col-span-3 bg-bg_color rounded-lg p-4">
        <div class="font-semibold text-sm mb-3">Xu hướng tỷ lệ thất thoát theo tháng (%)</div>
        <div ref="lineChartRef" style="height: 280px" />
      </div>
    </div>

    <!-- Zone summary table -->
    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">Tổng hợp thất thoát theo vùng</div>
      <el-table :data="zoneData" size="small" stripe border>
        <el-table-column prop="name" label="Vùng" />
        <el-table-column prop="value" label="Lượng thất thoát (m³)" align="right">
          <template #default="{ row }">{{ row.value.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="rate" label="Tỷ lệ (%)" align="center" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.rate"
              :color="row.rate >= 20 ? '#f56c6c' : row.rate >= 15 ? '#e6a23c' : '#67c23a'"
              :stroke-width="14"
              :show-text="false"
            />
            <span class="text-xs ml-1">{{ row.rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="Mức độ" align="center" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.rate >= 20 ? 'danger' : row.rate >= 15 ? 'warning' : 'success'"
              size="small"
            >
              {{ row.rate >= 20 ? "Nguy hiểm" : row.rate >= 15 ? "Cảnh báo" : "Đạt chuẩn" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
