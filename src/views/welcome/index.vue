<script setup lang="ts">
import { ref, reactive, onMounted, h } from "vue";
import { ElTag } from "element-plus";
import ReCol from "@/components/ReCol";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { ChartBar, ChartPie } from "./components/charts";
import { http } from "@/utils/http";

defineOptions({ name: "Welcome" });

type DashboardStats = {
  meters:         { total: number; active: number; notInstalled: number; broken: number; removed: number };
  gateways:       { total: number; online: number; offline: number };
  todayReadings:  number;
  meterTypeStats: { meterType: string; count: number }[];
  weeklyTrend:    { date: string; readingCount: number; uniqueMeters: number; avgSignal: number }[];
  offlineMeters:  { meterNo: string; meterName: string; address: string; customerCode: string; lastSeen: string }[];
  groupStats:     { groupName: string; total: number; active: number }[];
};

const loading = ref(false);
const stats = ref<DashboardStats | null>(null);

// Computed chart data
const pieData = ref<{ name: string; value: number }[]>([]);
const barRequireData = ref<number[]>([]);
const barQuestionData = ref<number[]>([]);
const barDates = ref<string[]>([]);

const statCards = ref([
  { label: "Tổng đồng hồ",     value: 0, color: "#41b6ff", bg: "#e8f6ff", icon: "ri:drop-line",         sub: "" },
  { label: "Đang hoạt động",   value: 0, color: "#67c23a", bg: "#f0f9eb", icon: "ri:checkbox-circle-line", sub: "" },
  { label: "Gateway Online",   value: 0, color: "#e6a23c", bg: "#fdf6ec", icon: "ri:router-line",          sub: "" },
  { label: "Đọc chỉ số hôm nay", value: 0, color: "#9b59b6", bg: "#f5f0ff", icon: "ri:bar-chart-2-line",  sub: "" }
]);

async function loadStats() {
  loading.value = true;
  try {
    const res: any = await http.request("get", "/api/dashboard/stats");
    if (res?.code !== 0) return;
    const d: DashboardStats = res.data;
    stats.value = d;

    // Stat cards
    statCards.value[0].value = d.meters.total;
    statCards.value[0].sub   = `Hỏng: ${d.meters.broken} • Tháo: ${d.meters.removed}`;
    statCards.value[1].value = d.meters.active;
    statCards.value[1].sub   = `Chưa lắp: ${d.meters.notInstalled}`;
    statCards.value[2].value = d.gateways.online;
    statCards.value[2].sub   = `Offline: ${d.gateways.offline} / Tổng: ${d.gateways.total}`;
    statCards.value[3].value = d.todayReadings;
    statCards.value[3].sub   = `Đồng hồ duy nhất hôm nay`;

    // Pie chart — trạng thái đồng hồ
    pieData.value = [
      { name: "Đang dùng", value: d.meters.active },
      { name: "Chưa lắp",  value: d.meters.notInstalled },
      { name: "Hỏng",      value: d.meters.broken },
      { name: "Tháo ra",   value: d.meters.removed }
    ].filter(x => x.value > 0);

    // Bar chart — 7 ngày
    barDates.value      = d.weeklyTrend.map(x => x.date.slice(5)); // MM-DD
    barRequireData.value = d.weeklyTrend.map(x => x.readingCount);
    barQuestionData.value = d.weeklyTrend.map(x => x.uniqueMeters);

  } finally {
    loading.value = false;
  }
}

const offlineColumns = [
  { label: "Mã ĐH",   prop: "meterNo",      width: 120 },
  { label: "Tên",     prop: "meterName",    minWidth: 140 },
  { label: "Mã KH",   prop: "customerCode", width: 110 },
  { label: "Địa chỉ", prop: "address",      minWidth: 160, showOverflowTooltip: true },
  {
    label: "Lần cuối",
    prop: "lastSeen",
    width: 165,
    formatter: ({ lastSeen }: any) =>
      lastSeen ? new Date(lastSeen).toLocaleString("vi-VN") : "Chưa có dữ liệu"
  }
];

onMounted(() => loadStats());
</script>

