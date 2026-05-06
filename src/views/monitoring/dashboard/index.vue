<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import { getWaterDashboard, getWaterAlerts } from "@/api/dashboard";
import { getZoneStats, getLoggerHourly } from "@/api/waterMeter";
import dayjs from "dayjs";

defineOptions({ name: "MonitoringDashboard" });

const currentTime = ref(new Date().toLocaleString("vi-VN"));
setInterval(() => { currentTime.value = new Date().toLocaleString("vi-VN"); }, 1000);

const loading = ref(false);

const meterStats = reactive({ total: 0, active: 0, notInstalled: 0, broken: 0, removed: 0 });
const gatewayStats = reactive({ total: 0, online: 0, offline: 0 });
const alerts = ref<any[]>([]);
const meterStatus = ref<{ name: string; value: number; color: string }[]>([]);
const hourlyData = ref<{ hour: string; consumption: number }[]>([]);
const zones = ref<any[]>([]);
const todayConsumption = ref(0);

async function fetchData() {
  loading.value = true;
  try {
    const [dashRes, alertRes, zoneRes, hourlyRes] = await Promise.allSettled([
      getWaterDashboard(),
      getWaterAlerts({ page: 1, pageSize: 20 }),
      getZoneStats(),
      getLoggerHourly({ date: dayjs().format("YYYY-MM-DD") })
    ]);

    // Dashboard stats
    if (dashRes.status === "fulfilled") {
      const d = (dashRes.value as any);
      if (d?.code === 0 && d?.data) {
        const m = d.data.meters ?? {};
        const g = d.data.gateways ?? {};
        meterStats.total       = m.total       ?? 0;
        meterStats.active      = m.active      ?? 0;
        meterStats.notInstalled = m.notInstalled ?? 0;
        meterStats.broken      = m.broken      ?? 0;
        meterStats.removed     = m.removed     ?? 0;
        gatewayStats.total   = g.total   ?? 0;
        gatewayStats.online  = g.online  ?? 0;
        gatewayStats.offline = g.offline ?? 0;
        meterStatus.value = [
          { name: "Đang dùng", value: m.active      ?? 0, color: "#10b981" },
          { name: "Hỏng",      value: m.broken      ?? 0, color: "#ef4444" },
          { name: "Tháo ra",   value: m.removed     ?? 0, color: "#f59e0b" },
          { name: "Chưa lắp",  value: m.notInstalled ?? 0, color: "#6b7280" }
        ].filter(s => s.value > 0);
      }
    }

    // Alerts
    if (alertRes.status === "fulfilled") {
      const body = (alertRes.value as any)?.data ?? alertRes.value;
      if (body?.success) {
        alerts.value = (body.data?.list ?? []).slice(0, 10).map((a: any) => ({
          id:      a.id,
          time:    a.time ? dayjs(a.time).format("HH:mm:ss") : "—",
          type:    a.alertType === 1 ? "danger" : a.alertType === 2 ? "warning" : "info",
          meter:   a.relatedId ?? "—",
          message: a.message ?? "—"
        }));
      }
    }

    // Zone stats
    if (zoneRes.status === "fulfilled") {
      const d = (zoneRes.value as any);
      if (d?.code === 0 && d?.data?.length) {
        zones.value = (d.data as any[]).map((z: any) => ({
          name:        z.regionName,
          meters:      z.totalMeters,
          online:      z.activeMeters,
          consumption: +(z.todayFlow ?? 0).toFixed(0)
        }));
      }
    }

    // Hourly chart
    if (hourlyRes.status === "fulfilled") {
      const d = (hourlyRes.value as any);
      if (d?.code === 0 && d?.data?.length) {
        hourlyData.value = d.data;
        todayConsumption.value = +(d.data as any[])
          .reduce((s: number, r: any) => s + r.consumption, 0).toFixed(0);
      }
    }
  } finally {
    loading.value = false;
  }
}

const maxHourly = computed(() =>
  Math.max(...hourlyData.value.map(h => h.consumption), 1)
);

const getTypeColor = (type: string) => type === "danger" ? "danger" : type === "warning" ? "warning" : "info";
const getTypeLabel = (type: string) => type === "danger" ? "Lỗi" : type === "warning" ? "Cảnh báo" : "Thông tin";

