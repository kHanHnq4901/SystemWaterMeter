<script setup lang="ts">
import { ref, markRaw, computed } from "vue";
import ReCol from "@/components/ReCol";
import { useDark, randomGradient } from "./utils";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import WelcomeTable from "./components/table/index.vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderFlicker } from "@/components/ReFlicker";
import {
  ChartBar,
  ChartPie,
  ChartCollectionBar,
  ChartArea
} from "./components/charts";
import Segmented, { type OptionsType } from "@/components/ReSegmented";
import {
  kpiData,
  statusMeterData,
  statusGatewayData,
  typeMeterData,
  connectionGatewayData,
  collectionRateData,
  waterConsumptionData,
  liveAlerts,
  waterLossTrendData,
  barChartData,
  progressData
} from "./data";

// waterLossTrendData là { xAxis, series } - lấy series để hiển thị
const waterLossValues = waterLossTrendData.series;

defineOptions({ name: "Welcome" });

useDark();
const selectedUnit = ref("all");
const dateRange = ref("");
let curWeek = ref(1);

const optionsBasis: Array<OptionsType> = [
  { label: "Tuần trước" },
  { label: "Tuần này" }
];

const alertTypeTag = (type: string) => {
  if (type === "danger") return "danger";
  if (type === "warning") return "warning";
  return "success";
};

const waterLossAvg = computed(() =>
  (waterLossValues.reduce((a, b) => a + b, 0) / waterLossValues.length).toFixed(
    1
  )
);

const xAxis7days = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
});

const supplyData = [15200, 16100, 15800, 17200, 16900, 18100, 17950];
const billedData = waterConsumptionData.series;
</script>

