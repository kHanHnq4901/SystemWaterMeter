<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";
import { getWaterMeterList, getLoggerMultiChart } from "@/api/waterMeter";

defineOptions({ name: "ReportFlow" });

const { t } = useI18n();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const metersLoading = ref(false);
const viewMode = ref<"day" | "hour">("day");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));
const dateRange = ref<[string, string]>([
  dayjs().subtract(6, "day").format("YYYY-MM-DD"),
  dayjs().format("YYYY-MM-DD")
]);
const selectedMeters = ref<string[]>([]);

const meterOptions = ref<{ value: string; label: string; zone: string }[]>([]);

async function loadMeters() {
  metersLoading.value = true;
  try {
    const { code, data } = await getWaterMeterList({ pageSize: 500, currentPage: 1 });
    if (code === 0 && data?.list) {
      meterOptions.value = data.list.map((m: any) => ({
        value: m.meterNo,
        label: `${m.meterNo}${m.meterName ? " – " + m.meterName : ""}`,
        zone: m.regionName ?? t("report.flow.unzoned")
      }));
      if (!selectedMeters.value.length && meterOptions.value.length > 0) {
        selectedMeters.value = meterOptions.value.slice(0, 2).map(m => m.value);
      }
    }
  } finally {
    metersLoading.value = false;
  }
}

const selectedMeterObjects = computed(() =>
  selectedMeters.value.map(id => meterOptions.value.find(m => m.value === id)!).filter(Boolean)
);

const zoneGroups = computed(() => {
  const groups: Record<string, typeof meterOptions.value> = {};
  meterOptions.value.forEach(m => {
    if (!groups[m.zone]) groups[m.zone] = [];
    groups[m.zone].push(m);
  });
  return groups;
});

const COLORS = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c", "#9b59b6", "#1abc9c", "#e74c3c", "#3498db"];

const timeLabels = ref<string[]>([]);
type PivotRow = Record<string, any>;
const pivotRows = ref<PivotRow[]>([]);
const seriesMap = ref<Record<string, number[]>>({});

async function handleSearch() {
  if (!selectedMeters.value.length) return;
  loading.value = true;
  try {
    const dateFrom = viewMode.value === "hour" ? selectedDate.value : dateRange.value[0];
    const dateTo   = viewMode.value === "hour" ? selectedDate.value : dateRange.value[1];

    const { code, data } = await getLoggerMultiChart({
      meterNos: selectedMeters.value,
      dateFrom, dateTo,
      groupBy: viewMode.value
    });

    if (code !== 0 || !data?.length) {
      pivotRows.value = []; seriesMap.value = {}; timeLabels.value = [];
      renderChart(); return;
    }

    const periodsSet = new Set<string>((data as any[]).map((r: any) => r.period));
    const periods = [...periodsSet].sort();
    timeLabels.value = periods.map(p =>
      viewMode.value === "hour" ? p.slice(11, 16) : dayjs(p).format("DD/MM")
    );

    const rowMap: Record<string, PivotRow> = {};
    periods.forEach(p => {
      rowMap[p] = { time: viewMode.value === "hour" ? p.slice(11, 16) : dayjs(p).format("DD/MM") };
    });

    (data as any[]).forEach((r: any) => {
      const { meterNo, period } = r;
      rowMap[period][`${meterNo}_avg`] = +(r.avgFlow ?? 0).toFixed(1);
      rowMap[period][`${meterNo}_min`] = +(r.minFlow ?? 0).toFixed(1);
      rowMap[period][`${meterNo}_max`] = +(r.maxFlow ?? 0).toFixed(1);
    });

    const newSeries: Record<string, number[]> = {};
    selectedMeters.value.forEach(id => {
      newSeries[id] = periods.map(p => rowMap[p]?.[`${id}_avg`] ?? 0);
    });

    pivotRows.value = periods.map(p => rowMap[p]);
    seriesMap.value = newSeries;
    renderChart();
    currentPage.value = 1;
  } finally {
    loading.value = false;
  }
}

