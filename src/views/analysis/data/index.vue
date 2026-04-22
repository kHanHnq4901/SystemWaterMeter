<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import {
  getMeterTree,
  getInstantList, getInstantChart,
  getLoggerList,  getLoggerChart
} from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "AnalysisData" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

// ══════════════════════════════════════════════════════════════════
// TREE
// ══════════════════════════════════════════════════════════════════
const treeRef       = ref();
const treeData      = ref<any[]>([]);
const treeKeyword   = ref("");
const treeLoading   = ref(false);
const defaultExpand = ref(["ALL"]);

const selected = reactive({
  type:      "root" as "root" | "gateway" | "meter",
  gatewayNo: "",
  meterNo:   "",
  label:     "Tất cả thiết bị"
});

watch(treeKeyword, v => treeRef.value?.filter(v));

function filterNode(value: string, data: any) {
  if (!value) return true;
  return data.label.toLowerCase().includes(value.toLowerCase());
}

async function loadTree() {
  treeLoading.value = true;
  try {
    const res = await getMeterTree();
    if (res.code === 0 && Array.isArray(res.data)) {
      treeData.value = res.data as any[];
    }
  } finally {
    treeLoading.value = false;
  }
}

function onNodeClick(data: any) {
  selected.type      = data.type;
  selected.gatewayNo = data.gatewayNo ?? "";
  selected.meterNo   = data.meterNo   ?? "";
  selected.label     = data.label;
  reloadActive();
}

// ══════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════════
const activeTab = ref("instant");

function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [from.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
}
function r2(v: any)  { return Math.round((Number(v) || 0) * 100) / 100; }
function fv(d: any)  { return d ? new Date(d).toLocaleString("vi-VN") : "—"; }
function fn(n: number) { return Number(n).toLocaleString("vi-VN"); }

function mkParams(dateRange: [string, string], pag?: any) {
  return {
    meterNo:   selected.meterNo   || undefined,
    gatewayNo: selected.gatewayNo || undefined,
    dateFrom:  dateRange[0] || undefined,
    dateTo:    dateRange[1] || undefined,
    ...(pag ? { currentPage: pag.currentPage, pageSize: pag.pageSize } : {})
  };
}

function reloadActive() {
  if (activeTab.value === "instant") { iPag.currentPage = 1; loadInstant(); }
  else                               { lPag.currentPage = 1; loadLogger();  }
}

watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "instant")       renderInstant();
  else if (!lLoaded.value)     loadLogger();
  else                         renderLogger();
});

// ══════════════════════════════════════════════════════════════════
// INSTANT METER (HIS_INSTANT_METER)
// ══════════════════════════════════════════════════════════════════
const iDateRange = ref<[string, string]>(defaultRange());
const iLoading   = ref(false);
const iList      = ref<any[]>([]);
const iPag       = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });
const iChart     = ref<any[]>([]);
const iKpi       = reactive({ totalReadings: 0, avgSignal: 0, avgBattery: 0, avgTemp: 0 });

const iSignalRef = ref<HTMLDivElement>();
const iCountRef  = ref<HTMLDivElement>();
const { setOptions: setISig   } = useECharts(iSignalRef, { theme });
const { setOptions: setICount } = useECharts(iCountRef,  { theme });

async function loadInstant() {
  iLoading.value = true;
  try {
    const p = mkParams(iDateRange.value, iPag);
    const [lr, cr] = await Promise.all([getInstantList(p), getInstantChart(mkParams(iDateRange.value))]);
    if (lr.code === 0 && lr.data) { iList.value = lr.data.list ?? []; iPag.total = lr.data.total ?? 0; }
    if (cr.code === 0) {
      iChart.value = (cr.data as any[]) ?? [];
      const d = iChart.value;
      iKpi.totalReadings = d.reduce((s, x) => s + (x.readingCount || 0), 0);
      iKpi.avgSignal  = d.length ? Math.round(d.reduce((s, x) => s + (x.avgSignal     || 0), 0) / d.length) : 0;
      iKpi.avgBattery = d.length ? Math.round(d.reduce((s, x) => s + (x.avgBattery    || 0), 0) / d.length) : 0;
      iKpi.avgTemp    = d.length ? r2(d.reduce((s, x) => s + (x.avgTemperature || 0), 0) / d.length) : 0;
      renderInstant();
    }
  } finally { iLoading.value = false; }
}

