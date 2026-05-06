<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDark, useECharts } from "@pureadmin/utils";
import { getLoggerProduction } from "@/api/waterMeter";
import ZoneTreeSelect from "@/components/ZoneTreeSelect/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "AnalysisProduction" });

const { t } = useI18n();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const zone = reactive<TreeSelection & { hasFilter: boolean }>({
  type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: [], hasFilter: false
});

function onZoneSelect(sel: TreeSelection) {
  Object.assign(zone, sel, { hasFilter: sel.type !== "clear" });
  pag.currentPage = 1;
  load();
}

function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [from.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
}

const dateRange = ref<[string, string]>(defaultRange());
const groupBy   = ref<"day" | "month">("day");

const loading  = ref(false);
const rawData  = ref<any[]>([]);
const pag      = reactive({ currentPage: 1, pageSize: 20, total: 0 });

function r2(v: any)  { return Math.round((Number(v) || 0) * 100) / 100; }
function fn(n: number, dec = 0) {
  return dec > 0 ? n.toLocaleString("vi-VN", { minimumFractionDigits: dec, maximumFractionDigits: dec })
                 : Math.round(n).toLocaleString("vi-VN");
}

const kpi = computed(() => {
  const d = rawData.value;
  const totalFlow     = r2(d.reduce((s, x) => s + (x.totalFlow || 0), 0));
  const totalConsump  = r2(d.reduce((s, x) => s + (x.consumption || 0), 0));
  const totalReverse  = r2(d.reduce((s, x) => s + (x.totalReverseFlow || 0), 0));
  const days          = d.length || 1;
  const avgPerDay     = r2(totalConsump / days);
  const peakRow       = d.reduce((best: any, x) => (x.consumption || 0) > (best?.consumption || 0) ? x : best, d[0]);
  return { totalFlow, totalConsump, totalReverse, avgPerDay, peakPeriod: peakRow?.period ?? "—", peakVal: r2(peakRow?.consumption || 0) };
});

const kpiCards = computed(() => [
  { label: t("analysis.production.kpiTotalConsumption"),  value: `${fn(kpi.value.totalConsump, 1)} m³`, color: "#41b6ff", bg: "#e8f6ff", icon: "ri:drop-fill"         },
  { label: t("analysis.production.kpiTotalForwardFlow"),  value: `${fn(kpi.value.totalFlow, 1)} m³`,    color: "#67c23a", bg: "#f0f9eb", icon: "ri:water-flash-line"   },
  { label: t("analysis.production.kpiAvgPerDay"),         value: `${fn(kpi.value.avgPerDay, 1)} m³`,    color: "#9b59b6", bg: "#f5f0ff", icon: "ri:bar-chart-2-line"   },
  { label: t("analysis.production.kpiReverseFlow"),       value: `${fn(kpi.value.totalReverse, 1)} m³`, color: "#e85f33", bg: "#fff1ee", icon: "ri:arrow-go-back-line" },
]);

const tableRows = computed(() => {
  const start = (pag.currentPage - 1) * pag.pageSize;
  return rawData.value.slice(start, start + pag.pageSize);
});

function buildCumulative(data: any[]) {
  let acc = 0;
  return data.map(d => { acc += r2(d.consumption || 0); return r2(acc); });
}

const mainRef  = ref<HTMLDivElement>();
const cumuRef  = ref<HTMLDivElement>();
const { setOptions: setMain } = useECharts(mainRef, { theme });
const { setOptions: setCumu } = useECharts(cumuRef, { theme });

function renderCharts() {
  nextTick(() => {
    const d       = rawData.value;
    const periods = d.map(x => x.period ?? "");
    const consump = d.map(x => r2(x.consumption));
    const flows   = d.map(x => r2(x.totalFlow));
    const reverse = d.map(x => r2(x.totalReverseFlow));
    const cumul   = buildCumulative(d);

    setMain({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        data: [t("analysis.production.colConsumption"), t("analysis.production.colForwardFlow"), t("analysis.production.colReverseFlow")],
        bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 }
      },
      grid: { top: 16, left: 62, right: 12, bottom: 50 },
      xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: periods.length > 20 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        { name: t("analysis.production.colConsumption"),  type: "bar",  data: consump, barMaxWidth: 20, itemStyle: { color: "#41b6ff", borderRadius: [3,3,0,0] } },
        { name: t("analysis.production.colForwardFlow"),  type: "line", smooth: true, data: flows,   itemStyle: { color: "#67c23a" }, symbol: "none", lineStyle: { width: 2 } },
        { name: t("analysis.production.colReverseFlow"),  type: "bar",  data: reverse, barMaxWidth: 8, itemStyle: { color: "#e85f33", borderRadius: [3,3,0,0] } }
      ]
    });

    setCumu({
      tooltip: { trigger: "axis" },
      grid: { top: 16, left: 62, right: 12, bottom: 28 },
      xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: periods.length > 20 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{
        name: t("analysis.production.cumulativeChart"), type: "line", smooth: true, data: cumul,
        itemStyle: { color: "#9b59b6" }, symbol: "none",
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(155,89,182,0.4)" }, { offset: 1, color: "rgba(155,89,182,0.02)" }]
          }
        }
      }]
    });
  });
}

