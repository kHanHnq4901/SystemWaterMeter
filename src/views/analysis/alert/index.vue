<script setup lang="ts">
import { ref } from "vue";

defineOptions({ name: "AnalysisAlert" });

const alertData = ref([
  {
    id: 1,
    time: "09/04/2026 09:30",
    type: "danger",
    typeLabel: "Nguy hiểm",
    title: "Mất kết nối",
    desc: "Gateway GW-CG-02 mất tín hiệu 2 giờ",
    area: "Quận 1",
    status: "active"
  },
  {
    id: 2,
    time: "09/04/2026 08:15",
    type: "warning",
    typeLabel: "Cảnh báo",
    title: "Pin yếu",
    desc: "Đồng hồ MTR-003 pin dưới 15%",
    area: "Quận 3",
    status: "active"
  },
  {
    id: 3,
    time: "09/04/2026 07:00",
    type: "danger",
    typeLabel: "Nguy hiểm",
    title: "Nghi ngờ rò rỉ",
    desc: "Lưu lượng ban đêm tăng bất thường",
    area: "Quận 7",
    status: "resolved"
  },
  {
    id: 4,
    time: "08/04/2026 22:30",
    type: "warning",
    typeLabel: "Cảnh báo",
    title: "Tiêu thụ bất thường",
    desc: "MTR-005 tiêu thụ cao gấp 3 lần bình thường",
    area: "Quận 10",
    status: "active"
  },
  {
    id: 5,
    time: "08/04/2026 18:45",
    type: "danger",
    typeLabel: "Nguy hiểm",
    title: "Phát hiện rò rỉ",
    desc: "Rò rỉ nước tại đường ống chính",
    area: "Bình Thạnh",
    status: "resolved"
  },
  {
    id: 6,
    time: "08/04/2026 15:20",
    type: "warning",
    typeLabel: "Cảnh báo",
    title: "Tín hiệu yếu",
    desc: "Gateway GW-BD-01 tín hiệu dưới 30%",
    area: "Gò Vấp",
    status: "active"
  },
  {
    id: 7,
    time: "08/04/2026 12:10",
    type: "warning",
    typeLabel: "Cảnh báo",
    title: "Pin yếu",
    desc: "Đồng hồ MTR-008 pin dưới 20%",
    area: "Phú Nhuận",
    status: "active"
  },
  {
    id: 8,
    time: "07/04/2026 09:00",
    type: "danger",
    typeLabel: "Nguy hiểm",
    title: "Mất kết nối",
    desc: "Gateway GW-PN-01 mất tín hiệu 48 giờ",
    area: "Phú Nhuận",
    status: "active"
  }
]);

const handleResolve = row => {
  row.status = "resolved";
};
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item label="Loại cảnh báo">
          <el-select placeholder="Chọn loại" style="width: 150px">
            <el-option label="Tất cả" value="all" />
            <el-option label="Nguy hiểm" value="danger" />
            <el-option label="Cảnh báo" value="warning" />
          </el-select>
        </el-form-item>
        <el-form-item label="Khu vực">
          <el-select placeholder="Chọn khu vực" style="width: 150px">
            <el-option label="Tất cả" value="all" />
            <el-option label="Quận 1" value="q1" />
            <el-option label="Quận 3" value="q3" />
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
          <el-button type="primary">Tìm kiếm</el-button>
          <el-button type="success">Đánh dấu tất cả đã xử lý</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium">Danh sách Cảnh báo</span>
        </div>
      </template>
      <el-table :data="alertData" stripe border style="width: 100%">
        <el-table-column prop="time" label="Thời gian" width="150" />
        <el-table-column prop="type" label="Loại" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.type === 'danger' ? 'danger' : 'warning'"
              size="small"
              >{{ row.typeLabel }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Tiêu đề" min-width="150" />
        <el-table-column prop="desc" label="Mô tả" min-width="220" />
        <el-table-column prop="area" label="Khu vực" width="100" />
        <el-table-column
          prop="status"
          label="Trạng thái"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'resolved' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.status === "resolved" ? "Đã xử lý" : "Chưa xử lý" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Thao tác"
          width="120"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'resolved'"
              type="success"
              link
              size="small"
              @click="handleResolve(row)"
              >Xử lý</el-button
            >
            <el-button type="primary" link size="small">Chi tiết</el-button>
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
