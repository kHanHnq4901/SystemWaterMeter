<script setup lang="ts">
defineOptions({ name: "MapGateway" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Bản đồ Gateway</span>
      </template>
      <div class="h-[600px] flex items-center justify-center bg-gray-100">
        <div class="text-center text-gray-500">
          <iconify-icon-offline icon="ri:router-line" class="text-6xl mb-4" />
          <p>Bản đồ vị trí Gateway</p>
        </div>
      </div>
    </el-card>
  </div>
</template>