const meterStats = computed(() =>
  selectedMeters.value.map((id, idx) => {
    const avgs = seriesMap.value[id] ?? [];
    const mins = pivotRows.value.map(r => r[`${id}_min`] as number ?? 0);
    const maxs = pivotRows.value.map(r => r[`${id}_max`] as number ?? 0);
    const total = avgs.reduce((a, b) => a + b, 0);
    return {
      id,
      label: meterOptions.value.find(m => m.value === id)?.label ?? id,
      color: COLORS[idx % COLORS.length],
      avg:   avgs.length ? +(total / avgs.length).toFixed(1) : 0,
      min:   mins.length ? +Math.min(...mins).toFixed(1) : 0,
      max:   maxs.length ? +Math.max(...maxs).toFixed(1) : 0,
      total: +total.toFixed(0)
    };
  })
);

const chartRef = ref();
const { setOptions } = useECharts(chartRef, { theme });

function renderChart() {
  if (!selectedMeters.value.length || !timeLabels.value.length) return;
  setOptions({
    tooltip: {
      trigger: "axis",
      formatter: (params: any) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map((p: any) => `${p.marker}${p.seriesName}: <b>${p.value} m³/h</b>`).join("<br/>")
    },
    legend: { data: selectedMeterObjects.value.map(m => m.label), bottom: 0, type: "scroll" },
    grid: { left: 64, right: 20, top: 16, bottom: 60 },
    xAxis: {
      type: "category", data: timeLabels.value,
      axisLabel: { rotate: timeLabels.value.length > 14 ? 35 : 0, fontSize: 11 }
    },
    yAxis: { type: "value", name: "m³/h", axisLabel: { formatter: (v: number) => v.toFixed(0) } },
    series: selectedMeters.value.map((id, idx) => ({
      name: meterOptions.value.find(m => m.value === id)?.label ?? id,
      type: "line", smooth: true, symbol: "none",
      data: seriesMap.value[id] ?? [],
      lineStyle: { width: 2, color: COLORS[idx % COLORS.length] },
      itemStyle: { color: COLORS[idx % COLORS.length] },
      areaStyle: { color: COLORS[idx % COLORS.length] + "18" }
    }))
  });
}

const currentPage = ref(1);
const pageSize   = ref(24);
const pagedRows  = computed(() =>
  pivotRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
);

onMounted(async () => {
  await nextTick();
  await loadMeters();
  if (selectedMeters.value.length) await handleSearch();
});
watch(theme, () => renderChart());
</script>

