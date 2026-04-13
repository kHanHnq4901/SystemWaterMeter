<script setup lang="ts">
import { ref } from "vue";

defineOptions({ name: "AnalysisReport" });

const reportTypes = [
  { label: "Báo cáo ngày", value: "daily" },
  { label: "Báo cáo tuần", value: "weekly" },
  { label: "Báo cáo tháng", value: "monthly" },
  { label: "Báo cáo quý", value: "quarterly" },
  { label: "Báo cáo năm", value: "yearly" }
];

const reportData = ref([
  {
    id: 1,
    name: "Báo cáo tiêu thụ nước - Tháng 3/2026",
    type: "monthly",
    date: "01/04/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 2,
    name: "Báo cáo tổn thất nước - Tháng 3/2026",
    type: "monthly",
    date: "01/04/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 3,
    name: "Báo cáo sản lượng - Tuần 13/2026",
    type: "weekly",
    date: "01/04/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 4,
    name: "Báo cáo tiêu thụ nước - Tháng 2/2026",
    type: "monthly",
    date: "01/03/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 5,
    name: "Báo cáo tổn thất nước - Tháng 2/2026",
    type: "monthly",
    date: "01/03/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 6,
    name: "Báo cáo sản lượng - Tuần 12/2026",
    type: "weekly",
    date: "25/03/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 7,
    name: "Báo cáo tiêu thụ nước - Tháng 1/2026",
    type: "monthly",
    date: "01/02/2026",
    creator: "Admin",
    status: "completed"
  },
  {
    id: 8,
    name: "Báo cáo tổn thất nước - Tháng 1/2026",
    type: "monthly",
    date: "01/02/2026",
    creator: "Admin",
    status: "completed"
  }
]);

const typeLabels = {
  daily: "Ngày",
  weekly: "Tuần",
  monthly: "Tháng",
  quarterly: "Quý",
  yearly: "Năm"
};

const handleView = row => {
  console.log("Xem báo cáo:", row);
};

const handleDownload = row => {
  console.log("Tải báo cáo:", row);
};
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item label="Loại báo cáo">
          <el-select placeholder="Chọn loại báo cáo" style="width: 180px">
            <el-option
              v-for="t in reportTypes"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Thời gian">
          <el-date-picker
            type="daterange"
            range-separator="-"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">Tạo báo cáo</el-button>
          <el-button type="success">Xuất Excel</el-button>
          <el-button type="warning">Xuất PDF</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Danh sách Báo cáo đã tạo</span>
      </template>
      <el-table :data="reportData" stripe border style="width: 100%">
        <el-table-column prop="name" label="Tên báo cáo" min-width="250" />
        <el-table-column prop="type" label="Loại" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ typeLabels[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="Ngày tạo" width="120" />
        <el-table-column prop="creator" label="Người tạo" width="100" />
        <el-table-column
          prop="status"
          label="Trạng thái"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag type="success" size="small">Hoàn thành</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Thao tác"
          width="150"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)"
              >Xem</el-button
            >
            <el-button
              type="success"
              link
              size="small"
              @click="handleDownload(row)"
              >Tải xuống</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="mt-4 justify-end"
        :page-size="10"
        :total="50"
        layout="total, prev, pager, next"
      />
    </el-card>
  </div>
</template>
