<script setup lang="ts">
import { ref, computed, onMounted, reactive } from "vue";
import {
  getWaterDashboard,
  getRealtimeData,
  getWaterAlerts,
  getMeterStatus,
  getGatewayStats
} from "@/api/dashboard";

defineOptions({ name: "MonitoringDashboard" });

const currentTime = ref(new Date().toLocaleString("vi-VN"));
setInterval(() => {
  currentTime.value = new Date().toLocaleString("vi-VN");
}, 1000);

const loading = ref(false);

const meterStats = reactive({
  totalMeters: 0,
  activeMeters: 0,
  inactiveMeters: 0
});

const gatewayStats = reactive({
  totalGateways: 0,
  onlineGateways: 0,
  offlineGateways: 0
});

const alerts = ref<any[]>([]);

const meterStatus = ref<any[]>([]);
const gatewayStatus = ref<any[]>([]);

const hourlyData = ref<any[]>([]);
const zones = ref<any[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const [
      dashboardRes,
      realtimeRes,
      alertsRes,
      meterStatusRes,
      gatewayStatsRes
    ] = await Promise.allSettled([
      getWaterDashboard(),
      getRealtimeData(),
      getWaterAlerts({ pageSize: 20 }),
      getMeterStatus(),
      getGatewayStats()
    ]);

    if (
      dashboardRes?.status === "fulfilled" &&
      dashboardRes.value?.data?.success
    ) {
      const data = dashboardRes.value.data.data;
      meterStats.totalMeters = data.meters?.totalMeters || 0;
      meterStats.activeMeters = data.meters?.activeMeters || 0;
      meterStats.inactiveMeters = data.meters?.inactiveMeters || 0;
      gatewayStats.totalGateways = data.gateways?.totalGateways || 0;
      gatewayStats.onlineGateways = data.gateways?.onlineGateways || 0;
      gatewayStats.offlineGateways = data.gateways?.offlineGateways || 0;
    } else {
      useMockData();
    }

    if (alertsRes?.status === "fulfilled" && alertsRes.value?.data?.success) {
      alerts.value = (alertsRes.value.data.data?.list || []).map((a: any) => ({
        id: a.id,
        time: new Date(a.time).toLocaleTimeString("vi-VN"),
        type:
          a.isRead === 0
            ? a.alertType === 1
              ? "danger"
              : a.alertType === 2
                ? "warning"
                : "info"
            : "info",
        meter:
          a.relatedType === "meter"
            ? `MTR-${a.relatedId}`
            : a.relatedType === "gateway"
              ? `GW-${a.relatedId}`
              : "System",
        message: a.message
      }));
    }

    if (
      meterStatusRes?.status === "fulfilled" &&
      meterStatusRes.value?.data?.success
    ) {
      meterStatus.value = meterStatusRes.value.data.data || [];
    }

    if (
      gatewayStatsRes?.status === "fulfilled" &&
      gatewayStatsRes.value?.data?.success
    ) {
      const stats = gatewayStatsRes.value.data.data;
      gatewayStatus.value = [
        { name: "Online", value: stats.onlineGateways || 0, color: "#10b981" },
        { name: "Offline", value: stats.offlineGateways || 0, color: "#ef4444" }
      ];
    }

    // Generate hourly data for demo (would come from API in production)
    hourlyData.value = Array.from({ length: 12 }, (_, i) => ({
      hour: `${String(i * 2).padStart(2, "0")}:00`,
      consumption: Math.floor(Math.random() * 3000) + 500
    }));
  } catch (error) {
    useMockData();
  } finally {
    loading.value = false;
  }
};

const useMockData = () => {
  meterStats.totalMeters = 367;
  meterStats.activeMeters = 320;
  meterStats.inactiveMeters = 47;
  gatewayStats.totalGateways = 15;
  gatewayStats.onlineGateways = 13;
  gatewayStats.offlineGateways = 2;
  alerts.value = [
    {
      id: 1,
      time: "10:15:30",
      type: "danger",
      meter: "MTR-003",
      message: "Mất kết nối > 24h"
    },
    {
      id: 2,
      time: "10:12:45",
      type: "warning",
      meter: "MTR-007",
      message: "Pin yếu (< 20%)"
    },
    {
      id: 3,
      time: "10:10:22",
      type: "warning",
      meter: "MTR-089",
      message: "Tiêu thụ bất thường"
    },
    {
      id: 4,
      time: "10:08:15",
      type: "info",
      meter: "MTR-156",
      message: "Cập nhật firmware thành công"
    },
    {
      id: 5,
      time: "10:05:00",
      type: "warning",
      meter: "GW-CG-02",
      message: "Tín hiệu yếu (-85 dBm)"
    }
  ];
  meterStatus.value = [
    { name: "Hoạt động", value: 320, color: "#10b981" },
    { name: "Offline", value: 47, color: "#ef4444" }
  ];
  gatewayStatus.value = [
    { name: "Online", value: 13, color: "#10b981" },
    { name: "Offline", value: 2, color: "#ef4444" }
  ];
};

onMounted(() => {
  fetchData();
});

