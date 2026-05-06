<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useDark, useECharts } from "@pureadmin/utils";
import {
  getInstantList, getInstantChart,
  getLoggerList,  getLoggerChart
} from "@/api/waterMeter";
import ZoneTreeSelect from "@/components/ZoneTreeSelect/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "AnalysisData" });

const { t } = useI18n();
const route  = useRoute();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const zone = reactive<TreeSelection & { hasFilter: boolean }>({
  type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: [], hasFilter: false
});
function onZoneSelect(sel: TreeSelection) {
  Object.assign(zone, sel, { hasFilter: sel.type !== "clear" });
  reloadActive();
}

const activeTab = ref("instant");

function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [from.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
}
function r2(v: any) { return Math.round((Number(v) || 0) * 100) / 100; }
function fv(d: any) { return d ? new Date(d).toLocaleString("vi-VN") : "—"; }
function fn(n: number) { return Number(n).toLocaleString("vi-VN"); }

function mkParams(dateRange: [string, string], pag?: any) {
  return {
    meterNo:  zone.meterNo  || undefined,
    regionId: zone.regionId ?? undefined,
    dateFrom: dateRange[0]  || undefined,
    dateTo:   dateRange[1]  || undefined,
    ...(pag ? { currentPage: pag.currentPage, pageSize: pag.pageSize } : {})
  };
}

function reloadActive() {
  if (activeTab.value === "instant") { iPag.currentPage = 1; loadInstant(); }
  else                               { lPag.currentPage = 1; loadLogger();  }
}

watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "instant")    renderInstant();
  else if (!lLoaded.value)  loadLogger();
  else                      renderLogger();
});

// Tab 1
const iDateRange = ref<[string, string]>(defaultRange());
const iLoading   = ref(false);
const iList      = ref<any[]>([]);
const iPag       = reactive({ total: 0, pageSize: 20, currentPage: 1 });
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
    const sigLabel = t("analysis.data.colSignal");
    const batLabel = t("analysis.data.colBattery");
    setISig({
      tooltip: { trigger: "axis" },
      legend:  { data: [sigLabel, batLabel], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 46, right: 10, bottom: 44 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", min: 0, max: 100, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: sigLabel, type: "line", smooth: true, data: iChart.value.map(d => r2(d.avgSignal)),
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" }, symbol: "none" },
        { name: batLabel, type: "line", smooth: true, data: iChart.value.map(d => r2(d.avgBattery)),
          itemStyle: { color: "#67c23a" }, areaStyle: { color: "rgba(103,194,58,0.12)" }, symbol: "none" }
      ]
    });
    setICount({
      tooltip: { trigger: "axis" },
      grid:    { top: 14, left: 50, right: 10, bottom: 28 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{ name: t("analysis.data.records"), type: "bar", data: iChart.value.map(d => d.readingCount ?? 0),
        barWidth: 12, itemStyle: { color: "#9b59b6", borderRadius: [3, 3, 0, 0] } }]
    });
  });
}

const iKpiCards = computed(() => [
  { label: t("analysis.data.kpiTotalReadings"), value: fn(iKpi.totalReadings),    color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"      },
  { label: t("analysis.data.kpiAvgSignal"),     value: `${iKpi.avgSignal}%`,       color: "#67c23a", bg: "#f0f9eb", icon: "ri:signal-wifi-line"      },
  { label: t("analysis.data.kpiAvgBattery"),    value: `${iKpi.avgBattery}%`,      color: "#e6a23c", bg: "#fdf6ec", icon: "ri:battery-2-charge-line" },
  { label: t("analysis.data.kpiAvgTemp"),       value: `${iKpi.avgTemp} °C`,       color: "#9b59b6", bg: "#f5f0ff", icon: "ri:temp-hot-line"         }
]);

// Tab 2
const lDateRange = ref<[string, string]>(defaultRange());
const lLoading   = ref(false);
const lList      = ref<any[]>([]);
const lPag       = reactive({ total: 0, pageSize: 20, currentPage: 1 });
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
    const flowLabel    = t("analysis.data.colFlow");
    const reverseLabel = t("analysis.data.colReverseFlow");
    const pres1Label   = t("analysis.data.colPressure1");
    const pres2Label   = t("analysis.data.colPressure2");
    const consumLabel  = "Tiêu thụ/ngày";
    setLFlow({
      tooltip: { trigger: "axis" },
      legend:  { data: [flowLabel, consumLabel, reverseLabel], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 60, right: 10, bottom: 50 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: flowLabel,    type: "line", smooth: true, data: lChart.value.map(d => r2(d.totalFlow)),
          itemStyle: { color: "#41b6ff" }, areaStyle: { color: "rgba(65,182,255,0.15)" }, symbol: "none" },
        { name: consumLabel,  type: "bar",  data: lChart.value.map(d => r2(d.dailyConsumption)),
          barWidth: 8, itemStyle: { color: "#67c23a", borderRadius: [3, 3, 0, 0] } },
        { name: reverseLabel, type: "bar",  data: lChart.value.map(d => r2(d.totalReverseFlow)),
          barWidth: 8, itemStyle: { color: "#e85f33", borderRadius: [3, 3, 0, 0] } }
      ]
    });
    setLPres({
      tooltip: { trigger: "axis" },
      legend:  { data: [pres1Label, pres2Label], bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
      grid:    { top: 14, left: 60, right: 10, bottom: 42 },
      xAxis:   { type: "category", data: dates, axisLabel: { fontSize: 10 } },
      yAxis:   { type: "value", name: "bar", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: pres1Label, type: "line", smooth: true, data: lChart.value.map(d => r2(d.avgPressure)),
          itemStyle: { color: "#e6a23c" }, symbol: "none" },
        { name: pres2Label, type: "line", smooth: true, data: lChart.value.map(d => r2(d.avgPressure2)),
          itemStyle: { color: "#9b59b6" }, lineStyle: { type: "dashed" }, symbol: "none" }
      ]
    });
  });
}

