<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  ChartBar,
  ChartLine,
  ChartPie
} from "@/views/welcome/components/charts";

defineOptions({
  name: "Loss"
});

const dateRange = ref("");
const selectedArea = ref("all");

interface SummaryItem {
  label: string;
  value: string;
  trend?: string;
  color: string;
  icon: string;
  unit?: string;
}

const summaryData = ref<SummaryItem[]>([
  {
    label: "Tỷ lệ tổn thất TB",
    value: "17.2%",
    trend: "-1.5%",
    color: "#10b981",
    icon: "ri:trending-down-line"
  },
  {
    label: "Tổng sản lượng nước sạch",
    value: "1,245,680",
    unit: "m³",
    color: "#3b82f6",
    icon: "ri:water-flash-line"
  },
  {
    label: "Tổng sản lượng tính cước",
    value: "1,031,450",
    unit: "m³",
    color: "#8b5cf6",
    icon: "ri:file-chart-line"
  },
  {
    label: "Tổng tổn thất",
    value: "214,230",
    unit: "m³",
    color: "#ef4444",
    icon: "ri:alert-line"
  }
]);

const lossByArea = ref([
  {
    area: "Cầu Giấy",
    input: 425000,
    billed: 351200,
    loss: 73800,
    lossPercent: 17.4,
    status: "normal"
  },
  {
    area: "Ba Đình",
    input: 312000,
    billed: 268500,
    loss: 43500,
    lossPercent: 13.9,
    status: "good"
  },
  {
    area: "Đống Đa",
    input: 285000,
    billed: 229800,
    loss: 55200,
    lossPercent: 19.4,
    status: "warning"
  },
  {
    area: "Hoàn Kiếm",
    input: 223680,
    billed: 181950,
    loss: 41730,
    lossPercent: 18.7,
    status: "warning"
  }
]);

const lossTrendData = {
  xAxis: Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  }),
  series: [
    18.5, 17.8, 18.2, 17.5, 17.9, 16.8, 17.2, 17.5, 18.0, 17.3, 16.9, 17.1,
    17.8, 17.2, 16.5, 16.8, 17.5, 17.0, 16.6, 17.2, 17.8, 17.1, 16.4, 17.3,
    17.6, 17.0, 16.8, 17.2, 17.5, 17.2
  ]
};

const causeData = ref([
  { name: "Rò rỉ đường ống", value: 45, color: "#ef4444" },
  { name: "Sai số đồng hồ", value: 25, color: "#f59e0b" },
  { name: "Đường ống bị phá hoại", value: 15, color: "#8b5cf6" },
  { name: "Công tác bảo trì", value: 10, color: "#3b82f6" },
  { name: "Khác", value: 5, color: "#6b7280" }
]);

const hourlyLossData = Array.from({ length: 24 }).map((_, i) =>
  Math.floor(Math.random() * 50 + 10)
);

const loading = ref(false);

const avgLossPercent = computed(() => {
  const total = lossByArea.value.reduce((sum, item) => sum + item.loss, 0);
  const input = lossByArea.value.reduce((sum, item) => sum + item.input, 0);
  return ((total / input) * 100).toFixed(1);
});

const handleExport = () => console.log("Export");
const handleRefresh = () => (loading.value = true);
</script>

