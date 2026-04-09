<script setup lang="ts">
defineOptions({ name: "DeviceModel" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Quản lý Model</span>
      </template>
      <el-table :data="[]" stripe>
        <el-table-column prop="name" label="Tên model" />
        <el-table-column prop="type" label="Loại" />
        <el-table-column prop="manufacturer" label="Hãng sản xuất" />
        <el-table-column prop="count" label="Số lượng" />
      </el-table>
    </el-card>
  </div>
</template>