function renderInstant() {
  nextTick(() => {
    const dates = iChart.value.map(d => (d.date ?? "").slice(5));
    setISig({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Tín hiệu (%)", "Pin còn (%)"], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 46, right: 10, bottom: 44 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", min: 0, max: 100, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Tín hiệu (%)", type: "line", smooth: true, data: iChart.value.map(d => r2(d.avgSignal)),
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" }, symbol: "none" },
        { name: "Pin còn (%)",  type: "line", smooth: true, data: iChart.value.map(d => r2(d.avgBattery)),
          itemStyle: { color: "#67c23a" }, areaStyle: { color: "rgba(103,194,58,0.12)" }, symbol: "none" }
      ]
    });
    setICount({
      tooltip: { trigger: "axis" },
      grid:    { top: 14, left: 50, right: 10, bottom: 28 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{ name: "Bản ghi", type: "bar", data: iChart.value.map(d => d.readingCount ?? 0),
        barWidth: 12, itemStyle: { color: "#9b59b6", borderRadius: [3, 3, 0, 0] } }]
    });
  });
}

const iKpiCards = computed(() => [
  { label: "Tổng bản ghi",   value: fn(iKpi.totalReadings),    color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"      },
  { label: "Tín hiệu TB",    value: `${iKpi.avgSignal}%`,       color: "#67c23a", bg: "#f0f9eb", icon: "ri:signal-wifi-line"      },
  { label: "Pin còn lại TB", value: `${iKpi.avgBattery}%`,      color: "#e6a23c", bg: "#fdf6ec", icon: "ri:battery-2-charge-line" },
  { label: "Nhiệt độ TB",    value: `${iKpi.avgTemp} °C`,       color: "#9b59b6", bg: "#f5f0ff", icon: "ri:temp-hot-line"         }
]);

// ══════════════════════════════════════════════════════════════════
// DATA LOGGER (HIS_DATA_METER)
// ══════════════════════════════════════════════════════════════════
const lDateRange = ref<[string, string]>(defaultRange());
const lLoading   = ref(false);
const lList      = ref<any[]>([]);
const lPag       = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });
const lChart     = ref<any[]>([]);
const lKpi       = reactive({ totalReadings: 0, totalFlow: 0, avgPressure: 0, totalReverse: 0 });
const lLoaded    = ref(false);

const lFlowRef = ref<HTMLDivElement>();
const lPresRef = ref<HTMLDivElement>();
const { setOptions: setLFlow } = useECharts(lFlowRef, { theme });
const { setOptions: setLPres } = useECharts(lPresRef, { theme });

async function loadLogger() {
  lLoading.value = true;
  try {
    const p = mkParams(lDateRange.value, lPag);
    const [lr, cr] = await Promise.all([getLoggerList(p), getLoggerChart(mkParams(lDateRange.value))]);
    if (lr.code === 0 && lr.data) { lList.value = lr.data.list ?? []; lPag.total = lr.data.total ?? 0; }
    if (cr.code === 0) {
      lChart.value = (cr.data as any[]) ?? [];
      const d = lChart.value;
      lKpi.totalReadings = d.reduce((s, x) => s + (x.readingCount || 0), 0);
      lKpi.totalFlow    = r2(d.reduce((s, x) => s + (x.totalFlow || 0), 0));
      lKpi.avgPressure  = d.length ? r2(d.reduce((s, x) => s + (x.avgPressure || 0), 0) / d.length) : 0;
      lKpi.totalReverse = r2(d.reduce((s, x) => s + (x.totalReverseFlow || 0), 0));
      lLoaded.value = true;
      renderLogger();
    }
  } finally { lLoading.value = false; }
}