const lKpiCards = computed(() => [
  { label: t("analysis.data.kpiTotalReadings"), value: fn(lKpi.totalReadings),            color: "#41b6ff", bg: "#e8f6ff", icon: "ri:database-2-line"    },
  { label: t("analysis.data.kpiTotalFlow"),     value: `${fn(lKpi.totalFlow)} m³`,         color: "#67c23a", bg: "#f0f9eb", icon: "ri:drop-line"          },
  { label: t("analysis.data.kpiAvgPressure"),   value: `${lKpi.avgPressure} bar`,           color: "#e6a23c", bg: "#fdf6ec", icon: "ri:speed-line"         },
  { label: t("analysis.data.kpiReverseFlow"),   value: `${fn(lKpi.totalReverse)} m³`,       color: "#e85f33", bg: "#fff1ee", icon: "ri:arrow-go-back-line" }
]);

onMounted(() => {
  const qMeter = route.query.meterNo as string;
  if (qMeter) {
    zone.type      = "meter";
    zone.meterNo   = qMeter;
    zone.label     = qMeter;
    zone.hasFilter = true;
  }
  loadInstant();
});
</script>

<template>
  <div class="page-wrap">

    <!-- Shared zone filter -->
    <el-card shadow="never" class="toolbar-card mb-3">
      <div class="flex flex-wrap items-center gap-3">
        <span class="toolbar-label">
          <span class="i-ri:node-tree" style="font-size:14px;color:var(--el-color-primary)" />
          {{ t("analysis.data.zoneFilter") }}
        </span>
        <ZoneTreeSelect :placeholder="t('analysis.data.allZones')" width="260px" @select="onZoneSelect" />
        <el-tag v-if="zone.hasFilter" type="primary" size="default" effect="light" closable
          @close="() => { Object.assign(zone, { type:'clear', regionId:null, meterNo:'', label:'', zoneMeterNos:[], hasFilter:false }); reloadActive(); }">
          <IconifyIconOnline :icon="zone.type === 'zone' ? 'ri:map-2-line' : 'ri:drop-line'" width="13" class="mr-1" />
          {{ zone.label }}
        </el-tag>
        <span v-if="zone.hasFilter && zone.type === 'meter'" class="text-xs text-gray-400">
          — {{ t("analysis.data.viewingMeter") }}
        </span>
      </div>
    </el-card>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" type="card" class="data-tabs">

      <!-- Tab 1: Sub-meter -->
      <el-tab-pane name="instant">
        <template #label>
          <span class="flex items-center gap-1">
            <IconifyIconOnline icon="ri:sensor-line" width="14" />{{ t("analysis.data.tab1") }}
          </span>
        </template>

        <el-card shadow="never" class="filter-bar mb-3">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs text-gray-500 font-medium">{{ t("analysis.data.dateRange") }}</span>
            <el-date-picker v-model="iDateRange" type="daterange" range-separator="→"
              :start-placeholder="t('report.pressure.from')" :end-placeholder="t('report.pressure.to')"
              value-format="YYYY-MM-DD" size="default" style="width:260px" />
            <el-button type="primary" size="default" :loading="iLoading"
              @click="() => { iPag.currentPage = 1; loadInstant(); }">
              <IconifyIconOnline icon="ri:search-line" width="13" class="mr-1" />{{ t("analysis.data.viewData") }}
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)" size="default"
              @click="() => { iDateRange = defaultRange(); iPag.currentPage = 1; loadInstant(); }">
              {{ t("analysis.data.reset") }}
            </el-button>
          </div>
        </el-card>

        <el-row :gutter="12" class="mb-3">
          <el-col v-for="(c, i) in iKpiCards" :key="i" :xs="12" :sm="12" :md="6">
            <el-card shadow="never" class="kpi-card mb-3">
              <div class="kpi-inner">
                <div><p class="kpi-label">{{ c.label }}</p><p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p></div>
                <div class="kpi-icon" :style="{ background: c.bg }">
                  <IconifyIconOnline :icon="c.icon" :color="c.color" width="20" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" class="mb-3">
          <el-col :xs="24" :md="15">
            <el-card shadow="never">
              <template #header><span class="chart-title">{{ t("analysis.data.signalBatteryChart") }}</span></template>
              <div ref="iSignalRef" class="chart-h" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="9">
            <el-card shadow="never">
              <template #header><span class="chart-title">{{ t("analysis.data.readingsPerDay") }}</span></template>
              <div ref="iCountRef" class="chart-h" />
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">{{ t("analysis.data.instantTitle") }}</span>
              <el-tag type="info" size="small">{{ fn(iPag.total) }} {{ t("analysis.data.records") }}</el-tag>
            </div>
          </template>
          <el-table v-loading="iLoading" :data="iList" size="small" border
            :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }">
            <el-table-column type="index" :label="t('common.stt')" width="50" align="center" fixed />
            <el-table-column :label="t('analysis.data.colMeterCode')" prop="meterNo"       width="130" fixed show-overflow-tooltip />
            <el-table-column :label="t('analysis.data.colTime')"       width="155">
              <template #default="{ row }">{{ fv(row.realtime) }}</template>
            </el-table-column>
            <el-table-column :label="t('analysis.data.colSignal')"    prop="signal"        width="110" align="right" />
            <el-table-column :label="t('analysis.data.colBattery')"   width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="row.remainBattery > 50 ? 'success' : row.remainBattery > 20 ? 'warning' : 'danger'" size="small">
                  {{ row.remainBattery ?? '—' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('analysis.data.colUsedBattery')"  prop="usedBattery"   width="110" align="right" />
            <el-table-column :label="t('analysis.data.colTemp')"          prop="temperature"   width="115" align="right" />
            <el-table-column :label="t('analysis.data.colVoltage')"       prop="voltage"       width="105" align="right" />
            <el-table-column :label="t('analysis.data.colGateway')"       prop="gatewayNo"     width="130" show-overflow-tooltip />
            <el-table-column :label="t('analysis.data.colStatus')"        prop="status"        width="95"  align="center" />
            <el-table-column :label="t('analysis.data.colDoor')"          width="85" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.cabinDoor != null"
                  :type="row.cabinDoor === 1 ? 'danger' : 'success'" size="small">
                  {{ row.cabinDoor === 1 ? t("analysis.data.doorOpen") : t("analysis.data.doorClosed") }}
                </el-tag>
                <span v-else class="text-gray-400">—</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination v-model:current-page="iPag.currentPage" v-model:page-size="iPag.pageSize"
              :total="iPag.total" :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next" background
              @size-change="(v) => { iPag.pageSize = v; loadInstant(); }"
              @current-change="(v) => { iPag.currentPage = v; loadInstant(); }" />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- Tab 2: Data Logger -->
      <el-tab-pane name="logger">
        <template #label>
          <span class="flex items-center gap-1">
            <IconifyIconOnline icon="ri:bar-chart-grouped-line" width="14" />{{ t("analysis.data.tab2") }}
          </span>
        </template>

        <el-card shadow="never" class="filter-bar mb-3">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-xs text-gray-500 font-medium">{{ t("analysis.data.dateRange") }}</span>
            <el-date-picker v-model="lDateRange" type="daterange" range-separator="→"
              :start-placeholder="t('report.pressure.from')" :end-placeholder="t('report.pressure.to')"
              value-format="YYYY-MM-DD" size="default" style="width:260px" />
            <el-button type="primary" size="default" :loading="lLoading"
              @click="() => { lPag.currentPage = 1; loadLogger(); }">
              <IconifyIconOnline icon="ri:search-line" width="13" class="mr-1" />{{ t("analysis.data.viewData") }}
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)" size="default"
              @click="() => { lDateRange = defaultRange(); lPag.currentPage = 1; loadLogger(); }">
              {{ t("analysis.data.reset") }}
            </el-button>
          </div>
        </el-card>

        <el-row :gutter="12" class="mb-3">
          <el-col v-for="(c, i) in lKpiCards" :key="i" :xs="12" :sm="12" :md="6">
            <el-card shadow="never" class="kpi-card mb-3">
              <div class="kpi-inner">
                <div><p class="kpi-label">{{ c.label }}</p><p class="kpi-value" :style="{ color: c.color }">{{ c.value }}</p></div>
                <div class="kpi-icon" :style="{ background: c.bg }">
                  <IconifyIconOnline :icon="c.icon" :color="c.color" width="20" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="12" class="mb-3">
          <el-col :xs="24" :md="15">
            <el-card shadow="never">
              <template #header><span class="chart-title">{{ t("analysis.data.flowChartTitle") }}</span></template>
              <div ref="lFlowRef" class="chart-h" />
            </el-card>
          </el-col>
          <el-col :xs="24" :md="9">
            <el-card shadow="never">
              <template #header><span class="chart-title">{{ t("analysis.data.pressureChartTitle") }}</span></template>
              <div ref="lPresRef" class="chart-h" />
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">{{ t("analysis.data.loggerTitle") }}</span>
              <el-tag type="info" size="small">{{ fn(lPag.total) }} {{ t("analysis.data.records") }}</el-tag>
            </div>
          </template>
          <el-table v-loading="lLoading" :data="lList" size="small" border
            :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }">
            <el-table-column type="index" :label="t('common.stt')" width="50" align="center" fixed />
            <el-table-column :label="t('analysis.data.colMeterCode')"   prop="meterNo"        width="130" fixed show-overflow-tooltip />
            <el-table-column :label="t('analysis.data.colTime')"         width="155">
              <template #default="{ row }">{{ fv(row.dataTime) }}</template>
            </el-table-column>
            <el-table-column :label="t('analysis.data.colFlow')"         prop="flow"            width="135" align="right" />
            <el-table-column :label="t('analysis.data.colReverseFlow')"  prop="reverseFlow"     width="140" align="right" />
            <el-table-column :label="t('analysis.data.colPressure1')"    prop="pressure"        width="125" align="right" />
            <el-table-column :label="t('analysis.data.colPressure2')"    prop="pressure2"       width="125" align="right" />
            <el-table-column :label="t('analysis.data.colTotalConsump')" prop="activeTotal"     width="148" align="right" />
            <el-table-column :label="t('analysis.data.colForward')"      prop="forwardTotal"    width="138" align="right" />
            <el-table-column :label="t('analysis.data.colReverse')"      prop="negactiveTotal"  width="138" align="right" />
            <el-table-column :label="t('analysis.data.colGateway')"      prop="gatewayNo"       width="130" show-overflow-tooltip />
          </el-table>
          <div class="flex justify-end mt-3">
            <el-pagination v-model:current-page="lPag.currentPage" v-model:page-size="lPag.pageSize"
              :total="lPag.total" :page-sizes="[20, 50, 100, 200]"
              layout="total, sizes, prev, pager, next" background
              @size-change="(v) => { lPag.pageSize = v; loadLogger(); }"
              @current-change="(v) => { lPag.currentPage = v; loadLogger(); }" />
          </div>
        </el-card>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.page-wrap { padding: 12px; }
.toolbar-card { :deep(.el-card__body) { padding: 10px 16px; } }
.toolbar-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600;
  color: var(--el-text-color-secondary); white-space: nowrap;
}
.data-tabs {
  :deep(.el-tabs__header)  { margin-bottom: 0; }
  :deep(.el-tabs__content) { padding-top: 12px; }
  :deep(.el-tabs__item)    { font-size: 0.8125rem; }
}
.filter-bar { :deep(.el-card__body) { padding: 10px 16px; } }
.kpi-card   { :deep(.el-card__body) { padding: 12px 14px; } }
.kpi-inner  { display: flex; align-items: center; justify-content: space-between; }
.kpi-label  { font-size: 0.7rem; color: var(--el-text-color-secondary); margin-bottom: 3px; }
.kpi-value  { font-size: 1.15rem; font-weight: 700; line-height: 1.2; }
.kpi-icon   { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
:deep(.el-card)        { border-radius: 10px; }
:deep(.el-card__header){ padding: 8px 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.chart-title { font-size: 0.8rem; font-weight: 600; }
.chart-h     { width: 100%; height: 260px; }
</style>
