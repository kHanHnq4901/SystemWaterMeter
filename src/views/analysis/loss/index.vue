<script setup lang="ts">
defineOptions({ name: "AnalysisLoss" });

const summaryData = ref([
  {
    label: "Tỷ lệ tổn thất TB",
    value: "17.2%",
    trend: "-1.5%",
    color: "#10b981"
  },
  { label: "Tổng nước vào", value: "1,245,680", unit: "m³", color: "#3b82f6" },
  { label: "Tổng tổn thất", value: "214,230", unit: "m³", color: "#ef4444" }
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
          type="daterange"
          range-separator="-"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          class="w-72"
        />
        <el-button type="primary">Tìm kiếm</el-button>
      </div>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="8" v-for="(item, i) in summaryData" :key="i">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">{{ item.label }}</div>
          <div class="text-2xl font-bold" :style="{ color: item.color }">
            {{ item.value
            }}<span v-if="item.unit" class="text-sm text-gray-400 ml-1">{{
              item.unit
            }}</span>
          </div>
          <div v-if="item.trend" class="text-sm text-green-500">
            {{ item.trend }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Chi tiết Tổn thất theo Khu vực</span>
      </template>
      <el-table :data="[]" stripe>
        <el-table-column prop="area" label="Khu vực" />
        <el-table-column prop="input" label="Nước vào" />
        <el-table-column prop="loss" label="Tổn thất" />
        <el-table-column prop="percent" label="Tỷ lệ (%)" />
      </el-table>
    </el-card>
  </div>
</template>
