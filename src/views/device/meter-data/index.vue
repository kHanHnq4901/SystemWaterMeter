<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import {
  getInstantList, getInstantChart,
  getLoggerList,  getLoggerChart
} from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "MeterDataAnalysis" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

// ─── Active tab ───────────────────────────────────────────────────
const activeTab = ref("instant");

function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [
    from.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10)
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────
function r2(v: any) { return Math.round((Number(v) || 0) * 100) / 100; }
function fmtVN(d: any) { return d ? new Date(d).toLocaleString("vi-VN") : "—"; }
function fmtNum(n: number) { return n.toLocaleString("vi-VN"); }

function buildParams(filter: any, pag?: any) {
  return {
    meterNo:   filter.meterNo   || undefined,
    gatewayNo: filter.gatewayNo || undefined,
    dateFrom:  filter.dateRange?.[0] || undefined,
    dateTo:    filter.dateRange?.[1] || undefined,
    ...(pag ? { currentPage: pag.currentPage, pageSize: pag.pageSize } : {})
  };
}

// ══════════════════════════════════════════════════════════════════
// INSTANT METER — HIS_INSTANT_METER
// ══════════════════════════════════════════════════════════════════
const iFilter = reactive({
  meterNo: "", gatewayNo: "",
  dateRange: defaultRange() as [string, string]
});
const iLoading    = ref(false);
const iList       = ref<any[]>([]);
const iPag        = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });
const iChartData  = ref<any[]>([]);
const iKpi        = reactive({ totalReadings: 0, avgSignal: 0, avgBattery: 0, avgTemp: 0 });

// Chart refs — instant tab
const iSignalRef = ref<HTMLDivElement>();
const iCountRef  = ref<HTMLDivElement>();
const { setOptions: setISig   } = useECharts(iSignalRef, { theme });
const { setOptions: setICount } = useECharts(iCountRef,  { theme });

async function loadInstant() {
  iLoading.value = true;
  try {
    const [listRes, chartRes] = await Promise.all([
      getInstantList(buildParams(iFilter, iPag)),
      getInstantChart(buildParams(iFilter))
    ]);
    if (listRes.code === 0 && listRes.data) {
      iList.value = listRes.data.list ?? [];
      iPag.total  = listRes.data.total ?? 0;
    }
    if (chartRes.code === 0) {
      iChartData.value = (chartRes.data as any[]) ?? [];
      const d = iChartData.value;
      iKpi.totalReadings = d.reduce((s, x) => s + (x.readingCount || 0), 0);
      iKpi.avgSignal     = d.length ? Math.round(d.reduce((s, x) => s + (x.avgSignal || 0), 0) / d.length) : 0;
      iKpi.avgBattery    = d.length ? Math.round(d.reduce((s, x) => s + (x.avgBattery || 0), 0) / d.length) : 0;
      iKpi.avgTemp       = d.length ? r2(d.reduce((s, x) => s + (x.avgTemperature || 0), 0) / d.length) : 0;
    }
    renderInstant();
  } finally {
    iLoading.value = false;
  }
}

function renderInstant() {
  nextTick(() => {
    const dates    = iChartData.value.map(d => (d.date ?? "").slice(5));
    const signals  = iChartData.value.map(d => r2(d.avgSignal));
    const batts    = iChartData.value.map(d => r2(d.avgBattery));
    const counts   = iChartData.value.map(d => d.readingCount ?? 0);

    setISig({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Tín hiệu (%)", "Pin còn (%)"], bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
      grid:    { top: 16, left: 52, right: 16, bottom: 42 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 11 } },
      yAxis:   { type: "value", min: 0, max: 100, axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Tín hiệu (%)", type: "line", smooth: true, data: signals,
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" } },
        { name: "Pin còn (%)",  type: "line", smooth: true, data: batts,
          itemStyle: { color: "#67c23a" }, areaStyle: { color: "rgba(103,194,58,0.12)" } }
      ]
    });

    setICount({
      tooltip: { trigger: "axis" },
      grid:    { top: 16, left: 55, right: 16, bottom: 28 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 11 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{
        name: "Số bản ghi", type: "bar", data: counts, barWidth: 14,
        itemStyle: { color: "#9b59b6", borderRadius: [4, 4, 0, 0] }
      }]
    });
  });
}

