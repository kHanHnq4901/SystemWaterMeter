<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import dayjs from "dayjs";

defineOptions({ name: "ReportPressure" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

const loading = ref(false);
const viewMode = ref<"day" | "hour">("day");
const selectedDate = ref(dayjs().format("YYYY-MM-DD"));
const dateRange = ref<[string, string]>([
  dayjs().subtract(6, "day").format("YYYY-MM-DD"),
  dayjs().format("YYYY-MM-DD")
]);
const selectedMeters = ref<string[]>(["DH001", "DH002"]);

const meterOptions = [
  { value: "DH001", label: "DH001 – Nguyễn Huệ", zone: "Vùng A" },
  { value: "DH002", label: "DH002 – Lê Lợi",     zone: "Vùng A" },
  { value: "DH003", label: "DH003 – Trần Phú",    zone: "Vùng B" },
  { value: "DH004", label: "DH004 – Đinh Tiên Hoàng", zone: "Vùng B" },
  { value: "DH005", label: "DH005 – Hai Bà Trưng", zone: "Vùng C" },
  { value: "DH006", label: "DH006 – Lý Thường Kiệt", zone: "Vùng C" },
  { value: "DH007", label: "DH007 – Bùi Thị Xuân", zone: "Vùng D" },
  { value: "DH008", label: "DH008 – Ngô Quyền",   zone: "Vùng D" }
];

const selectedMeterObjects = computed(() =>
  selectedMeters.value.map(id => meterOptions.find(m => m.value === id)!).filter(Boolean)
);

const COLORS = ["#409eff", "#67c23a", "#e6a23c", "#f56c6c", "#9b59b6", "#1abc9c", "#e74c3c", "#3498db"];

// ── Data generation ───────────────────────────────────────────────────────────
function walk(base: number, n: number, noise: number) {
  let v = base;
  return Array.from({ length: n }, () => {
    v += (Math.random() - 0.5) * noise;
    v = Math.max(1.0, Math.min(8.0, v));
    return +v.toFixed(2);
  });
}

const timeLabels = ref<string[]>([]);

type PivotRow = Record<string, any>;
const pivotRows = ref<PivotRow[]>([]);

// seriesMap: meterId → array of avg values (for chart)
const seriesMap = ref<Record<string, number[]>>({});

function buildData() {
  let labels: string[] = [];
  if (viewMode.value === "hour") {
    labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  } else {
    const from = dayjs(dateRange.value[0]);
    const to   = dayjs(dateRange.value[1]);
    const days  = to.diff(from, "day") + 1;
    labels = Array.from({ length: days }, (_, i) => from.add(i, "day").format("DD/MM"));
  }
  timeLabels.value = labels;

  const newSeries: Record<string, number[]> = {};
  const rows: PivotRow[] = labels.map((t, ti) => {
    const row: PivotRow = { time: t };
    selectedMeters.value.forEach((id, mi) => {
      const base = 3.2 + mi * 0.4 + Math.sin(ti / labels.length * Math.PI) * 0.8;
      const noise = viewMode.value === "hour" ? 0.6 : 1.2;
      const samples = walk(base, viewMode.value === "hour" ? 4 : 24, noise);
      const min = +Math.min(...samples).toFixed(2);
      const max = +Math.max(...samples).toFixed(2);
      const avg = +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2);
      row[`${id}_min`] = min;
      row[`${id}_max`] = max;
      row[`${id}_avg`] = avg;
      if (!newSeries[id]) newSeries[id] = [];
      newSeries[id].push(avg);
    });
    return row;
  });

  pivotRows.value = rows;
  seriesMap.value = newSeries;
}

// ── Summary stats per meter ───────────────────────────────────────────────────
const meterStats = computed(() =>
  selectedMeters.value.map((id, idx) => {
    const avgs = seriesMap.value[id] ?? [];
    const mins = pivotRows.value.map(r => r[`${id}_min`] as number);
    const maxs = pivotRows.value.map(r => r[`${id}_max`] as number);
    return {
      id,
      label: meterOptions.find(m => m.value === id)?.label ?? id,
      color: COLORS[idx % COLORS.length],
      avg: avgs.length ? +(avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : 0,
      min: mins.length ? Math.min(...mins) : 0,
      max: maxs.length ? Math.max(...maxs) : 0
    };
  })
);

// ── Chart ─────────────────────────────────────────────────────────────────────
const chartRef = ref();
const { setOptions } = useECharts(chartRef, { theme });

function renderChart() {
  if (!selectedMeters.value.length) return;
  setOptions({
    tooltip: {
      trigger: "axis",
      formatter: (params: any) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map((p: any) => `${p.marker}${p.seriesName}: <b>${p.value} bar</b>`).join("<br/>")
    },
    legend: {
      data: selectedMeterObjects.value.map(m => m.label),
      bottom: 0, type: "scroll"
    },
    grid: { left: 56, right: 20, top: 16, bottom: 60 },
    xAxis: {
      type: "category",
      data: timeLabels.value,
      axisLabel: { rotate: timeLabels.value.length > 14 ? 35 : 0, fontSize: 11 }
    },
    yAxis: {
      type: "value", name: "bar", min: 0, max: 9,
      axisLabel: { formatter: (v: number) => v.toFixed(1) }
    },
    series: selectedMeters.value.map((id, idx) => ({
      name: meterOptions.find(m => m.value === id)?.label ?? id,
      type: "line",
      smooth: true,
      symbol: "none",
      data: seriesMap.value[id] ?? [],
      lineStyle: { width: 2, color: COLORS[idx % COLORS.length] },
      itemStyle: { color: COLORS[idx % COLORS.length] }
    }))
  });
}

// ── Pagination ────────────────────────────────────────────────────────────────
const currentPage = ref(1);
const pageSize   = ref(24);
const pagedRows  = computed(() =>
  pivotRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
);

// ── Actions ───────────────────────────────────────────────────────────────────
function handleSearch() {
  if (!selectedMeters.value.length) return;
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    buildData();
    renderChart();
    currentPage.value = 1;
  }, 500);
}

