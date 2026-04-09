<script setup lang="ts">
defineOptions({ name: "MapMeter" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Bản đồ Đồng hồ</span>
      </template>
      <div class="h-[600px] flex items-center justify-center bg-gray-100">
        <div class="text-center text-gray-500">
          <iconify-icon-offline
            icon="ri:water-drop-line"
            class="text-6xl mb-4"
          />
          <p>Bản đồ vị trí Đồng hồ nước</p>
        </div>
      </div>
    </el-card>
  </div>
</template>
