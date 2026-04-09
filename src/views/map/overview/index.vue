<script setup lang="ts">
defineOptions({ name: "MapOverview" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-lg font-medium">Tổng quan Bản đồ</span>
        </div>
      </template>
      <div class="h-[600px] flex items-center justify-center bg-gray-100">
        <div class="text-center text-gray-500">
          <iconify-icon-offline icon="ri:map-2-line" class="text-6xl mb-4" />
          <p>Bản đồ tổng quan hệ thống</p>
          <p class="text-sm">Hiển thị vị trí các Gateway và Đồng hồ nước</p>
        </div>
      </div>
    </el-card>
  </div>
</template>
