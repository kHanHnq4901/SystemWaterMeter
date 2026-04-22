<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";
import { getMeterTree, getLoggerProduction } from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "AnalysisProduction" });

const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));

// ══════════════════════════════════════════════════════════════════
// TREE
// ══════════════════════════════════════════════════════════════════
const treeRef     = ref();
const treeData    = ref<any[]>([]);
const treeKw      = ref("");
const treeLoading = ref(false);
const defExpand   = ref(["ALL"]);

const sel = reactive({
  type: "root" as "root" | "gateway" | "meter",
  gatewayNo: "", meterNo: "", label: "Tất cả thiết bị"
});

watch(treeKw, v => treeRef.value?.filter(v));
function filterNode(v: string, d: any) {
  return !v || d.label.toLowerCase().includes(v.toLowerCase());
}

async function loadTree() {
  treeLoading.value = true;
  try {
    const res = await getMeterTree();
    if (res.code === 0 && Array.isArray(res.data)) treeData.value = res.data as any[];
  } finally { treeLoading.value = false; }
}

function onNodeClick(data: any) {
  sel.type      = data.type;
  sel.gatewayNo = data.gatewayNo ?? "";
  sel.meterNo   = data.meterNo   ?? "";
  sel.label     = data.label;
  pag.currentPage = 1;
  load();
}

function clearSel() {
  Object.assign(sel, { type: "root", gatewayNo: "", meterNo: "", label: "Tất cả thiết bị" });
  pag.currentPage = 1;
  load();
}

// ══════════════════════════════════════════════════════════════════
// FILTER STATE
// ══════════════════════════════════════════════════════════════════
function defaultRange(): [string, string] {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 29);
  return [from.toISOString().slice(0, 10), today.toISOString().slice(0, 10)];
}

const dateRange = ref<[string, string]>(defaultRange());
const groupBy   = ref<"day" | "month">("day");

// ══════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════
const loading  = ref(false);
const rawData  = ref<any[]>([]);
const pag      = reactive({ currentPage: 1, pageSize: 20, total: 0 });

function r2(v: any)  { return Math.round((Number(v) || 0) * 100) / 100; }
function fn(n: number, dec = 0) {
  return dec > 0 ? n.toLocaleString("vi-VN", { minimumFractionDigits: dec, maximumFractionDigits: dec })
                 : Math.round(n).toLocaleString("vi-VN");
}

// KPIs computed from rawData
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
  { label: "Tổng sản lượng",      value: `${fn(kpi.value.totalConsump, 1)} m³`,   color: "#41b6ff", bg: "#e8f6ff", icon: "ri:drop-fill",           trend: "" },
  { label: "Tổng lưu lượng thuận",value: `${fn(kpi.value.totalFlow, 1)} m³`,      color: "#67c23a", bg: "#f0f9eb", icon: "ri:water-flash-line",     trend: "" },
  { label: "TB sản lượng/ngày",   value: `${fn(kpi.value.avgPerDay, 1)} m³`,      color: "#9b59b6", bg: "#f5f0ff", icon: "ri:bar-chart-2-line",     trend: "" },
  { label: "Lưu lượng ngược",     value: `${fn(kpi.value.totalReverse, 1)} m³`,   color: "#e85f33", bg: "#fff1ee", icon: "ri:arrow-go-back-line",   trend: "" },
]);

// Paginated table rows
const tableRows = computed(() => {
  const start = (pag.currentPage - 1) * pag.pageSize;
  return rawData.value.slice(start, start + pag.pageSize);
});

// Running cumulative
function buildCumulative(data: any[]) {
  let acc = 0;
  return data.map(d => { acc += r2(d.consumption || 0); return r2(acc); });
}

