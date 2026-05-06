<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";
import { getLoggerZoneSummary, getLoggerProduction } from "@/api/waterMeter";

defineOptions({ name: "ReportLossTotal" });

const { t } = useI18n();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const year = ref(dayjs().format("YYYY"));

type ZonePie = { name: string; value: number; regionId: number };
const zoneData = ref<ZonePie[]>([]);

type MonthTrend = { period: string; totalFlow: number };
const monthlyData = ref<MonthTrend[]>([]);

const statTotals = computed(() => {
  const total   = zoneData.value.reduce((s, r) => s + r.value, 0);
  const months  = monthlyData.value.length;
  const avgMonth = months ? +(total / months).toFixed(0) : 0;
  const topZone  = zoneData.value.reduce((a, b) => b.value > a.value ? b : a, { name: "—", value: 0 } as any);
  return { total: +total.toFixed(0), avgMonth, topZone: topZone.name, zones: zoneData.value.length };
});

const pieChartRef = ref();
const lineChartRef = ref();
const { setOptions: setPieOptions }  = useECharts(pieChartRef,  { theme });
const { setOptions: setLineOptions } = useECharts(lineChartRef, { theme });

function renderPie() {
  if (!zoneData.value.length) return;
  setPieOptions({
    tooltip: { trigger: "item", formatter: "{b}: {c} m³ ({d}%)" },
    legend: { orient: "vertical", left: "left", top: "center" },
    series: [{
      type: "pie", radius: ["40%", "70%"], center: ["60%", "50%"],
      data: zoneData.value.map(d => ({ name: d.name, value: d.value })),
      label: { formatter: "{b}\n{c} m³" },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } }
    }]
  });
}

function renderLine() {
  const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
  const monthMap: Record<string, number> = {};
  monthlyData.value.forEach(r => {
    if (r.period) monthMap[r.period] = (monthMap[r.period] ?? 0) + r.totalFlow;
  });
  const thisYear = Array.from({ length: 12 }, (_, i) => {
    const key = `${year.value}-${String(i + 1).padStart(2, "0")}`;
    return +(monthMap[key] ?? 0).toFixed(0);
  });

  setLineOptions({
    tooltip: {
      trigger: "axis",
      formatter: (params: any) =>
        `${params[0].axisValue}<br/>` +
        params.map((p: any) => `${p.marker}${p.seriesName}: ${p.value.toLocaleString()} m³`).join("<br/>")
    },
    legend: { data: ["Lưu lượng (m³)"], bottom: 0 },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: { type: "category", data: months },
    yAxis: { type: "value", name: "m³", axisLabel: { formatter: (v: number) => v.toLocaleString() } },
    series: [{
      name: "Lưu lượng (m³)",
      type: "line", smooth: true,
      data: thisYear,
      lineStyle: { color: "#409eff", width: 2 },
      areaStyle: { color: "rgba(64,158,255,0.1)" },
      itemStyle: { color: "#409eff" }
    }]
  });
}

async function handleSearch() {
  loading.value = true;
  try {
    const dateFrom = `${year.value}-01-01`;
    const dateTo   = `${year.value}-12-31`;

    const [zoneRes, monthRes] = await Promise.all([
      getLoggerZoneSummary({ dateFrom, dateTo, groupBy: "year" }),
      getLoggerZoneSummary({ dateFrom, dateTo, groupBy: "month" })
    ]);

    // Pie: zone totals for the year
    if (zoneRes.code === 0 && zoneRes.data?.length) {
      const map: Record<number, ZonePie> = {};
      (zoneRes.data as any[]).forEach((r: any) => {
        const id = r.regionId ?? 0;
        if (!map[id]) map[id] = { name: r.regionName, value: 0, regionId: id };
        map[id].value += +(r.totalFlow ?? 0);
      });
      zoneData.value = Object.values(map)
        .filter(z => z.value > 0)
        .sort((a, b) => b.value - a.value)
        .map(z => ({ ...z, value: +z.value.toFixed(0) }));
    } else {
      zoneData.value = [];
    }

    // Line: monthly trend
    if (monthRes.code === 0 && monthRes.data?.length) {
      const monthMap: Record<string, number> = {};
      (monthRes.data as any[]).forEach((r: any) => {
        if (r.period) monthMap[r.period] = (monthMap[r.period] ?? 0) + (r.totalFlow ?? 0);
      });
      monthlyData.value = Object.entries(monthMap).map(([period, totalFlow]) => ({ period, totalFlow }));
    } else {
      monthlyData.value = [];
    }

    renderPie();
    renderLine();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await nextTick();
  await handleSearch();
});
watch(theme, () => { renderPie(); renderLine(); });
</script>