onMounted(async () => {
  await nextTick();
  buildData();
  renderChart();
});
watch(theme, () => renderChart());
</script>

<template>
  <div class="main p-4 space-y-4">

    <!-- ── Filter bar ── -->
    <div class="bg-bg_color rounded-lg p-4 flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Chọn đồng hồ (1 hoặc nhiều)</span>
        <el-select
          v-model="selectedMeters"
          multiple filterable collapse-tags collapse-tags-tooltip
          placeholder="Tìm và chọn đồng hồ..."
          style="width: 300px"
          :max-collapse-tags="2"
        >
          <el-option-group v-for="z in ['Vùng A','Vùng B','Vùng C','Vùng D']" :key="z" :label="z">
            <el-option
              v-for="m in meterOptions.filter(o => o.zone === z)"
              :key="m.value" :label="m.label" :value="m.value"
            />
          </el-option-group>
        </el-select>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Xem theo</span>
        <el-radio-group v-model="viewMode" @change="handleSearch">
          <el-radio-button value="hour">Theo giờ</el-radio-button>
          <el-radio-button value="day">Theo ngày</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="viewMode === 'hour'" class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Ngày</span>
        <el-date-picker
          v-model="selectedDate"
          type="date" placeholder="Chọn ngày"
          format="DD/MM/YYYY" value-format="YYYY-MM-DD"
          style="width: 150px"
        />
      </div>
      <div v-else class="flex flex-col gap-1">
        <span class="text-xs text-gray-500">Khoảng ngày</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange" range-separator="→"
          start-placeholder="Từ" end-placeholder="Đến"
          format="DD/MM/YYYY" value-format="YYYY-MM-DD"
          style="width: 220px"
        />
      </div>

      <el-button type="primary" :loading="loading" @click="handleSearch">Xem dữ liệu</el-button>
      <el-button type="success" class="ml-auto">
        <template #icon><i class="i-ri:download-line" /></template>
        Xuất Excel
      </el-button>
    </div>

    <el-alert
      v-if="!selectedMeters.length"
      title="Vui lòng chọn ít nhất 1 đồng hồ để xem dữ liệu áp lực"
      type="warning" :closable="false" show-icon
    />

    <!-- ── Stat cards — 1 per meter ── -->
    <div v-if="meterStats.length" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="s in meterStats" :key="s.id"
        class="bg-bg_color rounded-lg p-3 border-l-4"
        :style="{ borderColor: s.color }"
      >
        <div class="text-xs text-gray-500 truncate mb-2 font-medium">{{ s.label }}</div>
        <div class="grid grid-cols-3 gap-1 text-center">
          <div>
            <div class="text-base font-bold text-warning">{{ s.min }}</div>
            <div class="text-[10px] text-gray-400">Min (bar)</div>
          </div>
          <div>
            <div class="text-base font-bold text-danger">{{ s.max }}</div>
            <div class="text-[10px] text-gray-400">Max (bar)</div>
          </div>
          <div>
            <div class="text-base font-bold" :style="{ color: s.color }">{{ s.avg }}</div>
            <div class="text-[10px] text-gray-400">TB (bar)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Chart ── -->
    <div v-if="selectedMeters.length" class="bg-bg_color rounded-lg p-4">
      <div class="font-semibold text-sm mb-3">
        Biểu đồ áp lực
        <span class="text-gray-400 font-normal text-xs ml-2">
          {{ viewMode === 'hour' ? `Theo giờ – ${selectedDate}` : `Theo ngày – ${dateRange[0]} → ${dateRange[1]}` }}
        </span>
      </div>
      <div ref="chartRef" style="height: 300px" />
    </div>

    <!-- ── Pivot table: rows=time, cols=meter×{min,max,avg} ── -->
    <div v-if="selectedMeters.length" class="bg-bg_color rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="font-semibold text-sm">
          Bảng dữ liệu áp lực
          <el-tag type="info" size="small" class="ml-2">{{ pivotRows.length }} mốc thời gian</el-tag>
        </span>
      </div>

      <el-table :data="pagedRows" size="small" stripe border
        :header-cell-style="{ textAlign: 'center', fontSize: '12px' }"
        :cell-style="{ textAlign: 'center' }"
      >
        <!-- Cột thời gian -->
        <el-table-column
          prop="time" label="Thời gian" width="100"
          fixed="left" align="center"
          :header-cell-style="{ background: 'var(--el-fill-color-light)' }"
        />

        <!-- Cột nhóm cho từng đồng hồ -->
        <el-table-column
          v-for="(meter, idx) in selectedMeterObjects"
          :key="meter.value"
          :label="meter.label"
          align="center"
        >
          <template #header>
            <span :style="{ color: COLORS[idx % COLORS.length], fontWeight: 600 }">
              {{ meter.label }}
            </span>
          </template>

          <el-table-column :prop="`${meter.value}_min`" label="Min" width="72" align="center">
            <template #default="{ row }">
              <span class="text-warning text-xs font-medium">{{ row[`${meter.value}_min`] }}</span>
            </template>
          </el-table-column>

          <el-table-column :prop="`${meter.value}_max`" label="Max" width="72" align="center">
            <template #default="{ row }">
              <span class="text-danger text-xs font-medium">{{ row[`${meter.value}_max`] }}</span>
            </template>
          </el-table-column>

          <el-table-column :prop="`${meter.value}_avg`" label="TB" width="72" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold" :style="{ color: COLORS[idx % COLORS.length] }">
                {{ row[`${meter.value}_avg`] }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-3">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="pivotRows.length"
          :page-sizes="[24, 48, 96]"
          layout="total, sizes, prev, pager, next"
          small
        />
      </div>
    </div>

  </div>
</template>