function renderLogger() {
  nextTick(() => {
    const dates = lChart.value.map(d => (d.date ?? "").slice(5));
    setLFlow({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Lưu lượng (m³)", "Tiêu thụ/ngày", "Ngược chiều"], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 60, right: 10, bottom: 50 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Lưu lượng (m³)", type: "line", smooth: true, data: lChart.value.map(d => r2(d.totalFlow)),
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" }, symbol: "none" },
        { name: "Tiêu thụ/ngày", type: "bar", data: lChart.value.map(d => r2(d.dailyConsumption)),
          barWidth: 8, itemStyle: { color: "#67c23a", borderRadius: [3, 3, 0, 0] } },
        { name: "Ngược chiều", type: "bar", data: lChart.value.map(d => r2(d.totalReverseFlow)),
          barWidth: 8, itemStyle: { color: "#e85f33", borderRadius: [3, 3, 0, 0] } }
      ]
    });
    setLPres({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Áp suất 1", "Áp suất 2"], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 60, right: 10, bottom: 42 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", name: "bar", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Áp suất 1", type: "line", smooth: true, data: lChart.value.map(d => r2(d.avgPressure)),
          itemStyle: { color: "#e6a23c" }, symbol: "none" },
        { name: "Áp suất 2", type: "line", smooth: true, data: lChart.value.map(d => r2(d.avgPressure2)),
          itemStyle: { color: "#9b59b6" }, lineStyle: { type: "dashed" }, symbol: "none" }
      ]
    });
  });
}