<template>
  <div class="welcome-dashboard">
    <!-- ===== THANH LỌC ===== -->
    <el-card shadow="never" class="filter-bar mb-4">
      <div class="flex flex-wrap gap-3 items-center">
        <el-select
          v-model="selectedUnit"
          placeholder="Chọn đơn vị / trạm"
          class="w-52"
        >
          <el-option label="Tất cả đơn vị" value="all" />
          <el-option label="Khu vực Cầu Giấy" value="caugiay" />
          <el-option label="Khu vực Ba Đình" value="badinh" />
          <el-option label="Khu vực Đống Đa" value="dongda" />
          <el-option label="Khu vực Hoàn Kiếm" value="hoankiem" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="–"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          class="w-68"
        />
        <el-button type="primary" :icon="'Search'">Lọc dữ liệu</el-button>
        <el-button :icon="'Refresh'">Làm mới</el-button>
        <div class="ml-auto flex items-center gap-2 text-sm text-gray-400">
          <el-icon class="animate-spin-slow"><el-icon-loading /></el-icon>
          Cập nhật lúc: 08:45 08/04/2026
        </div>
      </div>
    </el-card>

    <!-- ===== KPI CARDS ===== -->
    <el-row :gutter="16" class="mb-4">
      <re-col
        v-for="(item, index) in kpiData"
        :key="index"
        v-motion
        :value="6"
        :md="12"
        :sm="12"
        :xs="24"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * index } }"
        class="mb-3"
      >
        <el-card shadow="never" class="kpi-card h-full">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs text-gray-500 mb-1">{{ item.title }}</p>
              <p class="text-2xl font-bold" :style="{ color: item.color }">
                {{ item.value }}
              </p>
            </div>
            <div
              class="kpi-icon flex items-center justify-center rounded-xl w-12 h-12"
              :style="{
                background: `linear-gradient(135deg, ${item.color}cc, ${item.color})`
              }"
            >
              <component
                :is="useRenderIcon(item.icon)"
                color="white"
                width="22"
                height="22"
              />
            </div>
          </div>
          <div
            class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1 text-xs text-gray-500"
          >
            <el-icon class="text-green-500"><el-icon-top /></el-icon>
            <span class="text-green-500 font-medium">+2.4%</span> so với tháng
            trước
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 2: CẢNH BÁO + CHỈ SỐ THẤT THOÁT ===== -->
    <el-row :gutter="16" class="mb-4">
      <!-- Cảnh báo thời gian thực -->
      <re-col
        v-motion
        :value="16"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, x: -60 }"
        :enter="{ opacity: 1, x: 0, transition: { delay: 200 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-red-500"><el-icon-warning /></el-icon>
                Cảnh báo thời gian thực
              </span>
              <el-badge
                :value="liveAlerts.filter(a => a.type !== 'success').length"
                type="danger"
              >
                <el-button size="small" text type="primary"
                  >Xem tất cả</el-button
                >
              </el-badge>
            </div>
          </template>
          <el-scrollbar max-height="220">
            <div
              v-for="(alert, i) in liveAlerts"
              :key="i"
              class="alert-item flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
            >
              <el-tag
                :type="alertTypeTag(alert.type)"
                size="small"
                class="shrink-0 mt-0.5"
                round
              >
                {{
                  alert.type === "danger"
                    ? "⚠ Lỗi"
                    : alert.type === "warning"
                      ? "⚡ Cảnh báo"
                      : "✓ OK"
                }}
              </el-tag>
              <div class="flex-1 min-w-0">
                <p
                  class="text-xs font-semibold text-gray-700 dark:text-gray-200"
                >
                  {{ alert.title }}
                </p>
                <p class="text-xs text-gray-500 truncate">{{ alert.desc }}</p>
              </div>
              <span class="text-xs text-gray-400 shrink-0">{{
                alert.time
              }}</span>
            </div>
          </el-scrollbar>
        </el-card>
      </re-col>

      <!-- Thất thoát nước -->
      <re-col
        v-motion
        :value="8"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, x: 60 }"
        :enter="{ opacity: 1, x: 0, transition: { delay: 200 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full water-loss-card">
          <template #header>
            <span class="font-semibold text-sm flex items-center gap-2">
              <el-icon class="text-blue-500"><el-icon-data-analysis /></el-icon>
              Chỉ số thất thoát nước (NRW)
            </span>
          </template>
          <div class="text-center mb-4">
            <el-progress
              type="dashboard"
              :percentage="Number(waterLossAvg)"
              :color="[
                { color: '#10b981', percentage: 15 },
                { color: '#f59e0b', percentage: 20 },
                { color: '#ef4444', percentage: 100 }
              ]"
              :stroke-width="14"
              :width="120"
            >
              <template #default="{ percentage }">
                <span class="text-2xl font-bold">{{ percentage }}%</span>
                <p class="text-xs text-gray-400 mt-1">Trung bình 7 ngày</p>
              </template>
            </el-progress>
          </div>
          <div class="grid grid-cols-7 gap-1 mt-2">
            <div
              v-for="(val, i) in waterLossValues"
              :key="i"
              class="flex flex-col items-center gap-1"
            >
              <span
                class="text-xs font-semibold"
                :class="
                  val > 18
                    ? 'text-red-400'
                    : val > 16
                      ? 'text-amber-400'
                      : 'text-green-500'
                "
                >{{ val }}%</span
              >
              <div
                class="w-full rounded-t-sm"
                :style="{
                  height: `${val * 3}px`,
                  background:
                    val > 18 ? '#ef4444' : val > 16 ? '#f59e0b' : '#10b981'
                }"
              />
              <span class="text-[10px] text-gray-400">{{ xAxis7days[i] }}</span>
            </div>
          </div>
          <div class="flex gap-3 mt-3 text-xs justify-center">
            <span class="flex items-center gap-1"
              ><span class="inline-block w-2 h-2 rounded-full bg-green-500" />≤
              16%</span
            >
            <span class="flex items-center gap-1"
              ><span
                class="inline-block w-2 h-2 rounded-full bg-amber-400"
              />16–18%</span
            >
            <span class="flex items-center gap-1"
              ><span class="inline-block w-2 h-2 rounded-full bg-red-400" />>
              18%</span
            >
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 3: BIỂU ĐỒ AREA + BIỂU ĐỒ CỘT THU THẬP ===== -->
    <el-row :gutter="16" class="mb-4">
      <!-- Area chart: Nước cấp vs Ghi thu -->
      <re-col
        v-motion
        :value="14"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 80 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 280 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-blue-400"
                  ><el-icon-trend-charts
                /></el-icon>
                Sản lượng nước: Cấp vs Ghi thu (m³) – 7 ngày gần nhất
              </span>
              <el-tag type="info" size="small">m³/ngày</el-tag>
            </div>
          </template>
          <ChartArea
            :xAxisData="xAxis7days"
            :supplyData="supplyData"
            :billedData="billedData"
          />
        </el-card>
      </re-col>

      <!-- Bar chart: tỷ lệ thu thập 30 ngày -->
      <re-col
        v-motion
        :value="10"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 80 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 320 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-teal-500"><el-icon-histogram /></el-icon>
                Tỷ lệ thu thập dữ liệu – 30 ngày
              </span>
              <el-tag size="small" type="success">Avg: 97.15%</el-tag>
            </div>
          </template>
          <ChartCollectionBar
            :xAxisData="collectionRateData.xAxis"
            :seriesData="collectionRateData.series"
          />
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 4: BIỂU ĐỒ CỘT TUẦN + TỶ LỆ THU THẬP NGÀY ===== -->
    <el-row :gutter="16" class="mb-4">
      <re-col
        v-motion
        :value="18"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 80 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 360 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="bar-card h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-indigo-500"><el-icon-data-line /></el-icon>
                Sản lượng (m³) &amp; Sự cố theo ngày trong tuần
              </span>
              <Segmented v-model="curWeek" :options="optionsBasis" />
            </div>
          </template>
          <ChartBar
            :requireData="barChartData[curWeek].requireData"
            :questionData="barChartData[curWeek].questionData"
          />
        </el-card>
      </re-col>

      <!-- Tỷ lệ thu thập theo ngày (progress bars) -->
      <re-col
        v-motion
        :value="6"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 80 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <span class="font-semibold text-sm flex items-center gap-2">
              <el-icon class="text-emerald-500"><el-icon-odometer /></el-icon>
              Tỷ lệ thu thập theo ngày
            </span>
          </template>
          <div
            v-for="(item, index) in progressData"
            :key="index"
            class="flex items-center gap-2 mb-3"
          >
            <span class="text-xs text-gray-500 w-6 shrink-0">{{
              item.week
            }}</span>
            <el-progress
              class="flex-1"
              :text-inside="true"
              :percentage="item.percentage"
              :stroke-width="18"
              :color="item.color"
              striped
              striped-flow
              :duration="item.duration"
            />
          </div>
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 5: 4 PIE CHARTS THIẾT BỊ ===== -->
    <el-row :gutter="16" class="mb-4">
      <re-col :value="24" :xs="24" class="mb-2">
        <div class="section-title flex items-center gap-2 mb-3">
          <el-icon class="text-purple-500"><el-icon-pie-chart /></el-icon>
          <span class="font-semibold text-sm text-gray-700 dark:text-gray-200"
            >Phân bố trạng thái thiết bị</span
          >
        </div>
      </re-col>

      <re-col
        v-for="(chart, idx) in [
          {
            title: 'Trạng thái Đồng hồ',
            data: statusMeterData,
            name: 'Đồng hồ'
          },
          {
            title: 'Trạng thái Gateway',
            data: statusGatewayData,
            name: 'Gateway'
          },
          { title: 'Loại Đồng hồ', data: typeMeterData, name: 'Loại ĐH' },
          {
            title: 'Kết nối Gateway',
            data: connectionGatewayData,
            name: 'Kết nối'
          }
        ]"
        :key="idx"
        v-motion
        :value="6"
        :md="12"
        :sm="12"
        :xs="24"
        :initial="{ opacity: 0, scale: 0.85 }"
        :enter="{
          opacity: 1,
          scale: 1,
          transition: { delay: 100 * idx + 420 }
        }"
        class="mb-3"
      >
        <el-card shadow="never" class="pie-card" style="height: 280px">
          <div
            class="text-xs font-semibold text-center mb-1 text-gray-600 dark:text-gray-300"
          >
            {{ chart.title }}
          </div>
          <ChartPie :data="chart.data" :name="chart.name" />
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 6: BẢNG THIẾT BỊ + NHẬT KÝ HỆ THỐNG ===== -->
    <el-row :gutter="16" class="mb-4">
      <!-- Bảng thống kê thiết bị -->
      <re-col
        v-motion
        :value="18"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 600 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-sky-500"><el-icon-list /></el-icon>
                Thống kê dữ liệu thiết bị (Gateway / Trạm)
              </span>
              <div class="flex gap-2">
                <el-button size="small" type="primary" plain>
                  <el-icon><el-icon-download /></el-icon> Xuất Excel
                </el-button>
                <el-button size="small" type="success" plain>
                  <el-icon><el-icon-plus /></el-icon> Thêm mới
                </el-button>
              </div>
            </div>
          </template>
          <el-scrollbar max-height="420">
            <WelcomeTable />
          </el-scrollbar>
        </el-card>
      </re-col>

      <!-- Nhật ký hệ thống -->
      <re-col
        v-motion
        :value="6"
        :md="24"
        :xs="24"
        :initial="{ opacity: 0, y: 60 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 660 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sm flex items-center gap-2">
                <el-icon class="text-orange-400"><el-icon-clock /></el-icon>
                Nhật ký hệ thống
              </span>
              <el-button size="small" text type="primary">Tất cả</el-button>
            </div>
          </template>
          <el-scrollbar max-height="420">
            <el-timeline>
              <el-timeline-item
                v-for="(alert, i) in liveAlerts"
                :key="i"
                :color="alert.color"
                center
                placement="top"
                :timestamp="alert.time"
                :icon="
                  markRaw(
                    useRenderFlicker({
                      background: randomGradient({ randomizeHue: true })
                    })
                  )
                "
              >
                <div class="text-xs">
                  <p class="font-semibold text-gray-700 dark:text-gray-200">
                    {{ alert.title }}
                  </p>
                  <p class="text-gray-500 mt-0.5">{{ alert.desc }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-scrollbar>
        </el-card>
      </re-col>
    </el-row>

    <!-- ===== HÀNG 7: THỐNG KÊ TỔNG HỢP (SUMMARY CARDS) ===== -->
    <el-row :gutter="16" class="mb-4">
      <re-col :value="24" :xs="24" class="mb-2">
        <div class="section-title flex items-center gap-2 mb-3">
          <el-icon class="text-teal-500"><el-icon-data-board /></el-icon>
          <span class="font-semibold text-sm text-gray-700 dark:text-gray-200"
            >Tổng hợp vận hành hệ thống</span
          >
        </div>
      </re-col>

      <re-col
        v-for="(card, idx) in [
          {
            label: 'Đồng hồ online',
            value: '312',
            unit: 'thiết bị',
            color: '#10b981',
            icon: 'fa-solid fa-circle-check'
          },
          {
            label: 'Đồng hồ offline > 24h',
            value: '48',
            unit: 'thiết bị',
            color: '#f59e0b',
            icon: 'fa-solid fa-triangle-exclamation'
          },
          {
            label: 'Pin yếu (< 20%)',
            value: '23',
            unit: 'thiết bị',
            color: '#ef4444',
            icon: 'fa-solid fa-battery-quarter'
          },
          {
            label: 'Chưa ghi nhận 7 ngày',
            value: '7',
            unit: 'đồng hồ',
            color: '#8b5cf6',
            icon: 'fa-solid fa-circle-xmark'
          },
          {
            label: 'Lệnh chờ thực thi',
            value: '14',
            unit: 'lệnh',
            color: '#3b82f6',
            icon: 'fa-solid fa-hourglass-half'
          },
          {
            label: 'Rò rỉ nghi ngờ',
            value: '3',
            unit: 'khu vực',
            color: '#ec4899',
            icon: 'fa-solid fa-droplet'
          }
        ]"
        :key="idx"
        v-motion
        :value="4"
        :md="8"
        :sm="12"
        :xs="24"
        :initial="{ opacity: 0, y: 40 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * idx + 700 } }"
        class="mb-3"
      >
        <el-card shadow="never" class="summary-card text-center py-2">
          <div class="flex flex-col items-center gap-1">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center mb-1"
              :style="{ background: `${card.color}22` }"
            >
              <i
                :class="card.icon"
                :style="{ color: card.color, fontSize: '18px' }"
              />
            </div>
            <ReNormalCountTo
              :duration="1200"
              :fontSize="'1.5rem'"
              :startVal="0"
              :endVal="Number(card.value)"
              :style="{ color: card.color }"
              class="font-bold"
            />
            <p class="text-xs text-gray-400">{{ card.unit }}</p>
            <p
              class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center leading-tight"
            >
              {{ card.label }}
            </p>
          </div>
        </el-card>
      </re-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.welcome-dashboard {
  padding: 4px;
}

.filter-bar {
  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.kpi-card {
  :deep(.el-card__body) {
    padding: 16px;
  }
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  }
}

.pie-card {
  :deep(.el-card__body) {
    padding: 10px 8px 0;
    height: calc(100% - 44px);
  }
}

.summary-card {
  :deep(.el-card__body) {
    padding: 12px 8px;
  }
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
}

.water-loss-card {
  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.alert-item {
  transition: background 0.15s;
  border-radius: 6px;
  padding-left: 4px;
  padding-right: 4px;
  &:hover {
    background: rgba(0, 0, 0, 0.025);
  }
}

:deep(.el-card) {
  --el-card-border-color: rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 11px;
  color: #9ca3af;
}

:deep(.el-progress--line .el-progress-bar__innerText) {
  font-size: 12px;
}

.section-title {
  padding-left: 2px;
}
</style>
