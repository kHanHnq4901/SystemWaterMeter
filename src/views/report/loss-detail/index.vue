<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";
import { getLoggerZoneSummary } from "@/api/waterMeter";
import { getAllRegions } from "@/api/region";

defineOptions({ name: "ReportLossDetail" });

const { t } = useI18n();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const month = ref(dayjs().format("YYYY-MM"));
const selectedRegion = ref<number | "">("");

const regionList = ref<{ id: number; name: string }[]>([]);
async function loadRegions() {
  const res = await getAllRegions();
  regionList.value = (res.data as any) ?? [];
}

type ZoneRow = {
  regionId: number;
  regionName: string;
  meterCount: number;
  totalFlow: number;
  avgPressure: number;
  consumption: number;
};
const tableData = ref<ZoneRow[]>([]);

const statTotals = computed(() => {
  const total = tableData.value.reduce((s, r) => s + r.totalFlow, 0);
  const avgP   = tableData.value.length
    ? tableData.value.reduce((s, r) => s + r.avgPressure, 0) / tableData.value.length
    : 0;
  const top = tableData.value.reduce((a, b) => (b.totalFlow > a.totalFlow ? b : a), { regionName: "—", totalFlow: 0 } as any);
  return { total: +total.toFixed(0), avgPressure: +avgP.toFixed(2), topZone: top.regionName, zones: tableData.value.length };
});

async function handleSearch() {
  loading.value = true;
  try {
    const [y, m] = month.value.split("-");
    const dateFrom = `${y}-${m}-01`;
    const dateTo   = dayjs(month.value).endOf("month").format("YYYY-MM-DD");

    const { code, data } = await getLoggerZoneSummary({
      dateFrom, dateTo,
      regionId: selectedRegion.value !== "" ? selectedRegion.value : undefined,
      groupBy: "month"
    });

    if (code !== 0 || !data) { tableData.value = []; renderChart(); return; }

    // Aggregate per zone (sum across all periods within the month)
    const map: Record<number, ZoneRow> = {};
    (data as any[]).forEach((r: any) => {
      const id = r.regionId ?? 0;
      if (!map[id]) {
        map[id] = { regionId: id, regionName: r.regionName, meterCount: r.meterCount,
          totalFlow: 0, avgPressure: 0, consumption: 0 };
      }
      map[id].totalFlow   += r.totalFlow ?? 0;
      map[id].avgPressure  = r.avgPressure ?? 0;
      map[id].consumption += r.consumption ?? 0;
    });

    tableData.value = Object.values(map).sort((a, b) => b.totalFlow - a.totalFlow);
    renderChart();
  } finally {
    loading.value = false;
  }
}

const chartRef = ref();
const { setOptions } = useECharts(chartRef, { theme });

function renderChart() {
  if (!tableData.value.length) return;
  const zones = tableData.value.map(r => r.regionName);
  const flows = tableData.value.map(r => +r.totalFlow.toFixed(0));
  const pressures = tableData.value.map(r => +r.avgPressure.toFixed(2));
  const maxFlow = Math.max(...flows, 1);

  setOptions({
    tooltip: { trigger: "axis" },
    legend: { data: ["Lưu lượng (m³)", "Áp suất TB (bar)"], bottom: 0 },
    grid: { left: 70, right: 60, top: 20, bottom: 50 },
    xAxis: { type: "category", data: zones, axisLabel: { rotate: zones.length > 5 ? 30 : 0 } },
    yAxis: [
      { type: "value", name: "m³", position: "left" },
      { type: "value", name: "bar", position: "right", min: 0, axisLabel: { formatter: "{value}" } }
    ],
    series: [
      {
        name: "Lưu lượng (m³)",
        type: "bar",
        data: flows,
        itemStyle: {
          color: (p: any) => {
            const ratio = flows[p.dataIndex] / maxFlow;
            return ratio >= 0.8 ? "#f56c6c" : ratio >= 0.5 ? "#e6a23c" : "#67c23a";
          },
          borderRadius: [3, 3, 0, 0]
        },
        barMaxWidth: 36
      },
      {
        name: "Áp suất TB (bar)",
        type: "line",
        yAxisIndex: 1,
        data: pressures,
        smooth: true,
        lineStyle: { color: "#9b59b6", width: 2 },
        symbol: "circle", symbolSize: 6,
        itemStyle: { color: "#9b59b6" }
      }
    ]
  });
}

