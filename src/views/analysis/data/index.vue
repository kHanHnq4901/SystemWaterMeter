<script setup lang="ts">
import { ref } from "vue";

defineOptions({ name: "AnalysisData" });

const dateRange = ref("");
const selectedArea = ref("all");
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <div class="flex flex-wrap gap-4 items-center">
        <el-select v-model="selectedArea" placeholder="Khu vực" class="w-40">
          <el-option label="Tất cả" value="all" />
          <el-option label="Cầu Giấy" value="caugiay" />
          <el-option label="Ba Đình" value="badinh" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          class="w-72"
        />
        <el-button type="primary">Tìm kiếm</el-button>
        <el-button>Xem dữ liệu</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Dữ liệu Đồng hồ</span>
      </template>
      <div class="h-96 flex items-center justify-center text-gray-400">
        <div class="text-center">
          <iconify-icon-offline icon="ri:database-line" class="text-6xl mb-4" />
          <p>Chọn khoảng thời gian và khu vực để xem dữ liệu</p>
        </div>
      </div>
    </el-card>
  </div>
</template>