<template>
  <div class="main p-4 space-y-4">
    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-center gap-3">
      <el-date-picker v-model="year" type="year" :placeholder="t('report.lossTotal.selectYear')"
        format="YYYY" value-format="YYYY" style="width: 120px" />
      <el-button type="primary" :loading="loading" @click="handleSearch">{{ t("report.lossTotal.search") }}</el-button>
      <el-button type="success" class="ml-auto">
        <template #icon><i class="i-ri:download-line" /></template>
        {{ t("report.lossTotal.exportExcel") }}
      </el-button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-lg p-4 bg-[#fef0f0]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossTotal.totalFlowYear") }}</div>
        <div class="text-2xl font-bold text-[#f56c6c]">
          {{ statTotals.total.toLocaleString() }}<span class="text-sm font-normal ml-1">m³</span>
        </div>
      </div>
      <div class="rounded-lg p-4 bg-[#fdf6ec]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossTotal.avgPerMonth") }}</div>
        <div class="text-2xl font-bold text-[#e6a23c]">
          {{ statTotals.avgMonth.toLocaleString() }}<span class="text-sm font-normal ml-1">m³</span>
        </div>
      </div>
      <div class="rounded-lg p-4 bg-[#f5f0ff]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossTotal.topZone") }}</div>
        <div class="text-xl font-bold text-[#9b59b6] truncate">{{ statTotals.topZone }}</div>
      </div>
      <div class="rounded-lg p-4 bg-[#ecf5ff]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossTotal.zoneCount") }}</div>
        <div class="text-2xl font-bold text-[#409eff]">
          {{ statTotals.zones }}<span class="text-sm font-normal ml-1">vùng</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div class="xl:col-span-2 bg-bg_color rounded-lg p-4">
        <div class="font-semibold text-sm mb-3">{{ t("report.lossTotal.flowByZone") }} – {{ year }}</div>
        <div v-if="zoneData.length" ref="pieChartRef" style="height: 280px" />
        <el-empty v-else :description="t('report.lossTotal.noData')" style="height: 280px" />
      </div>
      <div class="xl:col-span-3 bg-bg_color rounded-lg p-4">
        <div class="font-semibold text-sm mb-3">{{ t("report.lossTotal.monthlyTrend") }}</div>
        <div v-if="monthlyData.length" ref="lineChartRef" style="height: 280px" />
        <el-empty v-else :description="t('report.lossTotal.noData')" style="height: 280px" />
      </div>
    </div>

    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">{{ t("report.lossTotal.zoneSummary") }} – {{ year }}</div>
      <el-table :data="zoneData" size="small" stripe border v-loading="loading">
        <el-table-column prop="name" :label="t('report.lossTotal.zone')" />
        <el-table-column prop="value" :label="t('report.lossTotal.flow')" align="right">
          <template #default="{ row }">{{ row.value.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column :label="t('report.lossTotal.ratio')" align="center" width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="+((row.value / (statTotals.total || 1)) * 100).toFixed(1)"
              :color="'#409eff'"
              :stroke-width="14"
              :show-text="false"
            />
            <span class="text-xs ml-1">{{ ((row.value / (statTotals.total || 1)) * 100).toFixed(1) }}%</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('report.lossTotal.level')" align="center" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.value / (statTotals.total || 1) >= 0.3 ? 'danger' : row.value / (statTotals.total || 1) >= 0.15 ? 'warning' : 'success'"
              size="small"
            >
              {{ row.value / (statTotals.total || 1) >= 0.3 ? t("report.lossTotal.levelHigh") : row.value / (statTotals.total || 1) >= 0.15 ? t("report.lossTotal.levelMid") : t("report.lossTotal.levelLow") }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