// ══════════════════════════════════════════════════════════════════
// CHARTS
// ══════════════════════════════════════════════════════════════════
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

    // ── Main: Bar (sản lượng) + Line (lưu lượng thuận)
    setMain({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: {
        data: ["Sản lượng (m³)", "Lưu lượng thuận (m³)", "Ngược chiều (m³)"],
        bottom: 0, itemWidth: 14, textStyle: { fontSize: 11 }
      },
      grid: { top: 16, left: 62, right: 12, bottom: 50 },
      xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: periods.length > 20 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [
        {
          name: "Sản lượng (m³)", type: "bar", data: consump, barMaxWidth: 20,
          itemStyle: { color: "#41b6ff", borderRadius: [3, 3, 0, 0] }
        },
        {
          name: "Lưu lượng thuận (m³)", type: "line", smooth: true, data: flows,
          itemStyle: { color: "#67c23a" }, symbol: "none", lineStyle: { width: 2 }
        },
        {
          name: "Ngược chiều (m³)", type: "bar", data: reverse, barMaxWidth: 8,
          itemStyle: { color: "#e85f33", borderRadius: [3, 3, 0, 0] }
        }
      ]
    });

    // ── Cumulative: Area (tích lũy sản lượng)
    setCumu({
      tooltip: { trigger: "axis" },
      grid: { top: 16, left: 62, right: 12, bottom: 28 },
      xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: periods.length > 20 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { type: "dashed" } } },
      series: [{
        name: "Sản lượng tích lũy (m³)", type: "line", smooth: true, data: cumul,
        itemStyle: { color: "#9b59b6" }, symbol: "none",
        areaStyle: {
          color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(155,89,182,0.4)" },
              { offset: 1, color: "rgba(155,89,182,0.02)" }
            ]
          }
        }
      }]
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// LOAD
// ══════════════════════════════════════════════════════════════════
async function load() {
  loading.value = true;
  try {
    const res = await getLoggerProduction({
      meterNo:   sel.meterNo   || undefined,
      gatewayNo: sel.gatewayNo || undefined,
      dateFrom:  dateRange.value[0] || undefined,
      dateTo:    dateRange.value[1] || undefined,
      groupBy:   groupBy.value
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

// Switch groupBy → reload
watch(groupBy, () => { pag.currentPage = 1; load(); });

onMounted(async () => { await loadTree(); load(); });
</script>

<template>
  <div class="page-wrap">

    <!-- ─── LEFT: Tree ───────────────────────────────────── -->
    <aside class="tree-panel">
      <el-card shadow="never" class="tree-card">
        <template #header>
          <div class="flex items-center gap-2">
            <IconifyIconOnline icon="ri:node-tree" color="#67c23a" width="16" />
            <span class="text-sm font-semibold">Chọn điểm đo</span>
          </div>
        </template>

        <el-input v-model="treeKw" placeholder="Tìm gateway / đồng hồ..." clearable size="small" class="mb-2">
          <template #prefix><IconifyIconOnline icon="ri:search-line" width="14" /></template>
        </el-input>

        <el-scrollbar class="tree-scroll">
          <div v-if="treeLoading" class="flex justify-center py-8">
            <el-icon class="is-loading text-green-400 text-2xl"><Loading /></el-icon>
          </div>
          <el-empty v-else-if="!treeData.length" :image-size="60" description="Chưa có dữ liệu" />
          <el-tree
            v-else
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'label', children: 'children' }"
            :default-expanded-keys="defExpand"
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
                  width="13" class="flex-shrink-0"
                />
                <span class="text-xs truncate" :title="data.label">{{ data.label }}</span>
                <el-tag v-if="data.type === 'gateway'" size="small" type="info"
                  class="ml-auto flex-shrink-0" style="font-size:10px;height:16px;line-height:16px">
                  {{ data.children?.length ?? 0 }}
                </el-tag>
              </div>
            </template>
          </el-tree>
        </el-scrollbar>
      </el-card>
    </aside>

    <!-- ─── RIGHT: Content ───────────────────────────────── -->
    <main class="content-panel">

      <!-- Breadcrumb -->
      <div class="breadcrumb-bar mb-3">
        <IconifyIconOnline icon="ri:map-pin-2-line" color="#9ca3af" width="14" class="mr-1" />
        <el-breadcrumb separator="›">
          <el-breadcrumb-item>Sản lượng</el-breadcrumb-item>
          <el-breadcrumb-item v-if="sel.gatewayNo">
            <IconifyIconOnline icon="ri:router-line" color="#e6a23c" width="12" class="mr-0.5" />{{ sel.gatewayNo }}
          </el-breadcrumb-item>
          <el-breadcrumb-item v-if="sel.meterNo">
            <IconifyIconOnline icon="ri:drop-line" color="#67c23a" width="12" class="mr-0.5" />{{ sel.meterNo }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- Filter bar -->
      <el-card shadow="never" class="filter-bar mb-3">
        <div class="flex flex-wrap items-center gap-3">

          <!-- GroupBy toggle -->
          <el-radio-group v-model="groupBy" size="default">
            <el-radio-button value="day">
              <IconifyIconOnline icon="ri:calendar-line" width="13" class="mr-1" />Theo ngày
            </el-radio-button>
            <el-radio-button value="month">
              <IconifyIconOnline icon="ri:calendar-2-line" width="13" class="mr-1" />Theo tháng
            </el-radio-button>
          </el-radio-group>

          <el-divider direction="vertical" />

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="→"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            value-format="YYYY-MM-DD"
            style="width: 270px"
          />

          <el-button type="primary" :loading="loading" @click="onSearch">
            <IconifyIconOnline icon="ri:search-line" width="14" class="mr-1" />Xem sản lượng
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="onReset">Đặt lại</el-button>

          <!-- Selected node tag -->
          <el-tag v-if="sel.type !== 'root'" type="success" size="default" class="ml-auto" closable @close="clearSel">
            <IconifyIconOnline :icon="sel.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'" width="13" class="mr-1" />
            {{ sel.label }}
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
            <b>Cao điểm:</b> {{ kpi.peakPeriod }} —
            <b class="text-blue-500">{{ fn(kpi.peakVal, 1) }} m³</b>
            &nbsp;|&nbsp;
            <b>Tổng {{ groupBy === 'day' ? 'ngày' : 'tháng' }} có dữ liệu:</b> {{ rawData.length }}
            &nbsp;|&nbsp;
            <b>Điểm đang xem:</b> {{ sel.type === 'root' ? 'Toàn hệ thống' : sel.label }}
          </span>
        </template>
      </el-alert>

      <!-- Charts -->
      <el-row :gutter="12" class="mb-3">
        <!-- Main: Bar + Line -->
        <el-col :xs="24" :md="15">
          <el-card shadow="never">
            <template #header>
              <span class="chart-title">Sản lượng {{ groupBy === 'day' ? 'theo ngày' : 'theo tháng' }}</span>
              <span class="chart-sub ml-2">Xanh: sản lượng · Lá: lưu lượng thuận · Cam: ngược chiều</span>
            </template>
            <div ref="mainRef" class="chart-h-lg" />
          </el-card>
        </el-col>

        <!-- Cumulative -->
        <el-col :xs="24" :md="9">
          <el-card shadow="never">
            <template #header>
              <span class="chart-title">Sản lượng tích lũy (m³)</span>
              <span class="chart-sub ml-2">Running total</span>
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
              Chi tiết sản lượng {{ groupBy === 'day' ? 'theo ngày' : 'theo tháng' }}
            </span>
            <el-tag type="info" size="small">{{ rawData.length }} kỳ</el-tag>
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
            return ['Tổng cộng', '', fn(d.reduce((s,x)=>s+x.readingCount,0)),
              fn(d.reduce((s,x)=>s+(x.totalFlow||0),0),1)+' m³',
              fn(d.reduce((s,x)=>s+(x.totalReverseFlow||0),0),1)+' m³',
              fn(d.reduce((s,x)=>s+(x.consumption||0),0),1)+' m³',
              '', ''];
          }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
        >
          <el-table-column type="index" label="STT" width="50" align="center" fixed />
          <el-table-column :label="groupBy === 'day' ? 'Ngày' : 'Tháng'" prop="period" width="110" fixed>
            <template #default="{ row }">
              <span class="font-medium text-blue-600">{{ row.period }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Số ĐH" prop="meterCount" width="80" align="center" />
          <el-table-column label="Số bản ghi" prop="readingCount" width="95" align="right" />
          <el-table-column label="Lưu lượng thuận (m³)" width="160" align="right">
            <template #default="{ row }">{{ fn(row.totalFlow || 0, 2) }}</template>
          </el-table-column>
          <el-table-column label="Ngược chiều (m³)" width="145" align="right">
            <template #default="{ row }">
              <span :class="(row.totalReverseFlow || 0) > 0 ? 'text-red-500' : ''">
                {{ fn(row.totalReverseFlow || 0, 2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Sản lượng tiêu thụ (m³)" width="175" align="right">
            <template #default="{ row }">
              <span class="font-semibold text-blue-600">{{ fn(row.consumption || 0, 2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Áp suất TB (bar)" width="135" align="right">
            <template #default="{ row }">{{ fn(row.avgPressure || 0, 2) }}</template>
          </el-table-column>
          <el-table-column label="Đánh giá" width="110" align="center">
            <template #default="{ row }">
              <el-tag
                :type="(row.consumption||0) === 0 ? 'danger' : (row.totalReverseFlow||0)/(row.totalFlow||1) > 0.1 ? 'warning' : 'success'"
                size="small"
              >
                {{ (row.consumption||0) === 0 ? 'Không có DL' : (row.totalReverseFlow||0)/(row.totalFlow||1) > 0.1 ? 'Ngược cao' : 'Bình thường' }}
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
  :deep(.el-card__body)   { padding: 10px; }
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
.content-panel { flex: 1; min-width: 0; overflow: hidden; }

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

/* ── KPI ── */
.kpi-card {
  :deep(.el-card__body) { padding: 12px 14px; }
}
.kpi-inner  { display: flex; align-items: center; justify-content: space-between; }
.kpi-label  { font-size: 0.7rem; color: var(--el-text-color-secondary); margin-bottom: 3px; }
.kpi-value  { font-size: 1.15rem; font-weight: 700; line-height: 1.2; }
.kpi-icon   { width: 40px; height: 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* ── Charts ── */
:deep(.el-card) { border-radius: 10px; }
:deep(.el-card__header) { padding: 8px 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.chart-title { font-size: 0.8rem; font-weight: 600; }
.chart-sub   { font-size: 0.7rem; color: var(--el-text-color-placeholder); }
.chart-h-lg  { width: 100%; height: 260px; }

/* Table summary row */
:deep(.el-table__footer td) {
  background: var(--el-fill-color) !important;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