function flowLevel(flow: number) {
  const max = Math.max(...tableData.value.map(r => r.totalFlow), 1);
  const ratio = flow / max;
  return ratio >= 0.8 ? "danger" : ratio >= 0.5 ? "warning" : "success";
}
function flowLabel(flow: number) {
  const max = Math.max(...tableData.value.map(r => r.totalFlow), 1);
  const ratio = flow / max;
  return ratio >= 0.8 ? t("report.lossDetail.levelHigh") : ratio >= 0.5 ? t("report.lossDetail.levelMid") : t("report.lossDetail.levelLow");
}

onMounted(async () => {
  await nextTick();
  await loadRegions();
  await handleSearch();
});
watch(theme, () => renderChart());
</script>

<template>
  <div class="main p-4 space-y-4">
    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-center gap-3">
      <el-date-picker v-model="month" type="month" :placeholder="t('report.lossDetail.selectMonth')"
        format="MM/YYYY" value-format="YYYY-MM" style="width: 150px" />
      <el-select v-model="selectedRegion" :placeholder="t('report.lossDetail.allZones')" clearable style="width: 180px">
        <el-option :label="t('report.lossDetail.allZones')" value="" />
        <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="handleSearch">{{ t("report.lossDetail.search") }}</el-button>
      <el-button @click="handleSearch">{{ t("common.refresh") }}</el-button>
      <el-button type="success" class="ml-auto">
        <template #icon><i class="i-ri:download-line" /></template>
        {{ t("report.lossDetail.exportExcel") }}
      </el-button>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-lg p-4 bg-[#fef0f0]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossDetail.totalFlow") }}</div>
        <div class="text-2xl font-bold text-[#f56c6c]">
          {{ statTotals.total.toLocaleString() }}<span class="text-sm font-normal ml-1">m³</span>
        </div>
      </div>
      <div class="rounded-lg p-4 bg-[#fdf6ec]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossDetail.avgPressure") }}</div>
        <div class="text-2xl font-bold text-[#e6a23c]">
          {{ statTotals.avgPressure }}<span class="text-sm font-normal ml-1">bar</span>
        </div>
      </div>
      <div class="rounded-lg p-4 bg-[#f5f0ff]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossDetail.topZone") }}</div>
        <div class="text-xl font-bold text-[#9b59b6] truncate">{{ statTotals.topZone }}</div>
      </div>
      <div class="rounded-lg p-4 bg-[#ecf5ff]">
        <div class="text-xs text-gray-500 mb-1">{{ t("report.lossDetail.zoneCount") }}</div>
        <div class="text-2xl font-bold text-[#409eff]">
          {{ statTotals.zones }}<span class="text-sm font-normal ml-1">vùng</span>
        </div>
      </div>
    </div>

    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">{{ t("report.lossDetail.flowByZone") }} – {{ month }}</div>
      <div ref="chartRef" style="height: 280px" />
    </div>

    <div class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">{{ t("report.lossDetail.zoneDetail") }}</div>
      <el-table :data="tableData" size="small" stripe border v-loading="loading">
        <el-table-column prop="regionName" :label="t('report.lossDetail.zone')" min-width="140" />
        <el-table-column prop="meterCount" :label="t('report.lossDetail.meterCount')" align="center" width="80" />
        <el-table-column prop="totalFlow" :label="t('report.lossDetail.flow')" align="right" width="140">
          <template #default="{ row }">{{ (+row.totalFlow).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="consumption" :label="t('report.lossDetail.consumption')" align="right" width="130">
          <template #default="{ row }">
            <span class="font-semibold text-primary">{{ (+row.consumption).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="avgPressure" :label="t('report.lossDetail.avgPressureBar')" align="center" width="130">
          <template #default="{ row }">{{ (+row.avgPressure).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column :label="t('report.lossDetail.level')" align="center" width="110">
          <template #default="{ row }">
            <el-tag :type="flowLevel(row.totalFlow)" size="small">{{ flowLabel(row.totalFlow) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
