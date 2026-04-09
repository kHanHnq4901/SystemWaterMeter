<script setup lang="ts">
defineOptions({ name: "DeviceArea" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Quản lý Khu vực</span>
      </template>
      <el-table :data="[]" stripe>
        <el-table-column prop="name" label="Tên khu vực" />
        <el-table-column prop="code" label="Mã khu vực" />
        <el-table-column prop="gatewayCount" label="Số Gateway" />
        <el-table-column prop="meterCount" label="Số đồng hồ" />
        <el-table-column prop="status" label="Trạng thái" />
      </el-table>
    </el-card>
  </div>
</template>