function onISearch() { iPag.currentPage = 1; loadInstant(); }
function onIReset()  { iFilter.meterNo = ""; iFilter.gatewayNo = ""; iFilter.dateRange = defaultRange(); iPag.currentPage = 1; loadInstant(); }

// ══════════════════════════════════════════════════════════════════
// DATA LOGGER — HIS_DATA_METER
// ══════════════════════════════════════════════════════════════════
const lFilter = reactive({
  meterNo: "", gatewayNo: "",
  dateRange: defaultRange() as [string, string]
});
const lLoading    = ref(false);
const lList       = ref<any[]>([]);
const lPag        = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });
const lChartData  = ref<any[]>([]);
const lKpi        = reactive({ totalReadings: 0, totalFlow: 0, avgPressure: 0, totalReverse: 0 });
const lLoaded     = ref(false);

// Chart refs — logger tab
const lFlowRef  = ref<HTMLDivElement>();
const lPresRef  = ref<HTMLDivElement>();
const { setOptions: setLFlow } = useECharts(lFlowRef, { theme });
const { setOptions: setLPres } = useECharts(lPresRef, { theme });

async function loadLogger() {
  lLoading.value = true;
  try {
    const [listRes, chartRes] = await Promise.all([
      getLoggerList(buildParams(lFilter, lPag)),
      getLoggerChart(buildParams(lFilter))
    ]);
    if (listRes.code === 0 && listRes.data) {
      lList.value = listRes.data.list ?? [];
      lPag.total  = listRes.data.total ?? 0;
    }
    if (chartRes.code === 0) {
      lChartData.value = (chartRes.data as any[]) ?? [];
      const d = lChartData.value;
      lKpi.totalReadings = d.reduce((s, x) => s + (x.readingCount || 0), 0);
      lKpi.totalFlow     = r2(d.reduce((s, x) => s + (x.totalFlow || 0), 0));
      lKpi.avgPressure   = d.length ? r2(d.reduce((s, x) => s + (x.avgPressure || 0), 0) / d.length) : 0;
      lKpi.totalReverse  = r2(d.reduce((s, x) => s + (x.totalReverseFlow || 0), 0));
    }
    lLoaded.value = true;
    renderLogger();
  } finally {
    lLoading.value = false;
  }
}

function renderLogger() {
  nextTick(() => {
    const dates  = lChartData.value.map(d => (d.date ?? "").slice(5));
    const flows  = lChartData.value.map(d => r2(d.totalFlow));
    const revs   = lChartData.value.map(d => r2(d.totalReverseFlow));
    const pres1  = lChartData.value.map(d => r2(d.avgPressure));
    const pres2  = lChartData.value.map(d => r2(d.avgPressure2));
    const consump = lChartData.value.map(d => r2(d.dailyConsumption));

    setLFlow({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Lưu lượng (m³)", "Tiêu thụ/ngày (m³)", "Ngược chiều (m³)"], bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
      grid:    { top: 16, left: 65, right: 16, bottom: 52 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 11 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Lưu lượng (m³)",       type: "line", smooth: true, data: flows,
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" } },
        { name: "Tiêu thụ/ngày (m³)",   type: "bar",  data: consump, barWidth: 8,
          itemStyle: { color: "#67c23a", borderRadius: [4, 4, 0, 0] } },
        { name: "Ngược chiều (m³)",      type: "bar",  data: revs, barWidth: 8,
          itemStyle: { color: "#e85f33", borderRadius: [4, 4, 0, 0] } }
      ]
    });

    setLPres({
      tooltip: { trigger: "axis" },
      legend:  { data: ["Áp suất 1 (bar)", "Áp suất 2 (bar)"], bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
      grid:    { top: 16, left: 65, right: 16, bottom: 42 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 11 } },
      yAxis:   { type: "value", name: "bar", axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: "Áp suất 1 (bar)", type: "line", smooth: true, data: pres1, itemStyle: { color: "#e6a23c" } },
        { name: "Áp suất 2 (bar)", type: "line", smooth: true, data: pres2,
          itemStyle: { color: "#9b59b6" }, lineStyle: { type: "dashed" } }
      ]
    });
  });
}

