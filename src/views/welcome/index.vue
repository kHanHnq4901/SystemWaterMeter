<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import ReCol from "@/components/ReCol";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { ChartPie, ChartOnlineTrend } from "./components/charts";
import { getMeterStatus } from "@/api/waterMeter";
import { http } from "@/utils/http";
import ZoneTreeSelect from "@/components/ZoneTreeSelect/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { downloadChartAsImage } from "@/utils/chartExport";

defineOptions({ name: "Welcome" });
const router = useRouter();

const currentDate = ref(new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

// ── Stat cards ────────────────────────────────────────────────────
const statCards = ref([
  { label: "Tổng số Đồng hồ",  value: 0, color: "#41b6ff", bg: "#e8f6ff", icon: "ri:drop-line",       sub: "", suffix: "", link: "/device/meter"   },
  { label: "Tổng số Gateway",   value: 0, color: "#e6a23c", bg: "#fdf6ec", icon: "ri:router-line",      sub: "", suffix: "", link: "/device/gateway" },
  { label: "Sự kiện tháng này", value: 0, color: "#67c23a", bg: "#f0f9eb", icon: "ri:bar-chart-2-line", sub: "", suffix: "", link: "/analysis/data"  },
  { label: "Tỷ lệ thu thập TB", value: 0, color: "#9b59b6", bg: "#f5f0ff", icon: "ri:percent-line",     sub: "", suffix: "%", link: ""               }
]);

const meterStatusPie = ref<any[]>([]);
const gatewayPie     = ref<any[]>([]);
const meterTypePie   = ref<any[]>([]);
const trendDays      = ref<string[]>([]);
const trendRates     = ref<number[]>([]);
const statsLoading   = ref(true);
const lastUpdated    = ref("");

const pieChart1Ref  = ref<any>();
const pieChart2Ref  = ref<any>();
const pieChart3Ref  = ref<any>();
const trendChartRef = ref<any>();
const saveChart = (compRef: any, name: string) =>
  downloadChartAsImage(compRef?.$el ?? null, name);

const TYPE_LABELS: Record<string, string> = {
  "0": "Cơ học", "1": "Điện tử", "2": "IoT/AMR", "N/A": "Chưa xác định"
};
const STATE_MAP: Record<number, { text: string; type: "success"|"info"|"danger"|"warning" }> = {
  0: { text: "Chưa lắp",  type: "info"    },
  1: { text: "Hoạt động", type: "success" },
  2: { text: "Hỏng",      type: "danger"  },
  3: { text: "Tháo ra",   type: "warning" }
};

function diffSet<T>(r: { value: T }, next: T): boolean {
  if (JSON.stringify(r.value) === JSON.stringify(next)) return false;
  r.value = next;
  return true;
}

let _prevStatKey = "";

/** Áp dụng dữ liệu stats vào UI — dùng chung cho SSE push và HTTP fallback */
function applyStatsData(d: any) {
  const key = JSON.stringify({
    mt: d.meters?.total, ma: d.meters?.active, mb: d.meters?.broken,
    go: d.gateways?.online, gof: d.gateways?.offline,
    me: d.monthlyEvents, cr: d.collectionRate,
    on: d.meterOnline?.onlineCount, off: d.meterOnline?.offlineCount
  });
  if (key === _prevStatKey) return;
  _prevStatKey = key;

  const c = statCards.value;
  c[0].value = d.meters.total;
  c[0].sub   = `Hoạt động: ${d.meters.active} · Hỏng: ${d.meters.broken}`;
  c[1].value = d.gateways.total;
  c[1].sub   = `Online: ${d.gateways.online} · Offline: ${d.gateways.offline}`;
  c[2].value = d.monthlyEvents;
  c[2].sub   = `Bản ghi tháng ${new Date().getMonth() + 1}`;
  c[3].value = d.collectionRate;
  c[3].sub   = `Đồng hồ gửi dữ liệu trong 24h`;

  diffSet(meterStatusPie, [
    { name: "Online",  value: Number(d.meterOnline?.onlineCount  ?? 0), itemStyle: { color: "#67c23a" } },
    { name: "Offline", value: Number(d.meterOnline?.offlineCount ?? 0), itemStyle: { color: "#ef4444" } }
  ]);
  diffSet(gatewayPie, [
    { name: "Online",  value: Number(d.gateways.online  ?? 0), itemStyle: { color: "#67c23a" } },
    { name: "Offline", value: Number(d.gateways.offline ?? 0), itemStyle: { color: "#ef4444" } }
  ]);
  diffSet(meterTypePie, (d.meterTypeStats ?? []).map((x: any) => ({
    name: TYPE_LABELS[x.meterType] ?? x.meterType, value: x.count
  })));

  const trend = (d.onlineTrend ?? []) as { day: string; rate: number }[];
  diffSet(trendDays,  trend.map(t => t.day.slice(5)));
  diffSet(trendRates, trend.map(t => Number(t.rate ?? 0)));

  lastUpdated.value  = new Date().toLocaleTimeString("vi-VN");
  statsLoading.value = false;
}

// ── SSE — server push thay vì client polling ─────────────────────
// Server worker chạy mỗi 30s, push qua /api/dashboard/stream
const SSE_PUSH_INTERVAL = 30;
const sseStatus = ref<"connecting" | "live" | "offline">("connecting");
const countdown = ref(0);

let _sse:     EventSource | null = null;
let _sseRetry: ReturnType<typeof setTimeout>  | null = null;
let _cdTimer:  ReturnType<typeof setInterval> | null = null;

function startCountdown() {
  if (_cdTimer) clearInterval(_cdTimer);
  countdown.value = SSE_PUSH_INTERVAL;
  _cdTimer = setInterval(() => { if (countdown.value > 0) countdown.value--; }, 1000);
}

function connectSSE() {
  _sse?.close();
  sseStatus.value = "connecting";

  const source = new EventSource("/api/dashboard/stream");

  source.addEventListener("open", () => {
    sseStatus.value = "live";
    startCountdown();
    if (_sseRetry) { clearTimeout(_sseRetry); _sseRetry = null; }
  });

  source.onmessage = (e) => {
    try { applyStatsData(JSON.parse(e.data)); } catch {}
    countdown.value = SSE_PUSH_INTERVAL; // reset sau mỗi push
  };

  source.onerror = () => {
    source.close();
    sseStatus.value = "offline";
    // Tự reconnect sau 8s
    _sseRetry = setTimeout(connectSSE, 8_000);
  };

  _sse = source;
}

function disconnectSSE() {
  _sse?.close(); _sse = null;
  if (_sseRetry) { clearTimeout(_sseRetry);  _sseRetry = null; }
  if (_cdTimer)  { clearInterval(_cdTimer);  _cdTimer  = null; }
}

// Nút "Làm mới ngay" — gọi server recompute ngay, SSE sẽ tự push về
async function refreshNow() {
  try {
    const res: any = await http.request("post", "/api/dashboard/refresh");
    if (res?.code === 0) applyStatsData(res.data);
  } catch {}
  loadTable();
  countdown.value = SSE_PUSH_INTERVAL;
}

// ── Meter status table ────────────────────────────────────────────
const zone         = ref<any>({ regionId: null, type: "clear" });
const keyword      = ref("");
const onlineOnly   = ref<number | "">("");
const tableLoading = ref(false);
const tableList    = ref<any[]>([]);
const tablePag     = ref({ currentPage: 1, pageSize: 15, total: 0 });

let _tableTimer: ReturnType<typeof setInterval> | null = null;

function onZoneSelect(sel: TreeSelection) {
  Object.assign(zone.value, sel);
  tablePag.value.currentPage = 1;
  loadTable();
}

async function loadTable(silent = false) {
  if (silent && (drawerVisible.value || tablePag.value.currentPage > 1)) return;
  if (!silent) tableLoading.value = true;
  try {
    const res = await getMeterStatus({
      keyword:     keyword.value   || undefined,
      regionId:    zone.value.regionId ?? undefined,
      online:      onlineOnly.value !== "" ? Number(onlineOnly.value) : undefined,
      currentPage: tablePag.value.currentPage,
      pageSize:    tablePag.value.pageSize
    });
    if (res.code === 0 && res.data) {
      diffSet(tableList, res.data.list ?? []);
      tablePag.value.total = res.data.total ?? 0;
    }
  } finally { if (!silent) tableLoading.value = false; }
}

function filterByOnline(val: number | "") {
  onlineOnly.value = val;
  tablePag.value.currentPage = 1;
  loadTable();
  document.getElementById("meter-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Detail drawer ─────────────────────────────────────────────────
const drawerVisible = ref(false);
const drawerMeter   = ref<any>(null);

function openDrawer(row: any)  { drawerMeter.value = row; drawerVisible.value = true; }
function goToAnalysis() {
  if (!drawerMeter.value) return;
  router.push({ path: "/analysis/data", query: { meterNo: drawerMeter.value.meterNo } });
  drawerVisible.value = false;
}

function fv(d: any) { return d ? new Date(d).toLocaleString("vi-VN") : "—"; }
function fn(n: any) { return Math.round(Number(n) || 0).toLocaleString("vi-VN"); }

onMounted(() => {
  connectSSE();                  // SSE cho stats
  loadTable();                   // tải table lần đầu
  // Table refresh mỗi 30s (table không có SSE)
  _tableTimer = setInterval(() => loadTable(true), 30_000);
});

onUnmounted(() => {
  disconnectSSE();
  if (_tableTimer) clearInterval(_tableTimer);
});
</script>

<template>
  <div>
  <div class="p-4">

    <!-- ── Page header ── -->
    <div class="page-header mb-5">
      <div>
        <p class="page-subtitle">{{ currentDate }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Trạng thái kết nối SSE -->
        <el-tag v-if="sseStatus === 'live'" type="success" size="small" effect="dark" class="sse-badge">
          <span class="sse-dot" />
          Live
        </el-tag>
        <el-tag v-else-if="sseStatus === 'connecting'" type="warning" size="small" class="sse-badge">
          <span class="i-ri:loader-4-line animate-spin" style="font-size:11px;margin-right:3px" />
          Đang kết nối...
        </el-tag>
        <el-tag v-else type="danger" size="small" class="sse-badge">
          <span class="i-ri:wifi-off-line" style="font-size:11px;margin-right:3px" />
          Mất kết nối
        </el-tag>

        <el-divider direction="vertical" />

        <!-- Lần cập nhật cuối -->
        <span v-if="lastUpdated" class="text-xs flex items-center gap-1" style="color:#67c23a">
          <span class="i-ri:checkbox-circle-line" style="font-size:12px" />
          {{ lastUpdated }}
        </span>

        <!-- Đếm ngược đến push tiếp theo -->
        <el-tag v-if="sseStatus === 'live' && countdown > 0" type="info" size="small"
          style="min-width:46px;text-align:center;font-variant-numeric:tabular-nums">
          {{ countdown }}s
        </el-tag>

        <el-button size="small" :icon="'ri:refresh-line'" circle @click="refreshNow" title="Làm mới ngay" />
      </div>
    </div>

    <!-- ── Stat Cards (clickable) ── -->
    <el-row :gutter="16" class="mb-5">
      <re-col
        v-for="(card, i) in statCards" :key="i"
        v-motion :value="6" :md="12" :sm="12" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 40 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * (i + 1) } }"
      >
        <!-- Skeleton khi chưa load xong -->
        <el-card v-if="statsLoading" shadow="never" class="stat-card h-full" :style="{ '--card-accent': card.color }">
          <div class="flex items-center justify-between gap-3">
            <el-skeleton-item variant="circle" style="width:52px;height:52px;border-radius:12px;flex-shrink:0" />
            <div class="flex-1 text-right">
              <el-skeleton-item variant="text" style="width:60%;height:12px;margin-bottom:8px" />
              <el-skeleton-item variant="text" style="width:45%;height:28px;margin-bottom:6px" />
              <el-skeleton-item variant="text" style="width:80%;height:11px" />
            </div>
          </div>
        </el-card>

        <el-card
          v-else
          shadow="hover"
          class="stat-card h-full"
          :class="{ 'is-link': card.link }"
          :style="{ '--card-accent': card.color }"
          @click="card.link && router.push(card.link)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="stat-icon-wrap flex-shrink-0" :style="{ background: card.bg }">
              <IconifyIconOnline :icon="card.icon" :color="card.color" width="26" height="26" />
            </div>
            <div class="flex-1 min-w-0 text-right">
              <p class="stat-label">
                {{ card.label }}
                <span v-if="card.link" class="i-ri:external-link-line" style="font-size:11px;opacity:.5;margin-left:2px" />
              </p>
              <div class="stat-value-row">
                <ReNormalCountTo :startVal="0" :endVal="card.value" :duration="900" :fontSize="'1.9em'" />
                <span v-if="card.suffix" class="stat-suffix" :style="{ color: card.color }">{{ card.suffix }}</span>
              </div>
              <p class="stat-sub truncate">{{ card.sub }}</p>
            </div>
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ── Row 2: 3 biểu đồ tròn ── -->
    <el-row :gutter="16" class="mb-4" style="align-items:stretch">

      <!-- Pie: Đồng hồ kết nối -->
      <re-col v-motion :value="8" :md="12" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 40 }" :enter="{ opacity: 1, y: 0, transition: { delay: 320 } }">
        <el-card shadow="never" class="chart-card h-full" style="--card-accent:#67c23a;min-height:280px">
          <div class="chart-header">
            <span class="chart-dot" style="background:#67c23a" />
            Kết nối đồng hồ
            <div class="ml-auto flex items-center gap-1">
              <el-button link size="small" class="filter-btn online" @click="filterByOnline(1)">↓ Online</el-button>
              <el-button link size="small" class="filter-btn offline" @click="filterByOnline(0)">↓ Offline</el-button>
              <el-tooltip content="Lưu ảnh" placement="top">
                <el-button circle size="small" :icon="useRenderIcon('ri:image-download-line')"
                  @click="saveChart(pieChart1Ref, 'Kết nối đồng hồ')" />
              </el-tooltip>
            </div>
          </div>
          <ChartPie ref="pieChart1Ref" :data="meterStatusPie" name="Đồng hồ" />
        </el-card>
      </re-col>

      <!-- Pie: Gateway kết nối -->
      <re-col v-motion :value="8" :md="12" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 40 }" :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }">
        <el-card shadow="never" class="chart-card h-full" style="--card-accent:#e6a23c;min-height:280px">
          <div class="chart-header">
            <span class="chart-dot" style="background:#e6a23c" />
            Kết nối Gateway
            <div class="ml-auto flex items-center gap-1">
              <el-button link size="small" class="filter-btn" @click="router.push('/device/gateway')">Quản lý →</el-button>
              <el-tooltip content="Lưu ảnh" placement="top">
                <el-button circle size="small" :icon="useRenderIcon('ri:image-download-line')"
                  @click="saveChart(pieChart2Ref, 'Kết nối Gateway')" />
              </el-tooltip>
            </div>
          </div>
          <ChartPie ref="pieChart2Ref" :data="gatewayPie" name="Gateway" />
        </el-card>
      </re-col>

      <!-- Pie: Phân loại đồng hồ -->
      <re-col v-motion :value="8" :md="24" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 40 }" :enter="{ opacity: 1, y: 0, transition: { delay: 480 } }">
        <el-card shadow="never" class="chart-card h-full" style="--card-accent:#9b59b6;min-height:280px">
          <div class="chart-header">
            <span class="chart-dot" style="background:#9b59b6" />
            Phân loại đồng hồ
            <div class="ml-auto flex items-center gap-1">
              <el-button link size="small" class="filter-btn" @click="router.push('/device/meter')">Quản lý →</el-button>
              <el-tooltip content="Lưu ảnh" placement="top">
                <el-button circle size="small" :icon="useRenderIcon('ri:image-download-line')"
                  @click="saveChart(pieChart3Ref, 'Phân loại đồng hồ')" />
              </el-tooltip>
            </div>
          </div>
          <ChartPie ref="pieChart3Ref" :data="meterTypePie" name="Loại ĐH" />
        </el-card>
      </re-col>
    </el-row>

    <!-- ── Row 3: Trend 30 ngày (full width) ── -->
    <el-row :gutter="16" class="mb-4">
      <re-col v-motion :value="24" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 40 }" :enter="{ opacity: 1, y: 0, transition: { delay: 540 } }">
        <el-card shadow="never" class="chart-card" style="--card-accent:#41b6ff;min-height:300px">
          <div class="chart-header">
            <span class="chart-dot" style="background:#41b6ff" />
            Tỷ lệ Online — 30 ngày gần nhất
            <div class="ml-auto flex items-center gap-2">
              <span class="trend-legend">
                <span class="legend-dot" style="background:#67c23a" />≥80%
                <span class="legend-dot" style="background:#e6a23c;margin-left:10px" />≥50%
                <span class="legend-dot" style="background:#ef4444;margin-left:10px" />&lt;50%
              </span>
              <el-tooltip content="Lưu ảnh" placement="top">
                <el-button circle size="small" :icon="useRenderIcon('ri:image-download-line')"
                  @click="saveChart(trendChartRef, 'Tỷ lệ Online 30 ngày')" />
              </el-tooltip>
            </div>
          </div>
          <div style="height:260px">
            <ChartOnlineTrend ref="trendChartRef" :days="trendDays" :rates="trendRates" />
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ── Meter status table ── -->
    <el-card shadow="never" id="meter-table" v-motion
      :initial="{ opacity: 0, y: 50 }" :enter="{ opacity: 1, y: 0, transition: { delay: 640 } }">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold flex items-center gap-1">
            <span class="i-ri:drop-line" style="color:#41b6ff" />
            Trạng thái đồng hồ
          </span>
          <el-tag type="info" size="small">{{ fn(tablePag.total) }} thiết bị</el-tag>
        </div>
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <ZoneTreeSelect
            placeholder="Tất cả vùng..."
            width="240px"
            popper-width="380px"
            @select="onZoneSelect"
          />
          <el-input v-model="keyword" placeholder="Mã / tên đồng hồ..." clearable style="width:200px" size="small"
            @keyup.enter="() => { tablePag.currentPage = 1; loadTable(); }">
            <template #prefix><span class="i-ri:search-line" style="font-size:12px" /></template>
          </el-input>
          <el-select v-model="onlineOnly" placeholder="Tất cả" style="width:130px" size="small" clearable
            @change="() => { tablePag.currentPage = 1; loadTable(); }">
            <el-option label="🟢 Online"  :value="1" />
            <el-option label="🔴 Offline" :value="0" />
          </el-select>
        </div>
      </template>

      <el-table
        v-loading="tableLoading"
        :data="tableList"
        size="small"
        border
        row-class-name="cursor-pointer"
        :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
        :row-style="(row) => row.row.online === 0 ? { background: 'var(--el-color-danger-light-9)' } : {}"
        @row-click="openDrawer"
      >
        <el-table-column type="index" label="STT" width="50" align="center" fixed />
        <el-table-column label="TT" width="78" align="center" fixed>
          <template #default="{ row }">
            <el-tag :type="row.online === 1 ? 'success' : 'danger'" size="small" effect="dark">
              {{ row.online === 1 ? 'Online' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Mã ĐH"  prop="meterNo"    width="125" fixed show-overflow-tooltip />
        <el-table-column label="Tên ĐH" prop="meterName"  min-width="140" show-overflow-tooltip />
        <el-table-column label="Vùng"   prop="regionName" width="130" show-overflow-tooltip />
        <el-table-column label="Lần cuối gửi" width="148">
          <template #default="{ row }">
            <span :class="row.online === 0 ? 'text-red-500 text-xs' : 'text-green-600 text-xs'">
              {{ fv(row.lastDataTime) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Lưu lượng" width="105" align="right">
          <template #default="{ row }">
            {{ row.lastFlow != null ? Number(row.lastFlow).toFixed(2) : '—' }}
            <span class="text-gray-400 text-xs"> m³</span>
          </template>
        </el-table-column>
        <el-table-column label="Tín hiệu" width="88" align="center">
          <template #default="{ row }">
            <span v-if="row.signal != null"
              :class="row.signal >= 60 ? 'text-green-600 font-medium' : row.signal >= 30 ? 'text-yellow-500 font-medium' : 'text-red-500 font-medium'">
              {{ row.signal }}%
            </span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Pin" width="75" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.remainBattery != null"
              :type="row.remainBattery >= 50 ? 'success' : row.remainBattery >= 20 ? 'warning' : 'danger'"
              size="small">
              {{ row.remainBattery }}%
            </el-tag>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Gateway" prop="gatewayNo" width="115" show-overflow-tooltip />
        <el-table-column label="" width="56" align="center" fixed="right">
          <template #default="{ row }">
            <el-button circle size="small" type="primary" plain
              :icon="'ri:eye-line'" @click.stop="openDrawer(row)"
              title="Xem chi tiết" />
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-3">
        <el-pagination
          v-model:current-page="tablePag.currentPage"
          v-model:page-size="tablePag.pageSize"
          :total="tablePag.total"
          :page-sizes="[15, 30, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="(v) => { tablePag.pageSize = v; loadTable(); }"
          @current-change="(v) => { tablePag.currentPage = v; loadTable(); }"
        />
      </div>
    </el-card>

  </div>

  <!-- ── Detail Drawer ── -->
  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    size="420px"
    :with-header="false"
    class="meter-drawer"
  >
    <template v-if="drawerMeter">
      <!-- Header -->
      <div class="drawer-head" :class="drawerMeter.online === 1 ? 'online' : 'offline'">
        <div class="flex items-center gap-2 mb-1">
          <span class="i-ri:drop-fill text-white" style="font-size:18px" />
          <span class="text-white font-bold text-base truncate">{{ drawerMeter.meterName || drawerMeter.meterNo }}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <el-tag size="small" effect="dark" :type="drawerMeter.online === 1 ? 'success' : 'danger'">
            {{ drawerMeter.online === 1 ? '🟢 Online' : '🔴 Offline' }}
          </el-tag>
          <el-tag size="small" effect="plain"
            :type="STATE_MAP[drawerMeter.state]?.type ?? 'info'">
            {{ STATE_MAP[drawerMeter.state]?.text ?? '—' }}
          </el-tag>
          <span class="text-white/70 text-xs ml-auto">{{ drawerMeter.meterNo }}</span>
        </div>
      </div>

      <div class="drawer-body">
        <!-- Info grid -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label"><span class="i-ri:map-pin-line mr-1"/>Vùng</span>
            <span class="info-value">{{ drawerMeter.regionName || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label"><span class="i-ri:map-2-line mr-1"/>Địa chỉ</span>
            <span class="info-value">{{ drawerMeter.address || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label"><span class="i-ri:router-line mr-1"/>Gateway</span>
            <span class="info-value font-mono text-sm">{{ drawerMeter.gatewayNo || '—' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label"><span class="i-ri:time-line mr-1"/>Lần cuối gửi</span>
            <span class="info-value text-sm" :class="drawerMeter.online === 0 ? 'text-red-500' : 'text-green-600'">
              {{ fv(drawerMeter.lastDataTime) }}
            </span>
          </div>
        </div>

        <!-- Metric cards -->
        <p class="section-title">Thông số đo đạc</p>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-icon" style="color:#41b6ff;background:#e8f6ff">
              <span class="i-ri:drop-line" />
            </div>
            <div>
              <p class="metric-label">Lưu lượng</p>
              <p class="metric-value">
                {{ drawerMeter.lastFlow != null ? Number(drawerMeter.lastFlow).toFixed(2) : '—' }}
                <span class="metric-unit">m³</span>
              </p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="color:#9b59b6;background:#f5f0ff">
              <span class="i-ri:database-2-line" />
            </div>
            <div>
              <p class="metric-label">Tổng tích lũy</p>
              <p class="metric-value">
                {{ drawerMeter.lastActiveTotal != null ? Number(drawerMeter.lastActiveTotal).toFixed(2) : '—' }}
                <span class="metric-unit">m³</span>
              </p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="color:#e6a23c;background:#fdf6ec">
              <span class="i-ri:compress-width-line" />
            </div>
            <div>
              <p class="metric-label">Áp suất</p>
              <p class="metric-value">
                {{ drawerMeter.lastPressure != null ? Number(drawerMeter.lastPressure).toFixed(2) : '—' }}
                <span class="metric-unit">bar</span>
              </p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="color:#e74c3c;background:#fdf0f0">
              <span class="i-ri:temp-hot-line" />
            </div>
            <div>
              <p class="metric-label">Nhiệt độ</p>
              <p class="metric-value">
                {{ drawerMeter.temperature != null ? Number(drawerMeter.temperature).toFixed(1) : '—' }}
                <span class="metric-unit">°C</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Signal & Battery -->
        <p class="section-title">Trạng thái thiết bị</p>
        <div class="device-stats">
          <div class="device-stat-item">
            <div class="flex justify-between mb-1">
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <span class="i-ri:signal-tower-line" /> Tín hiệu
              </span>
              <span class="text-xs font-semibold"
                :class="(drawerMeter.signal ?? 0) >= 60 ? 'text-green-600' : (drawerMeter.signal ?? 0) >= 30 ? 'text-yellow-500' : 'text-red-500'">
                {{ drawerMeter.signal ?? '—' }}%
              </span>
            </div>
            <el-progress
              v-if="drawerMeter.signal != null"
              :percentage="drawerMeter.signal"
              :color="drawerMeter.signal >= 60 ? '#67c23a' : drawerMeter.signal >= 30 ? '#e6a23c' : '#ef4444'"
              :show-text="false" :stroke-width="6" />
          </div>
          <div class="device-stat-item">
            <div class="flex justify-between mb-1">
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <span class="i-ri:battery-2-charge-line" /> Pin
              </span>
              <span class="text-xs font-semibold"
                :class="(drawerMeter.remainBattery ?? 0) >= 50 ? 'text-green-600' : (drawerMeter.remainBattery ?? 0) >= 20 ? 'text-yellow-500' : 'text-red-500'">
                {{ drawerMeter.remainBattery ?? '—' }}%
              </span>
            </div>
            <el-progress
              v-if="drawerMeter.remainBattery != null"
              :percentage="drawerMeter.remainBattery"
              :color="drawerMeter.remainBattery >= 50 ? '#67c23a' : drawerMeter.remainBattery >= 20 ? '#e6a23c' : '#ef4444'"
              :show-text="false" :stroke-width="6" />
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="drawer-footer">
        <el-button style="flex:1" @click="drawerVisible = false">Đóng</el-button>
        <el-button type="primary" style="flex:2" @click="goToAnalysis">
          <span class="i-ri:line-chart-line mr-1" />
          Xem dữ liệu đồng hồ
        </el-button>
      </div>
    </template>
  </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
// ── Base card reset ────────────────────────────────────────────────
:deep(.el-card) {
  --el-card-border-color: var(--el-border-color-extra-light);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

// ── SSE badge ─────────────────────────────────────────────────────
.sse-badge { display: inline-flex; align-items: center; gap: 4px; }
.sse-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .5; transform: scale(.75); }
}

// ── Page header ────────────────────────────────────────────────────
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}
.page-subtitle { font-size: 13px; color: var(--el-text-color-secondary); margin: 0; }

// ── Stat cards ─────────────────────────────────────────────────────
.stat-card {
  transition: box-shadow 0.2s, transform 0.18s;

  // colored top stripe
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--card-accent, #41b6ff);
  }

  :deep(.el-card__body) { padding: 18px 20px; }

  &.is-link {
    cursor: pointer;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 28px rgba(0,0,0,.10) !important;
    }
  }
}
.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}
.stat-value-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 3px;
  line-height: 1;
}
.stat-suffix { font-size: 15px; font-weight: 700; }
.stat-sub    { font-size: 11px; color: var(--el-text-color-placeholder); margin: 5px 0 0; }

// ── Chart cards ────────────────────────────────────────────────────
.chart-card {
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: var(--card-accent, #41b6ff);
  }
  :deep(.el-card__body) { overflow: hidden; padding-bottom: 8px; }
}
.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}
.chart-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.filter-btn {
  font-size: 11px !important;
  padding: 0 6px !important;
  height: 22px !important;
  &.online  { color: #67c23a !important; }
  &.offline { color: #ef4444 !important; }
}
.trend-legend {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  gap: 3px;
}
.legend-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

// ── Table ──────────────────────────────────────────────────────────
:deep(.cursor-pointer) { cursor: pointer; }

// ── Drawer ─────────────────────────────────────────────────────────
.meter-drawer :deep(.el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.drawer-head {
  padding: 20px 20px 16px;
  &.online  { background: linear-gradient(135deg, #4caf50, #67c23a); }
  &.offline { background: linear-gradient(135deg, #e53935, #ef4444); }
}
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px; }

.info-section {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 6px 0;
  margin-bottom: 16px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 7px 14px;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  &:last-child { border-bottom: none; }
}
.info-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  width: 110px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.info-value { font-size: 13px; color: var(--el-text-color-primary); font-weight: 500; word-break: break-all; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.metric-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}
.metric-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.metric-label { font-size: 11px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
.metric-value { font-size: 16px; font-weight: 700; color: var(--el-text-color-primary); line-height: 1.2; }
.metric-unit  { font-size: 11px; font-weight: 400; color: var(--el-text-color-secondary); }

.device-stats { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.device-stat-item { background: var(--el-fill-color-lighter); border-radius: 8px; padding: 10px 12px; }

.drawer-footer {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--el-border-color-extra-light);
  background: var(--el-bg-color);
}
</style>
