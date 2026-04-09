<script setup lang="ts">
defineOptions({ name: "AnalysisReport" });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <div class="flex gap-4 items-center">
        <el-select placeholder="Loại báo cáo" class="w-48">
          <el-option label="Báo cáo ngày" value="daily" />
          <el-option label="Báo cáo tuần" value="weekly" />
          <el-option label="Báo cáo tháng" value="monthly" />
        </el-select>
        <el-date-picker
          type="daterange"
          range-separator="-"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          class="w-72"
        />
        <el-button type="primary">Tạo báo cáo</el-button>
        <el-button type="success">Xuất Excel</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Danh sách Báo cáo</span>
      </template>
      <el-table :data="[]" stripe>
        <el-table-column prop="name" label="Tên báo cáo" />
        <el-table-column prop="type" label="Loại" />
        <el-table-column prop="date" label="Ngày tạo" />
        <el-table-column prop="creator" label="Người tạo" />
        <el-table-column label="Thao tác" width="150">
          <template #default>
            <el-button type="primary" link>Xem</el-button>
            <el-button type="success" link>Tải xuống</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