<template>
  <div class="p-4">
    <!-- ─── 4 Stat Cards ──────────────────────────── -->
    <el-row :gutter="16" class="mb-4">
      <re-col
        v-for="(card, i) in statCards"
        :key="i"
        v-motion
        :value="6" :md="12" :sm="12" :xs="24"
        class="mb-4"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * (i + 1) } }"
      >
        <el-card shadow="never" class="h-full">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 mb-1">{{ card.label }}</p>
              <ReNormalCountTo
                :startVal="0"
                :endVal="card.value"
                :duration="1200"
                :fontSize="'1.8em'"
              />
              <p class="text-xs text-gray-400 mt-1">{{ card.sub }}</p>
            </div>
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center"
              :style="{ background: card.bg }"
            >
              <IconifyIconOnline
                :icon="card.icon"
                :color="card.color"
                width="28"
                height="28"
              />
            </div>
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ─── Charts Row ────────────────────────────── -->
    <el-row :gutter="16" class="mb-4">
      <!-- Pie: Trạng thái đồng hồ -->
      <re-col
        v-motion :value="8" :md="24" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
      >
        <el-card shadow="never" style="height: 340px">
          <div class="text-sm font-semibold mb-2">Trạng thái đồng hồ</div>
          <ChartPie :data="pieData" name="Đồng hồ" />
        </el-card>
      </re-col>

      <!-- Bar: Xu hướng 7 ngày -->
      <re-col
        v-motion :value="16" :md="24" :xs="24" class="mb-4 bar-card"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 480 } }"
      >
        <el-card shadow="never" style="height: 340px">
          <div class="text-sm font-semibold mb-2">
            Bản ghi nhận 7 ngày gần nhất
            <span class="text-xs text-gray-400 ml-2 font-normal">Xanh: tổng bản ghi · Đỏ: đồng hồ duy nhất</span>
          </div>
          <ChartBar :requireData="barRequireData" :questionData="barQuestionData" :dates="barDates" />
        </el-card>
      </re-col>
    </el-row>

    <!-- ─── Bottom Row ────────────────────────────── -->
    <el-row :gutter="16">
      <!-- Đồng hồ ngoại tuyến -->
      <re-col
        v-motion :value="16" :md="24" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 560 } }"
      >
        <el-card shadow="never">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold">Đồng hồ đang hoạt động nhưng mất kết nối &gt; 24h</span>
            <el-tag type="danger" size="small">{{ stats?.offlineMeters?.length ?? 0 }} đồng hồ</el-tag>
          </div>
          <el-table
            :data="stats?.offlineMeters ?? []"
            size="small"
            :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
            empty-text="Tất cả đồng hồ đều đang gửi dữ liệu"
          >
            <el-table-column type="index" width="50" />
            <el-table-column label="Mã ĐH"   prop="meterNo"      width="120" />
            <el-table-column label="Tên"     prop="meterName"    min-width="140" />
            <el-table-column label="Mã KH"   prop="customerCode" width="110" />
            <el-table-column label="Địa chỉ" prop="address"      min-width="160" show-overflow-tooltip />
            <el-table-column label="Lần cuối nhận" min-width="160">
              <template #default="{ row }">
                <el-tag type="danger" size="small" v-if="!row.lastSeen">Chưa có dữ liệu</el-tag>
                <span v-else class="text-orange-500 text-xs">
                  {{ new Date(row.lastSeen).toLocaleString("vi-VN") }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </re-col>

      <!-- Thống kê theo nhóm -->
      <re-col
        v-motion :value="8" :md="24" :xs="24" class="mb-4"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 640 } }"
      >
        <el-card shadow="never">
          <div class="text-sm font-semibold mb-3">Đồng hồ theo nhóm</div>
          <div
            v-for="(g, i) in (stats?.groupStats ?? [])"
            :key="i"
            class="mb-3"
          >
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span class="truncate max-w-[120px]">{{ g.groupName }}</span>
              <span class="font-medium">{{ g.active }} / {{ g.total }}</span>
            </div>
            <el-progress
              :percentage="g.total > 0 ? Math.round((g.active / g.total) * 100) : 0"
              :stroke-width="10"
              :color="g.active / g.total > 0.8 ? '#67c23a' : g.active / g.total > 0.5 ? '#e6a23c' : '#f56c6c'"
            />
          </div>
          <el-empty v-if="!stats?.groupStats?.length" description="Chưa có dữ liệu" :image-size="60" />
        </el-card>
      </re-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-card) {
  --el-card-border-color: none;
  border-radius: 10px;
}
:deep(.el-progress-bar__outer) {
  border-radius: 10px;
}
</style>