function onLSearch() { lPag.currentPage = 1; loadLogger(); }
function onLReset()  { lFilter.meterNo = ""; lFilter.gatewayNo = ""; lFilter.dateRange = defaultRange(); lPag.currentPage = 1; loadLogger(); }

// ─── Tab switch ───────────────────────────────────────────────────
watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "instant") {
    renderInstant();
  } else {
    if (!lLoaded.value) await loadLogger();
    else renderLogger();
  }
});

// ─── KPI card configs ─────────────────────────────────────────────
const iKpiCards = computed(() => [
  { label: "Tổng bản ghi",   value: fmtNum(iKpi.totalReadings),    color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"          },
  { label: "Tín hiệu TB",    value: `${iKpi.avgSignal}%`,           color: "#67c23a", bg: "#f0f9eb", icon: "ri:signal-wifi-line"          },
  { label: "Pin còn lại TB", value: `${iKpi.avgBattery}%`,          color: "#e6a23c", bg: "#fdf6ec", icon: "ri:battery-2-charge-line"     },
  { label: "Nhiệt độ TB",    value: `${iKpi.avgTemp} °C`,           color: "#9b59b6", bg: "#f5f0ff", icon: "ri:temp-hot-line"             }
]);

const lKpiCards = computed(() => [
  { label: "Tổng bản ghi",     value: fmtNum(lKpi.totalReadings),   color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"          },
  { label: "Tổng lưu lượng",   value: `${fmtNum(lKpi.totalFlow)} m³`, color: "#67c23a", bg: "#f0f9eb", icon: "ri:drop-line"              },
  { label: "Áp suất TB",       value: `${lKpi.avgPressure} bar`,    color: "#e6a23c", bg: "#fdf6ec", icon: "ri:speed-line"               },
  { label: "Lưu lượng ngược",  value: `${fmtNum(lKpi.totalReverse)} m³`, color: "#e85f33", bg: "#fff1ee", icon: "ri:arrow-go-back-line" }
]);

onMounted(() => loadInstant());
</script>

<template>
  <div class="analysis-wrap">
    <el-tabs v-model="activeTab" type="card" class="main-tabs">

      <!-- ══════════════ TAB 1: Đồng hồ Con ══════════════ -->
      <el-tab-pane label="Đồng hồ Con — HIS_INSTANT_METER" name="instant">

        <!-- Filter -->
        <el-card shadow="never" class="mb-3 filter-card">
          <el-row :gutter="10" align="middle" wrap>
            <el-col :xs="24" :sm="6" :md="5">
              <el-input v-model="iFilter.meterNo" placeholder="Mã đồng hồ" clearable size="default" />
            </el-col>
            <el-col :xs="24" :sm="6" :md="5">
              <el-input v-model="iFilter.gatewayNo" placeholder="Mã Gateway" clearable size="default" />
            </el-col>
            <el-col :xs="24" :sm="10" :md="9">
              <el-date-picker
                v-model="iFilter.dateRange"
                type="daterange"
                range-separator="→"
                start-placeholder="Từ ngày"
                end-placeholder="Đến ngày"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-col>
            <el-col :xs="24" :sm="24" :md="5">
              <el-button type="primary" :loading="iLoading" @click="onISearch">Tìm kiếm</el-button>
              <el-button :icon="useRenderIcon(Refresh)" @click="onIReset">Đặt lại</el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- KPI Cards -->
        <el-row :gutter="12" class="mb-3">
          <el-col v-for="(c, i) in iKpiCards" :key="i" :xs="12" :sm="12" :md="6">
            <el-card shadow="never" class="kpi-card mb-3">
              <div class="kpi-inner">
                <div>
                  <p class="kpi-label">{{ c.label }}</p>
                  <p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p>
                </div>
                <div class="kpi-icon" :style="{ background: c.bg }">
                  <IconifyIconOnline :icon="c.icon" :color="c.color" width="22" height="22" />
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
                <span class="chart-sub">Đường xanh: tín hiệu · Đường lá: pin còn lại</span>
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
              <span class="text-sm font-semibold">Dữ liệu chi tiết — Đồng hồ Con</span>
              <el-tag type="info" size="small">{{ fmtNum(iPag.total) }} bản ghi</el-tag>
            </div>
          </template>
          <el-table
            v-loading="iLoading"
            :data="iList"
            size="small"
            border
            :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
            style="width: 100%"
          >
            <el-table-column type="index" label="STT" width="55" align="center" fixed />
            <el-table-column label="Mã ĐH"         prop="meterNo"       width="130" fixed show-overflow-tooltip />
            <el-table-column label="Thời gian"      width="160">
              <template #default="{ row }">{{ fmtVN(row.realtime) }}</template>
            </el-table-column>
            <el-table-column label="Tín hiệu (%)"  prop="signal"        width="110" align="right" />
            <el-table-column label="Pin còn (%)"   prop="remainBattery" width="110" align="right">
              <template #default="{ row }">
                <el-tag
                  :type="row.remainBattery > 50 ? 'success' : row.remainBattery > 20 ? 'warning' : 'danger'"
                  size="small"
                >{{ row.remainBattery ?? '—' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Pin dùng (%)"  prop="usedBattery"   width="110" align="right" />
            <el-table-column label="Nhiệt độ (°C)" prop="temperature"   width="120" align="right" />
            <el-table-column label="Điện áp (V)"   prop="voltage"       width="110" align="right" />
            <el-table-column label="Gateway"        prop="gatewayNo"     width="130" show-overflow-tooltip />
            <el-table-column label="Trạng thái"    prop="status"        width="100" align="center" />
            <el-table-column label="Cửa tủ"        width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.cabinDoor != null"
                  :type="row.cabinDoor === 1 ? 'danger' : 'success'" size="small">
                  {{ row.cabinDoor === 1 ? 'Mở' : 'Đóng' }}
                </el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination
              v-model:current-page="iPag.currentPage"
              v-model:page-size="iPag.pageSize"
              :total="iPag.total"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="(v) => { iPag.pageSize = v; loadInstant(); }"
              @current-change="(v) => { iPag.currentPage = v; loadInstant(); }"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ══════════════ TAB 2: Data Logger ══════════════ -->
      <el-tab-pane label="Data Logger — HIS_DATA_METER" name="logger">

        <!-- Filter -->
        <el-card shadow="never" class="mb-3 filter-card">
          <el-row :gutter="10" align="middle" wrap>
            <el-col :xs="24" :sm="6" :md="5">
              <el-input v-model="lFilter.meterNo" placeholder="Mã đồng hồ" clearable size="default" />
            </el-col>
            <el-col :xs="24" :sm="6" :md="5">
              <el-input v-model="lFilter.gatewayNo" placeholder="Mã Gateway" clearable size="default" />
            </el-col>
            <el-col :xs="24" :sm="10" :md="9">
              <el-date-picker
                v-model="lFilter.dateRange"
                type="daterange"
                range-separator="→"
                start-placeholder="Từ ngày"
                end-placeholder="Đến ngày"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-col>
            <el-col :xs="24" :sm="24" :md="5">
              <el-button type="primary" :loading="lLoading" @click="onLSearch">Tìm kiếm</el-button>
              <el-button :icon="useRenderIcon(Refresh)" @click="onLReset">Đặt lại</el-button>
            </el-col>
          </el-row>
        </el-card>

        <!-- KPI Cards -->
        <el-row :gutter="12" class="mb-3">
          <el-col v-for="(c, i) in lKpiCards" :key="i" :xs="12" :sm="12" :md="6">
            <el-card shadow="never" class="kpi-card mb-3">
              <div class="kpi-inner">
                <div>
                  <p class="kpi-label">{{ c.label }}</p>
                  <p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p>
                </div>
                <div class="kpi-icon" :style="{ background: c.bg }">
                  <IconifyIconOnline :icon="c.icon" :color="c.color" width="22" height="22" />
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
                <span class="chart-sub">Xanh: tổng lưu lượng · Lá: tiêu thụ · Cam: ngược chiều</span>
              </template>
              <div ref="lFlowRef" class="chart-h" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="9">
            <el-card shadow="never">
              <template #header>
                <span class="chart-title">Áp suất theo ngày</span>
                <span class="chart-sub">Liền: áp suất 1 · Đứt: áp suất 2</span>
              </template>
              <div ref="lPresRef" class="chart-h" />
            </el-card>
          </el-col>
        </el-row>

        <!-- Table -->
        <el-card shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">Dữ liệu chi tiết — Data Logger</span>
              <el-tag type="info" size="small">{{ fmtNum(lPag.total) }} bản ghi</el-tag>
            </div>
          </template>
          <el-table
            v-loading="lLoading"
            :data="lList"
            size="small"
            border
            :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
            style="width: 100%"
          >
            <el-table-column type="index" label="STT" width="55" align="center" fixed />
            <el-table-column label="Mã ĐH"                prop="meterNo"        width="130" fixed show-overflow-tooltip />
            <el-table-column label="Thời gian"            width="160">
              <template #default="{ row }">{{ fmtVN(row.dataTime) }}</template>
            </el-table-column>
            <el-table-column label="Lưu lượng (m³)"      prop="flow"            width="140" align="right" />
            <el-table-column label="Lưu lượng ngược (m³)"prop="reverseFlow"     width="160" align="right" />
            <el-table-column label="Áp suất 1 (bar)"     prop="pressure"        width="130" align="right" />
            <el-table-column label="Áp suất 2 (bar)"     prop="pressure2"       width="130" align="right" />
            <el-table-column label="Tổng tiêu thụ (m³)"  prop="activeTotal"     width="150" align="right" />
            <el-table-column label="Chiều thuận (m³)"    prop="forwardTotal"    width="145" align="right" />
            <el-table-column label="Chiều ngược (m³)"    prop="negactiveTotal"  width="145" align="right" />
            <el-table-column label="Gateway"              prop="gatewayNo"       width="130" show-overflow-tooltip />
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination
              v-model:current-page="lPag.currentPage"
              v-model:page-size="lPag.pageSize"
              :total="lPag.total"
              :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="(v) => { lPag.pageSize = v; loadLogger(); }"
              @current-change="(v) => { lPag.currentPage = v; loadLogger(); }"
            />
          </div>
        </el-card>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.analysis-wrap {
  padding: 16px;
}

.main-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
  :deep(.el-tabs__item) {
    font-size: 0.875rem;
    font-weight: 500;
  }
}

.filter-card {
  :deep(.el-card__body) {
    padding: 14px 16px;
  }
  .el-col { margin-bottom: 8px; }
}

.kpi-card {
  :deep(.el-card__body) { padding: 14px 16px; }
}
.kpi-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-label {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
.kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.el-card) {
  border-radius: 10px;
  --el-card-border-color: var(--el-border-color-lighter);
}

:deep(.el-card__header) {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chart-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.chart-sub {
  font-size: 0.7rem;
  color: var(--el-text-color-placeholder);
}

.chart-h {
  width: 100%;
  height: 270px;
}
</style>