const lKpiCards = computed(() => [
  { label: "Tổng bản ghi",    value: fn(lKpi.totalReadings),          color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"    },
  { label: "Tổng lưu lượng",  value: `${fn(lKpi.totalFlow)} m³`,      color: "#67c23a", bg: "#f0f9eb", icon: "ri:drop-line"          },
  { label: "Áp suất TB",      value: `${lKpi.avgPressure} bar`,        color: "#e6a23c", bg: "#fdf6ec", icon: "ri:speed-line"         },
  { label: "Lưu lượng ngược", value: `${fn(lKpi.totalReverse)} m³`,   color: "#e85f33", bg: "#fff1ee", icon: "ri:arrow-go-back-line" }
]);

// ══════════════════════════════════════════════════════════════════
// LIFECYCLE
// ══════════════════════════════════════════════════════════════════
onMounted(async () => {
  await loadTree();
  loadInstant();
});
</script>

<template>
  <div class="page-wrap">

    <!-- ─────────────── LEFT: Tree Panel ─────────────────── -->
    <aside class="tree-panel">
      <el-card shadow="never" class="tree-card">
        <template #header>
          <div class="flex items-center gap-2">
            <IconifyIconOnline icon="ri:node-tree" color="#41b6ff" width="16" />
            <span class="text-sm font-semibold">Danh sách Thiết bị</span>
          </div>
        </template>

        <el-input
          v-model="treeKeyword"
          placeholder="Tìm gateway / đồng hồ..."
          clearable
          size="small"
          class="mb-2"
        >
          <template #prefix><IconifyIconOnline icon="ri:search-line" width="14" /></template>
        </el-input>

        <el-scrollbar class="tree-scroll">
          <div v-if="treeLoading" class="flex justify-center py-8">
            <el-icon class="is-loading text-blue-400 text-2xl"><Loading /></el-icon>
          </div>
          <el-empty v-else-if="!treeData.length" :image-size="60" description="Chưa có dữ liệu" />
          <el-tree
            v-else
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'label', children: 'children' }"
            :default-expanded-keys="defaultExpand"
            node-key="id"
            highlight-current
            :filter-node-method="filterNode"
            @node-click="onNodeClick"
          >
            <template #default="{ data }">
              <div class="flex items-center gap-1 py-0.5 w-full overflow-hidden">
                <IconifyIconOnline
                  :icon="data.type === 'root' ? 'ri:server-line' : data.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'"
                  :color="data.type === 'root' ? '#606266' : data.type === 'gateway' ? '#e6a23c' : '#41b6ff'"
                  width="13"
                  class="flex-shrink-0"
                />
                <span class="text-xs truncate" :title="data.label">{{ data.label }}</span>
                <el-tag v-if="data.type === 'gateway'" size="small" type="info" class="ml-auto flex-shrink-0" style="font-size:10px;height:16px;line-height:16px">
                  {{ data.children?.length ?? 0 }}
                </el-tag>
              </div>
            </template>
          </el-tree>
        </el-scrollbar>
      </el-card>
    </aside>

    <!-- ─────────────── RIGHT: Content Panel ─────────────── -->
    <main class="content-panel">

      <!-- Breadcrumb -->
      <div class="breadcrumb-bar mb-3">
        <IconifyIconOnline icon="ri:map-pin-2-line" color="#9ca3af" width="14" class="mr-1" />
        <el-breadcrumb separator="›">
          <el-breadcrumb-item>Tất cả</el-breadcrumb-item>
          <el-breadcrumb-item v-if="selected.gatewayNo">
            <IconifyIconOnline icon="ri:router-line" color="#e6a23c" width="12" class="mr-0.5" />
            {{ selected.gatewayNo }}
          </el-breadcrumb-item>
          <el-breadcrumb-item v-if="selected.meterNo">
            <IconifyIconOnline icon="ri:drop-line" color="#41b6ff" width="12" class="mr-0.5" />
            {{ selected.meterNo }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" type="card" class="data-tabs">

        <!-- ══════ TAB 1: Đồng hồ Con ══════ -->
        <el-tab-pane name="instant">
          <template #label>
            <span class="flex items-center gap-1">
              <IconifyIconOnline icon="ri:sensor-line" width="14" />
              Đồng hồ Con
            </span>
          </template>

          <!-- Date filter -->
          <el-card shadow="never" class="filter-bar mb-3">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs text-gray-500 font-medium">Khoảng thời gian:</span>
              <el-date-picker
                v-model="iDateRange"
                type="daterange"
                range-separator="→"
                start-placeholder="Từ ngày"
                end-placeholder="Đến ngày"
                value-format="YYYY-MM-DD"
                size="default"
                style="width: 260px"
              />
              <el-button type="primary" size="default" :loading="iLoading"
                @click="() => { iPag.currentPage = 1; loadInstant(); }">
                Xem dữ liệu
              </el-button>
              <el-button :icon="useRenderIcon(Refresh)" size="default"
                @click="() => { iDateRange = defaultRange(); iPag.currentPage = 1; loadInstant(); }">
                Đặt lại
              </el-button>
              <el-tag v-if="selected.type !== 'root'" type="warning" size="small" class="ml-auto">
                <IconifyIconOnline :icon="selected.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'" width="12" />
                {{ selected.label }}
                <el-button link size="small" @click="() => { Object.assign(selected, { type: 'root', gatewayNo: '', meterNo: '', label: 'Tất cả thiết bị' }); iPag.currentPage = 1; loadInstant(); }" class="ml-1">✕</el-button>
              </el-tag>
            </div>
          </el-card>

          <!-- KPI -->
          <el-row :gutter="12" class="mb-3">
            <el-col v-for="(c, i) in iKpiCards" :key="i" :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="kpi-card mb-3">
                <div class="kpi-inner">
                  <div>
                    <p class="kpi-label">{{ c.label }}</p>
                    <p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p>
                  </div>
                  <div class="kpi-icon" :style="{ background: c.bg }">
                    <IconifyIconOnline :icon="c.icon" :color="c.color" width="20" />
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- Charts -->
          <el-row :gutter="12" class="mb-3">
            <el-col :xs="24" :md="15">
              <el-card shadow="never">
                <template #header>
                  <span class="chart-title">Xu hướng Tín hiệu & Pin theo ngày</span>
                  <span class="chart-sub ml-2">Xanh: tín hiệu · Lá: pin còn lại</span>
                </template>
                <div ref="iSignalRef" class="chart-h" />
              </el-card>
            </el-col>
            <el-col :xs="24" :md="9">
              <el-card shadow="never">
                <template #header>
                  <span class="chart-title">Số bản ghi mỗi ngày</span>
                </template>
                <div ref="iCountRef" class="chart-h" />
              </el-card>
            </el-col>
          </el-row>

          <!-- Table -->
          <el-card shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">Chi tiết dữ liệu tức thời</span>
                <el-tag type="info" size="small">{{ fn(iPag.total) }} bản ghi</el-tag>
              </div>
            </template>
            <el-table v-loading="iLoading" :data="iList" size="small" border
              :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }">
              <el-table-column type="index" label="STT" width="50" align="center" fixed />
              <el-table-column label="Mã ĐH"         prop="meterNo"       width="130" fixed show-overflow-tooltip />
              <el-table-column label="Thời gian"      width="155">
                <template #default="{ row }">{{ fv(row.realtime) }}</template>
              </el-table-column>
              <el-table-column label="Tín hiệu (%)"  prop="signal"        width="110" align="right" />
              <el-table-column label="Pin còn (%)"   width="110" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.remainBattery > 50 ? 'success' : row.remainBattery > 20 ? 'warning' : 'danger'" size="small">
                    {{ row.remainBattery ?? '—' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Pin dùng (%)"  prop="usedBattery"   width="110" align="right" />
              <el-table-column label="Nhiệt độ (°C)" prop="temperature"   width="115" align="right" />
              <el-table-column label="Điện áp (V)"   prop="voltage"       width="105" align="right" />
              <el-table-column label="Gateway"        prop="gatewayNo"     width="130" show-overflow-tooltip />
              <el-table-column label="Trạng thái"    prop="status"        width="95"  align="center" />
              <el-table-column label="Cửa tủ"        width="85" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.cabinDoor != null"
                    :type="row.cabinDoor === 1 ? 'danger' : 'success'" size="small">
                    {{ row.cabinDoor === 1 ? 'Mở' : 'Đóng' }}
                  </el-tag>
                  <span v-else class="text-gray-400">—</span>
                </template>
              </el-table-column>
            </el-table>
            <div class="flex justify-end mt-3">
              <el-pagination
                v-model:current-page="iPag.currentPage"
                v-model:page-size="iPag.pageSize"
                :total="iPag.total" :page-sizes="[20, 50, 100, 200]"
                layout="total, sizes, prev, pager, next" background
                @size-change="(v) => { iPag.pageSize = v; loadInstant(); }"
                @current-change="(v) => { iPag.currentPage = v; loadInstant(); }"
              />
            </div>
          </el-card>
        </el-tab-pane>

        <!-- ══════ TAB 2: Data Logger ══════ -->
        <el-tab-pane name="logger">
          <template #label>
            <span class="flex items-center gap-1">
              <IconifyIconOnline icon="ri:bar-chart-grouped-line" width="14" />
              Data Logger
            </span>
          </template>

          <!-- Date filter -->
          <el-card shadow="never" class="filter-bar mb-3">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs text-gray-500 font-medium">Khoảng thời gian:</span>
              <el-date-picker
                v-model="lDateRange"
                type="daterange"
                range-separator="→"
                start-placeholder="Từ ngày"
                end-placeholder="Đến ngày"
                value-format="YYYY-MM-DD"
                size="default"
                style="width: 260px"
              />
              <el-button type="primary" size="default" :loading="lLoading"
                @click="() => { lPag.currentPage = 1; loadLogger(); }">
                Xem dữ liệu
              </el-button>
              <el-button :icon="useRenderIcon(Refresh)" size="default"
                @click="() => { lDateRange = defaultRange(); lPag.currentPage = 1; loadLogger(); }">
                Đặt lại
              </el-button>
              <el-tag v-if="selected.type !== 'root'" type="warning" size="small" class="ml-auto">
                <IconifyIconOnline :icon="selected.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'" width="12" />
                {{ selected.label }}
                <el-button link size="small" @click="() => { Object.assign(selected, { type: 'root', gatewayNo: '', meterNo: '', label: 'Tất cả thiết bị' }); lPag.currentPage = 1; loadLogger(); }" class="ml-1">✕</el-button>
              </el-tag>
            </div>
          </el-card>

          <!-- KPI -->
          <el-row :gutter="12" class="mb-3">
            <el-col v-for="(c, i) in lKpiCards" :key="i" :xs="12" :sm="12" :md="6">
              <el-card shadow="never" class="kpi-card mb-3">
                <div class="kpi-inner">
                  <div>
                    <p class="kpi-label">{{ c.label }}</p>
                    <p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p>
                  </div>
                  <div class="kpi-icon" :style="{ background: c.bg }">
                    <IconifyIconOnline :icon="c.icon" :color="c.color" width="20" />
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- Charts -->
          <el-row :gutter="12" class="mb-3">
            <el-col :xs="24" :md="15">
              <el-card shadow="never">
                <template #header>
                  <span class="chart-title">Lưu lượng & Tiêu thụ theo ngày</span>
                  <span class="chart-sub ml-2">Xanh: lưu lượng · Lá: tiêu thụ · Cam: ngược chiều</span>
                </template>
                <div ref="lFlowRef" class="chart-h" />
              </el-card>
            </el-col>
            <el-col :xs="24" :md="9">
              <el-card shadow="never">
                <template #header>
                  <span class="chart-title">Áp suất theo ngày</span>
                  <span class="chart-sub ml-2">Liền: P1 · Đứt: P2</span>
                </template>
                <div ref="lPresRef" class="chart-h" />
              </el-card>
            </el-col>
          </el-row>

          <!-- Table -->
          <el-card shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">Chi tiết dữ liệu Data Logger</span>
                <el-tag type="info" size="small">{{ fn(lPag.total) }} bản ghi</el-tag>
              </div>
            </template>
            <el-table v-loading="lLoading" :data="lList" size="small" border
              :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }">
              <el-table-column type="index" label="STT" width="50" align="center" fixed />
              <el-table-column label="Mã ĐH"                prop="meterNo"        width="130" fixed show-overflow-tooltip />
              <el-table-column label="Thời gian"            width="155">
                <template #default="{ row }">{{ fv(row.dataTime) }}</template>
              </el-table-column>
              <el-table-column label="Lưu lượng (m³)"      prop="flow"            width="135" align="right" />
              <el-table-column label="Ngược chiều (m³)"    prop="reverseFlow"     width="140" align="right" />
              <el-table-column label="Áp suất 1 (bar)"     prop="pressure"        width="125" align="right" />
              <el-table-column label="Áp suất 2 (bar)"     prop="pressure2"       width="125" align="right" />
              <el-table-column label="Tổng tiêu thụ (m³)"  prop="activeTotal"     width="148" align="right" />
              <el-table-column label="Chiều thuận (m³)"    prop="forwardTotal"    width="138" align="right" />
              <el-table-column label="Chiều ngược (m³)"    prop="negactiveTotal"  width="138" align="right" />
              <el-table-column label="Gateway"              prop="gatewayNo"       width="130" show-overflow-tooltip />
            </el-table>
            <div class="flex justify-end mt-3">
              <el-pagination
                v-model:current-page="lPag.currentPage"
                v-model:page-size="lPag.pageSize"
                :total="lPag.total" :page-sizes="[20, 50, 100, 200]"
                layout="total, sizes, prev, pager, next" background
                @size-change="(v) => { lPag.pageSize = v; loadLogger(); }"
                @current-change="(v) => { lPag.currentPage = v; loadLogger(); }"
              />
            </div>
          </el-card>
        </el-tab-pane>

      </el-tabs>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.page-wrap {
  display: flex;
  gap: 12px;
  padding: 12px;
  align-items: flex-start;
}

/* ── Tree Panel ── */
.tree-panel {
  width: 256px;
  flex-shrink: 0;
  position: sticky;
  top: 12px;
  align-self: flex-start;
}

.tree-card {
  :deep(.el-card__header) { padding: 10px 14px; }
  :deep(.el-card__body)   { padding: 10px 10px 10px; }
}

.tree-scroll {
  height: calc(100vh - 200px);
  :deep(.el-scrollbar__view) { padding-right: 4px; }
}

:deep(.el-tree-node__content) {
  height: 28px;
  border-radius: 4px;
  &:hover { background: var(--el-fill-color); }
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

/* ── Content Panel ── */
.content-panel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.8125rem;
}

.data-tabs {
  :deep(.el-tabs__header) { margin-bottom: 0; }
  :deep(.el-tabs__content) { padding-top: 12px; }
  :deep(.el-tabs__item) { font-size: 0.8125rem; }
}

.filter-bar {
  :deep(.el-card__body) { padding: 10px 16px; }
}

/* ── KPI ── */
.kpi-card {
  :deep(.el-card__body) { padding: 12px 14px; }
}
.kpi-inner  { display: flex; align-items: center; justify-content: space-between; }
.kpi-label  { font-size: 0.7rem; color: var(--el-text-color-secondary); margin-bottom: 3px; }
.kpi-value  { font-size: 1.15rem; font-weight: 700; line-height: 1.2; }
.kpi-icon   { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* ── Charts ── */
:deep(.el-card) {
  border-radius: 10px;
}
:deep(.el-card__header) {
  padding: 8px 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.chart-title { font-size: 0.8rem; font-weight: 600; }
.chart-sub   { font-size: 0.7rem; color: var(--el-text-color-placeholder); }
.chart-h     { width: 100%; height: 260px; }
</style>
