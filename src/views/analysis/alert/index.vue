<script setup lang="ts">
defineOptions({ name: "AnalysisAlert" });

const alertData = ref([
  {
    time: "09:30",
    type: "danger",
    title: "Mất kết nối",
    desc: "Gateway GW-CG-02 mất tín hiệu 2 giờ",
    area: "Cầu Giấy"
  },
  {
    time: "08:15",
    type: "warning",
    title: "Pin yếu",
    desc: "Đồng hồ MTR-003 pin < 15%",
    area: "Cầu Giấy"
  },
  {
    time: "07:00",
    type: "danger",
    title: "Nghi ngờ rò rỉ",
    desc: "Lưu lượng ban đêm tăng bất thường",
    area: "Ba Đình"
  }
]);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <div class="flex gap-4 items-center">
        <el-select placeholder="Loại cảnh báo" class="w-40">
          <el-option label="Tất cả" value="all" />
          <el-option label="Nguy hiểm" value="danger" />
          <el-option label="Cảnh báo" value="warning" />
        </el-select>
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

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Danh sách Cảnh báo</span>
      </template>
      <el-table :data="alertData" stripe>
        <el-table-column prop="time" label="Thời gian" width="100" />
        <el-table-column prop="type" label="Loại" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.type === 'danger' ? 'danger' : 'warning'"
              size="small"
              >{{ row.type === "danger" ? "Nguy hiểm" : "Cảnh báo" }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Tiêu đề" />
        <el-table-column prop="desc" label="Mô tả" />
        <el-table-column prop="area" label="Khu vực" width="120" />
      </el-table>
    </el-card>
  </div>
</template>