<template>
  <div class="loss-container">
    <!-- Filters -->
    <el-card shadow="never" class="mb-4">
      <div class="flex flex-wrap gap-4 items-center">
        <el-select v-model="selectedArea" placeholder="Khu vực" class="w-40">
          <el-option label="Tất cả" value="all" />
          <el-option label="Cầu Giấy" value="caugiay" />
          <el-option label="Ba Đình" value="badinh" />
          <el-option label="Đống Đa" value="dongda" />
          <el-option label="Hoàn Kiếm" value="hoankiem" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          class="w-72"
        />
        <el-button type="primary" :icon="useRenderIcon('ri:search-line')"
          >Tìm kiếm</el-button
        >
        <el-button
          :icon="useRenderIcon('ri:refresh-line')"
          @click="handleRefresh"
          >Làm mới</el-button
        >
        <el-button
          type="success"
          :icon="useRenderIcon('ri:file-excel-line')"
          @click="handleExport"
          >Xuất Excel</el-button
        >
      </div>
    </el-card>

    <!-- Summary Stats -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6" v-for="(item, index) in summaryData" :key="index">
        <el-card shadow="never" class="stat-card">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-sm text-gray-500 mb-1">{{ item.label }}</div>
              <div class="text-2xl font-bold" :style="{ color: item.color }">
                {{ item.value
                }}<span
                  v-if="item.unit"
                  class="text-sm font-normal text-gray-400 ml-1"
                  >{{ item.unit }}</span
                >
              </div>
              <div
                v-if="item.trend"
                class="mt-2 text-sm"
                :class="
                  item.trend.startsWith('-') ? 'text-green-500' : 'text-red-500'
                "
              >
                <span class="mr-1">{{
                  item.trend.startsWith("-") ? "↓" : "↑"
                }}</span>
                {{ item.trend }} so với tháng trước
              </div>
            </div>
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: item.color + '20' }"
            >
              <component
                :is="useRenderIcon(item.icon)"
                :color="item.color"
                width="20"
                height="20"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts Row 1 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card shadow="never">
          <div class="flex justify-between items-center mb-4">
            <span class="text-md font-medium">Tỷ lệ tổn thất 30 ngày (%)</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500"
                >Trung bình: {{ avgLossPercent }}%</span
              >
              <el-tag type="success" size="small">-1.5%</el-tag>
            </div>
          </div>
          <div class="h-72">
            <ChartLine color="#ef4444" :data="lossTrendData.series" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <div class="mb-4">
            <span class="text-md font-medium">Nguyên nhân tổn thất</span>
          </div>
          <div class="h-64">
            <ChartPie :data="causeData" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Hourly Loss Chart -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="24">
        <el-card shadow="never">
          <div class="mb-4">
            <span class="text-md font-medium"
              >Tổn thất theo giờ trong ngày (m³)</span
            >
          </div>
          <div class="h-56">
            <ChartBar :requireData="hourlyLossData" :questionData="[]" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Detail Table -->
    <el-card shadow="never">
      <div class="flex justify-between items-center mb-4">
        <span class="text-md font-medium">Chi tiết tổn thất theo khu vực</span>
      </div>
      <el-table :data="lossByArea" stripe>
        <el-table-column prop="area" label="Khu vực" width="130" />
        <el-table-column label="Nước vào (m³)" width="130">
          <template #default="{ row }">
            <span class="font-medium">{{ row.input.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Tính cước (m³)" width="130">
          <template #default="{ row }">
            <span>{{ row.billed.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Tổn thất (m³)" width="130">
          <template #default="{ row }">
            <span class="text-red-500 font-medium">{{
              row.loss.toLocaleString()
            }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lossPercent" label="Tỷ lệ (%)" width="150">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-progress
                :percentage="row.lossPercent"
                :stroke-width="14"
                :show-text="false"
                :color="
                  row.lossPercent < 15
                    ? '#10b981'
                    : row.lossPercent < 18
                      ? '#f59e0b'
                      : '#ef4444'
                "
              />
              <span
                class="font-medium"
                :class="
                  row.lossPercent < 15
                    ? 'text-green-500'
                    : row.lossPercent < 18
                      ? 'text-yellow-500'
                      : 'text-red-500'
                "
              >
                {{ row.lossPercent }}%
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Đánh giá" width="120">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'good'
                  ? 'success'
                  : row.status === 'normal'
                    ? 'primary'
                    : 'warning'
              "
              size="small"
            >
              {{
                row.status === "good"
                  ? "Tốt"
                  : row.status === "normal"
                    ? "Bình thường"
                    : "Cảnh báo"
              }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.loss-container {
  padding: 16px;
}
.stat-card {
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
}
</style>