<template>
  <div class="main p-4 space-y-4">

    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ t("report.flow.selectMeters") }}</span>
        <el-select v-model="selectedMeters" multiple filterable collapse-tags collapse-tags-tooltip
          :placeholder="t('report.flow.selectMetersPlaceholder')"
          style="width: 300px" :max-collapse-tags="2" :loading="metersLoading">
          <el-option-group v-for="(meters, zone) in zoneGroups" :key="zone" :label="zone">
            <el-option v-for="m in meters" :key="m.value" :label="m.label" :value="m.value" />
          </el-option-group>
        </el-select>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ t("report.flow.viewBy") }}</span>
        <el-radio-group v-model="viewMode" @change="handleSearch">
          <el-radio-button value="hour">{{ t("report.flow.byHour") }}</el-radio-button>
          <el-radio-button value="day">{{ t("report.flow.byDay") }}</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="viewMode === 'hour'" class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ t("report.flow.date") }}</span>
        <el-date-picker v-model="selectedDate" type="date" :placeholder="t('report.flow.date')"
          format="DD/MM/YYYY" value-format="YYYY-MM-DD" style="width: 150px" />
      </div>
      <div v-else class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">{{ t("report.flow.dateRange") }}</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="→"
          :start-placeholder="t('report.flow.from')" :end-placeholder="t('report.flow.to')"
          format="DD/MM/YYYY" value-format="YYYY-MM-DD" style="width: 220px" />
      </div>

      <el-button type="primary" :loading="loading" @click="handleSearch">{{ t("report.flow.viewData") }}</el-button>
      <el-button type="success" class="ml-auto">
        <template #icon><i class="i-ri:download-line" /></template>
        {{ t("report.flow.exportExcel") }}
      </el-button>
    </div>

    <el-alert v-if="!selectedMeters.length"
      :title="t('report.flow.selectWarning')"
      type="warning" :closable="false" show-icon />

    <div v-if="meterStats.length" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div v-for="s in meterStats" :key="s.id"
        class="bg-bg_color rounded-lg p-3 border-l-4" :style="{ borderColor: s.color }">
        <div class="text-xs text-gray-500 truncate mb-2 font-medium">{{ s.label }}</div>
        <div class="grid grid-cols-4 gap-1 text-center">
          <div>
            <div class="text-sm font-bold text-warning">{{ s.min }}</div>
            <div class="text-[10px] text-gray-400">Min</div>
          </div>
          <div>
            <div class="text-sm font-bold text-danger">{{ s.max }}</div>
            <div class="text-[10px] text-gray-400">Max</div>
          </div>
          <div>
            <div class="text-sm font-bold" :style="{ color: s.color }">{{ s.avg }}</div>
            <div class="text-[10px] text-gray-400">{{ t("report.flow.average") }}</div>
          </div>
          <div>
            <div class="text-sm font-bold text-gray-600">{{ s.total.toLocaleString() }}</div>
            <div class="text-[10px] text-gray-400">{{ t("report.flow.total") }}</div>
          </div>
        </div>
        <div class="text-[10px] text-gray-400 text-right mt-1">{{ t("report.flow.unit") }}</div>
      </div>
    </div>

    <div v-if="selectedMeters.length && timeLabels.length" class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">
        {{ t("report.flow.flowChart") }}
        <span class="text-gray-400 font-normal text-xs ml-2">
          {{ viewMode === 'hour' ? `${t('report.flow.byHour')} – ${selectedDate}` : `${t('report.flow.byDay')} – ${dateRange[0]} → ${dateRange[1]}` }}
        </span>
      </div>
      <div ref="chartRef" style="height: 300px" />
    </div>

    <div v-if="selectedMeters.length && pivotRows.length" class="bg-bg_color rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="font-semibold text-sm">
          {{ t("report.flow.dataTable") }}
          <el-tag type="info" size="small" class="ml-2">{{ pivotRows.length }} {{ t("report.flow.timePoints") }}</el-tag>
        </span>
        <span class="text-xs text-gray-400">{{ t("report.flow.unit") }}</span>
      </div>

      <el-table :data="pagedRows" size="small" stripe border
        :header-cell-style="{ textAlign: 'center', fontSize: '12px' }"
        :cell-style="{ textAlign: 'center' }">
        <el-table-column prop="time" :label="t('report.flow.time')" width="100" fixed="left" align="center"
          :header-cell-style="{ background: 'var(--el-fill-color-light)' }" />
        <el-table-column v-for="(meter, idx) in selectedMeterObjects" :key="meter.value" align="center">
          <template #header>
            <span :style="{ color: COLORS[idx % COLORS.length], fontWeight: 600 }">{{ meter.label }}</span>
          </template>
          <el-table-column :prop="`${meter.value}_min`" label="Min" width="76" align="center">
            <template #default="{ row }">
              <span class="text-warning text-xs font-medium">{{ row[`${meter.value}_min`] }}</span>
            </template>
          </el-table-column>
          <el-table-column :prop="`${meter.value}_max`" label="Max" width="76" align="center">
            <template #default="{ row }">
              <span class="text-danger text-xs font-medium">{{ row[`${meter.value}_max`] }}</span>
            </template>
          </el-table-column>
          <el-table-column :prop="`${meter.value}_avg`" :label="t('report.flow.average')" width="76" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold" :style="{ color: COLORS[idx % COLORS.length] }">
                {{ row[`${meter.value}_avg`] }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-3">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
          :total="pivotRows.length" :page-sizes="[24, 48, 96]"
          layout="total, sizes, prev, pager, next" small />
      </div>
    </div>

  </div>
</template>
