<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ChartBar, ChartLine } from "@/views/welcome/components/charts";

defineOptions({
  name: "Production"
});

const dateRange = ref("");
const selectedArea = ref("all");

const statsData = ref([
  {
    label: "Tổng sản lượng tháng",
    value: "1,245,680",
    unit: "m³",
    change: "+5.2%",
    color: "#3b82f6"
  },
  {
    label: "Sản lượng trung bình/ngày",
    value: "41,523",
    unit: "m³",
    change: "+3.8%",
    color: "#10b981"
  },
  {
    label: "Sản lượng cao nhất",
    value: "52,100",
    unit: "m³",
    date: "05/04/2026",
    color: "#f59e0b"
  },
  {
    label: "Sản lượng thấp nhất",
    value: "28,450",
    unit: "m³",
    date: "02/04/2026",
    color: "#8b5cf6"
  }
]);

const dailyProduction = ref({
  xAxis: Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  }),
  series: [
    38200, 41500, 39800, 42100, 44500, 41200, 38900, 37600, 40200, 43500, 41800,
    39200, 40500, 42800, 44200, 41500, 39800, 43100, 44800, 41200, 39500, 41800,
    43600, 42100, 40800, 39200, 41500, 42800, 44100, 42500
  ]
});

const areaProduction = ref([
  { area: "Cầu Giấy", total: 425000, percent: 34.1, avgDaily: 14167 },
  { area: "Ba Đình", total: 312000, percent: 25.0, avgDaily: 10400 },
  { area: "Đống Đa", total: 285000, percent: 22.9, avgDaily: 9500 },
  { area: "Hoàn Kiếm", total: 223680, percent: 18.0, avgDaily: 7456 }
]);

const hourlyData = ref([
  1200, 850, 620, 480, 350, 420, 680, 1250, 2100, 2800, 3200, 3100, 2850, 2700,
  2650, 2800, 3100, 2950, 2400, 1800, 1500, 1350, 1200, 1050
]);

const loading = ref(false);

const handleExport = () => console.log("Export");
const handleRefresh = () => (loading.value = true);
</script>

<template>
  <div class="production-container">
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

    <!-- KPI Stats -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6" v-for="(item, index) in statsData" :key="index">
        <el-card shadow="never" class="stat-card">
          <div class="text-sm text-gray-500 mb-2">{{ item.label }}</div>
          <div class="flex items-end gap-2">
            <span class="text-2xl font-bold" :style="{ color: item.color }">{{
              item.value
            }}</span>
            <span class="text-sm text-gray-400 mb-1">{{ item.unit }}</span>
          </div>
          <div v-if="item.change" class="mt-2 text-sm text-green-500">
            {{ item.change }} so với tháng trước
          </div>
          <div v-if="item.date" class="mt-2 text-sm text-gray-400">
            Ngày: {{ item.date }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts Row 1 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="16">
        <el-card shadow="never">
          <div class="flex justify-between items-center mb-4">
            <span class="text-md font-medium"
              >Sản lượng 30 ngày gần nhất (m³)</span
            >
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500">TB: 41,523 m³/ngày</span>
              <el-tag type="success" size="small">+5.2%</el-tag>
            </div>
          </div>
          <div class="h-72">
            <ChartLine color="#3b82f6" :data="dailyProduction.series" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <div class="mb-4">
            <span class="text-md font-medium">Sản lượng theo khu vực</span>
          </div>
          <div class="space-y-4">
            <div
              v-for="(item, index) in areaProduction"
              :key="index"
              class="flex items-center gap-4"
            >
              <span class="w-20 text-sm">{{ item.area }}</span>
              <div class="flex-1">
                <el-progress
                  :percentage="item.percent"
                  :stroke-width="16"
                  :show-text="false"
                  :color="['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index]"
                />
              </div>
              <span class="w-24 text-right text-sm font-medium"
                >{{ (item.total / 1000).toFixed(0) }}K m³</span
              >
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Charts Row 2 -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never">
          <div class="mb-4">
            <span class="text-md font-medium"
              >Sản lượng theo giờ trong ngày (m³)</span
            >
          </div>
          <div class="h-56">
            <ChartBar :requireData="hourlyData" :questionData="[]" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Detail Table -->
    <el-card shadow="never" class="mt-4">
      <div class="flex justify-between items-center mb-4">
        <span class="text-md font-medium">Chi tiết sản lượng theo khu vực</span>
      </div>
      <el-table :data="areaProduction" stripe>
        <el-table-column prop="area" label="Khu vực" width="150" />
        <el-table-column label="Tổng sản lượng" width="150">
          <template #default="{ row }">
            <span class="font-medium">{{ row.total.toLocaleString() }} m³</span>
          </template>
        </el-table-column>
        <el-table-column prop="percent" label="Tỷ lệ (%)" width="120">
          <template #default="{ row }">
            <el-progress
              :percentage="row.percent"
              :stroke-width="12"
              :show-text="false"
              color="#3b82f6"
            />
            <span class="text-sm">{{ row.percent }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="TB/ngày" width="150">
          <template #default="{ row }">
            <span>{{ row.avgDaily.toLocaleString() }} m³</span>
          </template>
        </el-table-column>
        <el-table-column label="So với tháng trước" width="150">
          <template #default="{ row }">
            <span class="text-green-500"
              >+{{ (Math.random() * 10).toFixed(1) }}%</span
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.production-container {
  padding: 16px;
}
.stat-card {
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
}
</style>