async function load() {
  loading.value = true;
  try {
    const res = await getLoggerProduction({
      meterNo:  zone.meterNo  || undefined,
      regionId: zone.regionId ?? undefined,
      dateFrom: dateRange.value[0] || undefined,
      dateTo:   dateRange.value[1] || undefined,
      groupBy:  groupBy.value
    });
    if (res.code === 0 && Array.isArray(res.data)) {
      rawData.value   = res.data as any[];
      pag.total       = rawData.value.length;
      pag.currentPage = 1;
      renderCharts();
    }
  } finally { loading.value = false; }
}

function onSearch() { pag.currentPage = 1; load(); }
function onReset()  {
  dateRange.value = defaultRange();
  groupBy.value   = "day";
  pag.currentPage = 1;
  load();
}

watch(groupBy, () => { pag.currentPage = 1; load(); });
onMounted(() => load());
</script>

<template>
  <div class="page-wrap">
    <main class="content-panel">

      <!-- Breadcrumb -->
      <div class="breadcrumb-bar mb-3">
        <IconifyIconOnline icon="ri:map-pin-2-line" color="#9ca3af" width="14" class="mr-1" />
        <el-breadcrumb separator="›">
          <el-breadcrumb-item>{{ t("analysis.production.breadcrumb") }}</el-breadcrumb-item>
          <el-breadcrumb-item v-if="zone.type === 'zone'">
            <IconifyIconOnline icon="ri:map-2-line" color="#67c23a" width="12" class="mr-0.5" />{{ zone.label }}
          </el-breadcrumb-item>
          <el-breadcrumb-item v-if="zone.meterNo">
            <IconifyIconOnline icon="ri:drop-line" color="#67c23a" width="12" class="mr-0.5" />{{ zone.meterNo }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- Filter bar -->
      <el-card shadow="never" class="filter-bar mb-3">
        <div class="flex flex-wrap items-center gap-3">
          <ZoneTreeSelect :placeholder="t('analysis.production.selectZone')" @select="onZoneSelect" />
          <el-divider direction="vertical" />

          <el-radio-group v-model="groupBy" size="default">
            <el-radio-button value="day">
              <IconifyIconOnline icon="ri:calendar-line" width="13" class="mr-1" />{{ t("analysis.production.byDay") }}
            </el-radio-button>
            <el-radio-button value="month">
              <IconifyIconOnline icon="ri:calendar-2-line" width="13" class="mr-1" />{{ t("analysis.production.byMonth") }}
            </el-radio-button>
          </el-radio-group>

          <el-divider direction="vertical" />

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="→"
            :start-placeholder="t('analysis.production.from')"
            :end-placeholder="t('analysis.production.to')"
            value-format="YYYY-MM-DD"
            style="width: 270px"
          />

          <el-button type="primary" :loading="loading" @click="onSearch">
            <IconifyIconOnline icon="ri:search-line" width="14" class="mr-1" />{{ t("analysis.production.viewProduction") }}
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="onReset">{{ t("analysis.production.reset") }}</el-button>

          <el-tag v-if="zone.hasFilter" type="success" size="default" class="ml-auto">
            <IconifyIconOnline :icon="zone.type === 'zone' ? 'ri:map-2-line' : 'ri:drop-line'" width="13" class="mr-1" />
            {{ zone.label }}
          </el-tag>
        </div>
      </el-card>

      <!-- KPI Cards -->
      <el-row :gutter="12" class="mb-3">
        <el-col v-for="(c, i) in kpiCards" :key="i" :xs="12" :sm="12" :md="6">
          <el-card shadow="never" class="kpi-card mb-3" v-loading="loading">
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

      <!-- Peak info banner -->
      <el-alert v-if="rawData.length" type="info" :closable="false" class="mb-3 peak-alert">
        <template #default>
          <span class="text-xs">
            <IconifyIconOnline icon="ri:bar-chart-box-line" width="13" class="mr-1" />
            <b>{{ t("analysis.production.peak") }}:</b> {{ kpi.peakPeriod }} —
            <b class="text-blue-500">{{ fn(kpi.peakVal, 1) }} m³</b>
            &nbsp;|&nbsp;
            <b>{{ groupBy === 'day' ? t("analysis.production.byDay") : t("analysis.production.byMonth") }}:</b> {{ rawData.length }} {{ t("analysis.production.periods") }}
            &nbsp;|&nbsp;
            <b>{{ zone.hasFilter ? zone.label : t("analysis.production.viewingAll") }}</b>
          </span>
        </template>
      </el-alert>

      <!-- Charts -->
      <el-row :gutter="12" class="mb-3">
        <el-col :xs="24" :md="15">
          <el-card shadow="never">
            <template #header>
              <span class="chart-title">{{ groupBy === 'day' ? t("analysis.production.productionByDay") : t("analysis.production.productionByMonth") }}</span>
              <span class="chart-sub ml-2">{{ t("analysis.production.chartSubtitle") }}</span>
            </template>
            <div ref="mainRef" class="chart-h-lg" />
          </el-card>
        </el-col>
        <el-col :xs="24" :md="9">
          <el-card shadow="never">
            <template #header>
              <span class="chart-title">{{ t("analysis.production.cumulativeChart") }}</span>
              <span class="chart-sub ml-2">{{ t("analysis.production.runningTotal") }}</span>
            </template>
            <div ref="cumuRef" class="chart-h-lg" />
          </el-card>
        </el-col>
      </el-row>

      <!-- Table -->
      <el-card shadow="never">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">
              {{ t("analysis.production.tableTitle") }} – {{ groupBy === 'day' ? t("analysis.production.byDay") : t("analysis.production.byMonth") }}
            </span>
            <el-tag type="info" size="small">{{ rawData.length }} {{ t("analysis.production.periods") }}</el-tag>
          </div>
        </template>

        <el-table
          v-loading="loading"
          :data="tableRows"
          size="small"
          border
          show-summary
          :summary-method="() => {
            const d = rawData;
            return [t('analysis.production.totalRow'), '',
              fn(d.reduce((s,x)=>s+x.readingCount,0)),
              fn(d.reduce((s,x)=>s+(x.totalFlow||0),0),1)+' m³',
              fn(d.reduce((s,x)=>s+(x.totalReverseFlow||0),0),1)+' m³',
              fn(d.reduce((s,x)=>s+(x.consumption||0),0),1)+' m³',
              '', ''];
          }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
        >
          <el-table-column type="index" :label="t('common.stt')" width="50" align="center" fixed />
          <el-table-column :label="groupBy === 'day' ? t('analysis.production.colDay') : t('analysis.production.colMonth')" prop="period" width="110" fixed>
            <template #default="{ row }">
              <span class="font-medium text-blue-600">{{ row.period }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('analysis.production.colMeterCount')" prop="meterCount" width="80" align="center" />
          <el-table-column :label="t('analysis.production.colReadings')" prop="readingCount" width="95" align="right" />
          <el-table-column :label="t('analysis.production.colForwardFlow')" width="160" align="right">
            <template #default="{ row }">{{ fn(row.totalFlow || 0, 2) }}</template>
          </el-table-column>
          <el-table-column :label="t('analysis.production.colReverseFlow')" width="145" align="right">
            <template #default="{ row }">
              <span :class="(row.totalReverseFlow || 0) > 0 ? 'text-red-500' : ''">
                {{ fn(row.totalReverseFlow || 0, 2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="t('analysis.production.colConsumption')" width="175" align="right">
            <template #default="{ row }">
              <span class="font-semibold text-blue-600">{{ fn(row.consumption || 0, 2) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('analysis.production.colPressure')" width="135" align="right">
            <template #default="{ row }">{{ fn(row.avgPressure || 0, 2) }}</template>
          </el-table-column>
          <el-table-column :label="t('analysis.production.colEval')" width="110" align="center">
            <template #default="{ row }">
              <el-tag
                :type="(row.consumption||0) === 0 ? 'danger' : (row.totalReverseFlow||0)/(row.totalFlow||1) > 0.1 ? 'warning' : 'success'"
                size="small"
              >
                {{ (row.consumption||0) === 0 ? t("analysis.production.noData") : (row.totalReverseFlow||0)/(row.totalFlow||1) > 0.1 ? t("analysis.production.highReverse") : t("analysis.production.normal") }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-end mt-3">
          <el-pagination
            v-model:current-page="pag.currentPage"
            v-model:page-size="pag.pageSize"
            :total="pag.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            background
          />
        </div>
      </el-card>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.page-wrap { padding: 12px; }
.content-panel { min-width: 0; overflow: hidden; }

.breadcrumb-bar {
  display: flex;
  align-items: center;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.8125rem;
}

.filter-bar {
  :deep(.el-card__body) { padding: 10px 16px; }
}

.peak-alert {
  :deep(.el-alert__content) { padding: 4px 0; }
}

.kpi-card {
  :deep(.el-card__body) { padding: 12px 14px; }
}
.kpi-inner  { display: flex; align-items: center; justify-content: space-between; }
.kpi-label  { font-size: 0.7rem; color: var(--el-text-color-secondary); margin-bottom: 3px; }
.kpi-value  { font-size: 1.15rem; font-weight: 700; line-height: 1.2; }
.kpi-icon   { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

:deep(.el-card) { border-radius: 10px; }
:deep(.el-card__header) { padding: 8px 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.chart-title { font-size: 0.8rem; font-weight: 600; }
.chart-sub   { font-size: 0.7rem; color: var(--el-text-color-placeholder); }
.chart-h-lg  { width: 100%; height: 260px; }

:deep(.el-table__footer td) {
  background: var(--el-fill-color) !important;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