onMounted(() => fetchData());
</script>

<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2 class="text-xl font-bold">Giám sát thời gian thực</h2>
        <p class="text-sm text-gray-500">Cập nhật: {{ currentTime }}</p>
      </div>
      <el-button type="primary" :loading="loading" @click="fetchData">Làm mới</el-button>
    </div>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tổng Đồng hồ</p>
              <p class="text-3xl font-bold">{{ meterStats.total.toLocaleString() }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-monitor /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-green-300">● {{ meterStats.active.toLocaleString() }} đang dùng</span>
            <span class="ml-3 text-red-300">● {{ meterStats.broken }} hỏng</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tổng Gateway</p>
              <p class="text-3xl font-bold">{{ gatewayStats.total }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-router /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-green-300">● {{ gatewayStats.online }} online</span>
            <span class="ml-3 text-red-300">● {{ gatewayStats.offline }} offline</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tiêu thụ hôm nay (m³)</p>
              <p class="text-3xl font-bold">{{ todayConsumption.toLocaleString() }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-water-cup /></el-icon>
          </div>
          <div class="mt-3 text-sm opacity-80">
            Tổng lưu lượng 24h qua
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Cảnh báo chờ xử lý</p>
              <p class="text-3xl font-bold">{{ alerts.length }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-warning /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-yellow-300">● {{ alerts.filter(a => a.type === "warning").length }} cảnh báo</span>
            <span class="ml-3 text-red-300">● {{ alerts.filter(a => a.type === "danger").length }} lỗi</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <span class="font-medium">Tiêu thụ theo giờ (m³) – hôm nay</span>
          </template>
          <div class="h-48 flex items-end gap-1">
            <div v-for="(item, index) in hourlyData" :key="index"
              class="flex-1 flex flex-col items-center">
              <div class="w-full bg-blue-500 rounded-t transition-all"
                :style="{ height: Math.max((item.consumption / maxHourly) * 100, item.consumption > 0 ? 4 : 0) + '%', minHeight: item.consumption > 0 ? '4px' : '0' }" />
              <span v-if="index % 2 === 0" class="text-[10px] mt-1 text-gray-500">{{ item.hour.slice(0, 2) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <span class="font-medium">Trạng thái Đồng hồ</span>
          </template>
          <div class="space-y-3">
            <div v-for="item in meterStatus" :key="item.name"
              class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :style="{ background: item.color }" />
                <span class="text-sm">{{ item.name }}</span>
              </div>
              <span class="font-bold">{{ item.value.toLocaleString() }}</span>
            </div>
            <el-progress v-if="meterStats.total > 0"
              :percentage="+((meterStats.active / meterStats.total) * 100).toFixed(1)"
              :stroke-width="10" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span class="font-medium">Cảnh báo thời gian thực</span>
          </template>
          <el-scrollbar max-height="250">
            <el-empty v-if="!alerts.length" description="Không có cảnh báo" />
            <div v-for="alert in alerts" :key="alert.id"
              class="flex items-start gap-3 py-2 border-b last:border-0">
              <el-tag :type="getTypeColor(alert.type)" size="small">{{ getTypeLabel(alert.type) }}</el-tag>
              <div class="flex-1">
                <p class="text-sm font-medium">{{ alert.meter }}</p>
                <p class="text-xs text-gray-500">{{ alert.message }}</p>
              </div>
              <span class="text-xs text-gray-400">{{ alert.time }}</span>
            </div>
          </el-scrollbar>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span class="font-medium">Theo dõi theo vùng</span>
          </template>
          <el-empty v-if="!zones.length" description="Không có dữ liệu vùng" />
          <el-table v-else :data="zones" stripe size="small">
            <el-table-column prop="name" label="Vùng" />
            <el-table-column prop="meters" label="Tổng ĐH" width="80" align="center" />
            <el-table-column prop="online" label="Đang dùng" width="90" align="center">
              <template #default="{ row }">
                <span class="text-green-500">{{ row.online }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="consumption" label="Hôm nay (m³)" width="110" align="right">
              <template #default="{ row }">{{ row.consumption.toLocaleString() }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
