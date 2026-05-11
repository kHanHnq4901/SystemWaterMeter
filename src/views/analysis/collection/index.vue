<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import { getCollectionRate } from "@/api/waterMeter";
import ZoneTreeSelect from "@/components/ZoneTreeSelect/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "AnalysisCollection" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [from.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
}

const dateRange = ref<[string, string]>(defaultRange());
const zone = reactive<TreeSelection & { hasFilter: boolean }>({
  type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: [], hasFilter: false
});

const loading = ref(false);
const total   = ref(0);
const series  = ref<{ date: string; received: number; total: number; rate: number }[]>([]);

const kpi = computed(() => {
  if (!series.value.length) return { avg: 0, best: "—", bestRate: 0, worst: "—", worstRate: 0 };
  const rates    = series.value.map(r => r.rate);
  const avg      = Math.round(rates.reduce((s, v) => s + v, 0) / rates.length * 10) / 10;
  const bestIdx  = rates.indexOf(Math.max(...rates));
  const worstIdx = rates.indexOf(Math.min(...rates));
  return {
    avg,
    best:      series.value[bestIdx]?.date  ?? "—",
    bestRate:  series.value[bestIdx]?.rate  ?? 0,
    worst:     series.value[worstIdx]?.date ?? "—",
    worstRate: series.value[worstIdx]?.rate ?? 0
  };
});

// ── Chart ────────────────────────────────────────────────────────────
const chartRef = ref<HTMLDivElement>();
const { setOptions } = useECharts(chartRef as any);

function renderChart() {
  if (!series.value.length) return;
  const days  = series.value.map(r => r.date);
  const rates = series.value.map(r => r.rate);
  setOptions({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const p   = params[0];
        const row = series.value[p.dataIndex];
        return `${p.axisValue}<br/>Tỷ lệ: <b>${p.value}%</b><br/>Nhận: ${row.received} / ${row.total} ĐH`;
      }
    },
    grid: { left: 56, right: 20, top: 40, bottom: 64 },
    xAxis: {
      type: "category",
      data: days,
      axisLabel: { rotate: 45, fontSize: 11 }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { formatter: "{value}%" }
    },
    series: [{
      type: "bar",
      data: rates,
      barMaxWidth: 32,
      itemStyle: {
        color: (p: any) =>
          p.value >= 90 ? "#67c23a" : p.value >= 70 ? "#e6a23c" : "#f56c6c",
        borderRadius: [3, 3, 0, 0]
      },
      markLine: {
        silent: true,
        lineStyle: { color: "#409eff", type: "dashed" },
        data: [{ yAxis: kpi.value.avg, label: { formatter: `TB: ${kpi.value.avg}%`, position: "insideEndTop" } }]
      }
    }]
  });
}

async function load() {
  loading.value = true;
  try {
    const [from, to] = dateRange.value;
    const res = await getCollectionRate({
      dateFrom: from,
      dateTo:   to,
      regionId: zone.hasFilter && zone.type !== "meter" ? zone.regionId : undefined
    });
    if (res.code === 0) {
      total.value  = res.data.total;
      series.value = res.data.series;
      await nextTick();
      renderChart();
    }
  } finally {
    loading.value = false;
  }
}

watch(theme, renderChart);
onMounted(load);

function onZoneSelect(sel: TreeSelection) {
  Object.assign(zone, sel, { hasFilter: sel.type !== "clear" });
  load();
}
</script>

<template>
  <div class="collection-wrap">
    <!-- Toolbar -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <span class="page-title">Tỷ lệ Thu thập</span>
        <ZoneTreeSelect width="240px" popper-width="360px" @select="onZoneSelect" />
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="→"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          style="width: 260px"
          @change="load"
        />
        <el-button :icon="useRenderIcon(Refresh)" :loading="loading" @click="load">
          Làm mới
        </el-button>
      </div>
    </el-card>

    <!-- KPI -->
    <div class="kpi-grid">
      <el-card shadow="never" class="kpi-card">
        <div class="kpi-label">Tổng đồng hồ</div>
        <div class="kpi-value" style="color: #409eff">{{ total.toLocaleString("vi-VN") }}</div>
      </el-card>
      <el-card shadow="never" class="kpi-card">
        <div class="kpi-label">Tỷ lệ trung bình</div>
        <div
          class="kpi-value"
          :style="{ color: kpi.avg >= 90 ? '#67c23a' : kpi.avg >= 70 ? '#e6a23c' : '#f56c6c' }"
        >{{ kpi.avg }}%</div>
      </el-card>
      <el-card shadow="never" class="kpi-card">
        <div class="kpi-label">Ngày tốt nhất</div>
        <div class="kpi-date" style="color: #67c23a">{{ kpi.best }}</div>
        <div class="kpi-sub">{{ kpi.bestRate }}%</div>
      </el-card>
      <el-card shadow="never" class="kpi-card">
        <div class="kpi-label">Ngày thấp nhất</div>
        <div class="kpi-date" style="color: #f56c6c">{{ kpi.worst }}</div>
        <div class="kpi-sub">{{ kpi.worstRate }}%</div>
      </el-card>
    </div>

    <!-- Chart -->
    <el-card shadow="never" class="chart-card">
      <div class="section-title">Biểu đồ tỷ lệ thu thập theo ngày</div>
      <div ref="chartRef" v-loading="loading" style="height: 320px" />
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="series" size="small" stripe :max-height="360" v-loading="loading">
        <el-table-column label="Ngày" prop="date" width="120" />
        <el-table-column label="Đã nhận (ĐH)" prop="received" align="right" width="140" />
        <el-table-column label="Tổng (ĐH)" prop="total" align="right" width="120" />
        <el-table-column label="Tỷ lệ" align="right" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.rate >= 90 ? 'success' : row.rate >= 70 ? 'warning' : 'danger'"
              size="small"
            >{{ row.rate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column min-width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="row.rate"
              :stroke-width="6"
              :color="row.rate >= 90 ? '#67c23a' : row.rate >= 70 ? '#e6a23c' : '#f56c6c'"
              :show-text="false"
            />
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!loading && !series.length" class="empty-hint">Không có dữ liệu</div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.collection-wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toolbar-card :deep(.el-card__body) { padding: 10px 16px; }
.toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.page-title { font-size: 15px; font-weight: 600; white-space: nowrap; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}
.kpi-card :deep(.el-card__body) { padding: 14px 16px; }
.kpi-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.kpi-value { font-size: 26px; font-weight: 700; line-height: 1; }
.kpi-date  { font-size: 15px; font-weight: 600; }
.kpi-sub   { font-size: 12px; color: #909399; margin-top: 2px; }

.chart-card :deep(.el-card__body) { padding: 14px 16px; }
.section-title { font-size: 13px; font-weight: 500; margin-bottom: 10px; }

.table-card :deep(.el-card__body) { padding: 0; }
.empty-hint { text-align: center; color: #909399; padding: 32px 0; font-size: 13px; }
</style>
