<script setup lang="ts">
import { ref } from "vue";

defineOptions({ name: "AnalysisProduction" });

const statsData = ref([
  {
    label: "Tổng sản lượng tháng",
    value: "1,245,680",
    unit: "m³",
    change: "+5.2%",
    color: "#3b82f6"
  },
  {
    label: "TB/ngày",
    value: "41,523",
    unit: "m³",
    change: "+3.8%",
    color: "#10b981"
  }
]);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <div class="flex gap-4 items-center">
        <el-select placeholder="Khu vực" class="w-40">
          <el-option label="Tất cả" value="all" />
        </el-select>
        <el-date-picker
          type="monthrange"
          range-separator="-"
          start-placeholder="Từ tháng"
          end-placeholder="Đến tháng"
          class="w-64"
        />
        <el-button type="primary">Tìm kiếm</el-button>
        <el-button type="success">Xuất Excel</el-button>
      </div>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="8" v-for="(item, i) in statsData" :key="i">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">{{ item.label }}</div>
          <div class="text-2xl font-bold" :style="{ color: item.color }">
            {{ item.value }}
          </div>
          <div class="text-sm text-green-500">{{ item.change }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Biểu đồ Sản lượng</span>
      </template>
      <div class="h-80 flex items-center justify-center text-gray-400">
        <iconify-icon-offline icon="ri:bar-chart-box-line" class="text-6xl" />
      </div>
    </el-card>
  </div>
</template>