const onlineMeters = computed(() => meterStats.activeMeters);
const offlineMeters = computed(() => meterStats.inactiveMeters);
const totalMeters = computed(() => meterStats.totalMeters);

const onlineGateways = computed(() => gatewayStats.onlineGateways);
const offlineGateways = computed(() => gatewayStats.offlineGateways);
const totalGateways = computed(() => gatewayStats.totalGateways);

zones.value = [
  { name: "Quận 1", meters: 5200, online: 5080, consumption: 8500 },
  { name: "Quận 3", meters: 6800, online: 6650, consumption: 11200 },
  { name: "Quận 5", meters: 7500, online: 7350, consumption: 12800 },
  { name: "Quận 7", meters: 6100, online: 5950, consumption: 9800 },
  { name: "Bình Thạnh", meters: 9200, online: 9000, consumption: 15500 }
];

const getTypeColor = (type: string) => {
  if (type === "danger") return "danger";
  if (type === "warning") return "warning";
  return "info";
};

const getTypeLabel = (type: string) => {
  if (type === "danger") return "Lỗi";
  if (type === "warning") return "Cảnh báo";
  return "Thông tin";
};

onMounted(() => {
  setInterval(() => {
    onlineMeters.value = 8200 + Math.floor(Math.random() * 100);
    onlineGateways.value = 115 + Math.floor(Math.random() * 10);
  }, 5000);
});
</script>

<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2 class="text-xl font-bold">Giám sát thời gian thực</h2>
        <p class="text-sm text-gray-500">Cập nhật: {{ currentTime }}</p>
      </div>
      <el-button
        type="primary"
        :icon="'Refresh'"
        @click="currentTime = new Date().toLocaleString('vi-VN')"
      >
        Làm mới
      </el-button>
    </div>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card
          shadow="never"
          class="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tổng Đồng hồ</p>
              <p class="text-3xl font-bold">
                {{ totalMeters.toLocaleString() }}
              </p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-monitor /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-green-300"
              >● {{ onlineMeters.toLocaleString() }} online</span
            >
            <span class="ml-3 text-red-300"
              >● {{ offlineMeters.toLocaleString() }} offline</span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="never"
          class="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tổng Gateway</p>
              <p class="text-3xl font-bold">{{ totalGateways }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-router /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-green-300">● {{ onlineGateways }} online</span>
            <span class="ml-3 text-red-300"
              >● {{ offlineGateways }} offline</span
            >
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="never"
          class="bg-gradient-to-br from-green-500 to-green-600 text-white"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Tiêu thụ hôm nay (m³)</p>
              <p class="text-3xl font-bold">12,850</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-water-cup /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-green-300">↑ 5.2% so với hôm qua</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card
          shadow="never"
          class="bg-gradient-to-br from-orange-500 to-orange-600 text-white"
        >
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm opacity-80">Cảnh báo chờ xử lý</p>
              <p class="text-3xl font-bold">{{ alerts.length }}</p>
            </div>
            <el-icon class="text-4xl opacity-50"><el-icon-warning /></el-icon>
          </div>
          <div class="mt-3 text-sm">
            <span class="text-yellow-300"
              >● {{ alerts.filter(a => a.type === "warning").length }} cảnh
              báo</span
            >
            <span class="ml-3 text-red-300"
              >● {{ alerts.filter(a => a.type === "danger").length }} lỗi</span
            >
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-medium">Tiêu thụ theo giờ (m³) - 24h</span>
              <el-radio-group size="small" model-value="today">
                <el-radio-button label="today">Hôm nay</el-radio-button>
                <el-radio-button label="yesterday">Hôm qua</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="h-48 flex items-end gap-2">
            <div
              v-for="(item, index) in hourlyData"
              :key="index"
              class="flex-1 flex flex-col items-center"
            >
              <div
                class="w-full bg-blue-500 rounded-t"
                :style="{
                  height: item.consumption / 35 + '%',
                  minHeight: '20px'
                }"
              ></div>
              <span class="text-xs mt-1 text-gray-500">{{ item.hour }}</span>
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
            <div
              v-for="(item, index) in meterStatus"
              :key="index"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-3 h-3 rounded-full"
                  :style="{ background: item.color }"
                ></span>
                <span class="text-sm">{{ item.name }}</span>
              </div>
              <span class="font-bold">{{ item.value.toLocaleString() }}</span>
            </div>
            <el-progress
              :percentage="((onlineMeters / totalMeters) * 100).toFixed(1)"
              :stroke-width="10"
            />
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
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="flex items-start gap-3 py-2 border-b last:border-0"
            >
              <el-tag :type="getTypeColor(alert.type)" size="small">{{
                getTypeLabel(alert.type)
              }}</el-tag>
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
            <span class="font-medium">Theo dõi theo khu vực</span>
          </template>
          <el-table :data="zones" stripe size="small">
            <el-table-column prop="name" label="Khu vực" />
            <el-table-column
              prop="meters"
              label="Tổng ĐH"
              width="80"
              align="center"
            />
            <el-table-column
              prop="online"
              label="Online"
              width="80"
              align="center"
            >
              <template #default="{ row }">
                <span class="text-green-500">{{ row.online }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="consumption"
              label="Tiêu thụ (m³)"
              width="100"
              align="right"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
