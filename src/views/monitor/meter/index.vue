<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "Meter"
});

const formRef = ref();
const tableRef = ref();

const form = reactive({
  code: "",
  serial: "",
  gateway: "",
  area: "",
  status: ""
});

const dataList = ref([
  {
    id: 1,
    code: "MTR-001",
    serial: "WM01-2024-001",
    model: "WM-01",
    gateway: "GW-CG-01",
    area: "Cầu Giấy",
    reading: 1250.5,
    lastReading: 1248.2,
    status: "active",
    battery: 98,
    lastUpdate: "2026-04-09 08:00"
  },
  {
    id: 2,
    code: "MTR-002",
    serial: "WM01-2024-002",
    model: "WM-01",
    gateway: "GW-CG-01",
    area: "Cầu Giấy",
    reading: 890.3,
    lastReading: 888.0,
    status: "active",
    battery: 95,
    lastUpdate: "2026-04-09 07:55"
  },
  {
    id: 3,
    code: "MTR-003",
    serial: "WM01A-2024-001",
    model: "WM-01A",
    gateway: "GW-CG-02",
    area: "Cầu Giấy",
    reading: 2105.8,
    lastReading: 2102.5,
    status: "inactive",
    battery: 15,
    lastUpdate: "2026-04-08 20:30"
  },
  {
    id: 4,
    code: "MTR-004",
    serial: "WM02-2024-001",
    model: "WM-02",
    gateway: "GW-BD-01",
    area: "Ba Đình",
    reading: 567.2,
    lastReading: 565.0,
    status: "active",
    battery: 92,
    lastUpdate: "2026-04-09 08:02"
  },
  {
    id: 5,
    code: "MTR-005",
    serial: "WM01-2024-010",
    model: "WM-01",
    gateway: "GW-BD-01",
    area: "Ba Đình",
    reading: 1890.0,
    lastReading: 1885.5,
    status: "active",
    battery: 88,
    lastUpdate: "2026-04-09 07:58"
  },
  {
    id: 6,
    code: "MTR-006",
    serial: "WM01-2024-015",
    model: "WM-01",
    gateway: "GW-DD-01",
    area: "Đống Đa",
    reading: 320.5,
    lastReading: 318.2,
    status: "active",
    battery: 97,
    lastUpdate: "2026-04-09 08:00"
  },
  {
    id: 7,
    code: "MTR-007",
    serial: "WM03-2024-001",
    model: "WM-03",
    gateway: "GW-DD-02",
    area: "Đống Đa",
    reading: 1567.8,
    lastReading: 1565.0,
    status: "active",
    battery: 85,
    lastUpdate: "2026-04-09 07:45"
  },
  {
    id: 8,
    code: "MTR-008",
    serial: "WM01-2024-020",
    model: "WM-01",
    gateway: "GW-HK-01",
    area: "Hoàn Kiếm",
    reading: 450.2,
    lastReading: 448.0,
    status: "maintenance",
    battery: 72,
    lastUpdate: "2026-04-09 06:30"
  }
]);

const loading = ref(true);

const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Mã đồng hồ", prop: "code", width: 110 },
  { label: "Số serial", prop: "serial", minWidth: 160 },
  { label: "Model", prop: "model", width: 90 },
  { label: "Gateway", prop: "gateway", width: 110 },
  {
    label: "Khu vực",
    prop: "area",
    width: 110,
    filters: [
      { text: "Cầu Giấy", value: "Cầu Giấy" },
      { text: "Ba Đình", value: "Ba Đình" },
      { text: "Đống Đa", value: "Đống Đa" },
      { text: "Hoàn Kiếm", value: "Hoàn Kiếm" }
    ]
  },
  { label: "Chỉ số hiện tại", prop: "reading", width: 130 },
  { label: "Chỉ số trước", prop: "lastReading", width: 110 },
  { label: "Tiêu thụ", prop: "diff", width: 90 },
  { label: "Trạng thái", prop: "status", width: 110 },
  { label: "Pin (%)", prop: "battery", width: 80 },
  { label: "Cập nhật", prop: "lastUpdate", width: 160 },
  { label: "Thao tác", width: 180, fixed: "right", slot: "operation" }
];

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
});

setTimeout(() => {
  loading.value = false;
  pagination.total = dataList.value.length;
}, 500);

const onSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 500);
};

const resetForm = () => {
  formRef.value?.resetFields();
  onSearch();
};

const handleUpdate = (row: any) => console.log("Update", row);
const handleDelete = (row: any) => console.log("Delete", row);
const handleAdd = () => console.log("Add");
const handleRefresh = () => onSearch();

function getConsumption(row: any) {
  return (row.reading - row.lastReading).toFixed(1);
}

function getStatusType(status: string) {
  const map = { active: "success", inactive: "danger", maintenance: "warning" };
  return map[status] || "info";
}

function getStatusLabel(status: string) {
  const map = {
    active: "Hoạt động",
    inactive: "Ngừng",
    maintenance: "Bảo trì"
  };
  return map[status] || status;
}

function getBatteryColor(battery: number) {
  return battery > 50 ? "#10b981" : battery > 20 ? "#f59e0b" : "#ef4444";
}
</script>

<template>
  <div class="meter-container">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3"
    >
      <el-form-item label="Mã đồng hồ:" prop="code">
        <el-input
          v-model="form.code"
          placeholder="Nhập mã"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Số serial:" prop="serial">
        <el-input
          v-model="form.serial"
          placeholder="Nhập serial"
          clearable
          class="w-44!"
        />
      </el-form-item>
      <el-form-item label="Gateway:" prop="gateway">
        <el-select
          v-model="form.gateway"
          placeholder="Chọn Gateway"
          clearable
          class="w-36!"
        >
          <el-option label="GW-CG-01" value="GW-CG-01" />
          <el-option label="GW-CG-02" value="GW-CG-02" />
          <el-option label="GW-BD-01" value="GW-BD-01" />
          <el-option label="GW-BD-02" value="GW-BD-02" />
        </el-select>
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="status">
        <el-select
          v-model="form.status"
          placeholder="Chọn trạng thái"
          clearable
          class="w-36!"
        >
          <el-option label="Hoạt động" value="active" />
          <el-option label="Ngừng" value="inactive" />
          <el-option label="Bảo trì" value="maintenance" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          @click="onSearch"
          >Tìm kiếm</el-button
        >
        <el-button :icon="useRenderIcon('ri:refresh-line')" @click="resetForm"
          >Làm mới</el-button
        >
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Danh sách Đồng hồ nước"
      :columns="columns"
      @refresh="handleRefresh"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:add-circle-line')"
          @click="handleAdd"
          >Thêm mới</el-button
        >
        <el-button type="success" :icon="useRenderIcon('ri:file-excel-line')"
          >Xuất Excel</el-button
        >
      </template>
      <template #default>
        <pure-table
          ref="tableRef"
          :loading="loading"
          :data="dataList"
          :columns="columns"
          :pagination="pagination"
          row-key="id"
          showOverflowTooltip
        >
          <template #empty>
            <el-empty description="Chưa có dữ liệu" />
          </template>
          <template #reading="{ row }">
            <span class="font-medium">{{ row.reading.toFixed(1) }} m³</span>
          </template>
          <template #diff="{ row }">
            <span class="text-blue-500">{{ getConsumption(row) }} m³</span>
          </template>
          <template #status="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{
              getStatusLabel(row.status)
            }}</el-tag>
          </template>
          <template #battery="{ row }">
            <span :style="{ color: getBatteryColor(row.battery) }"
              >{{ row.battery }}%</span
            >
          </template>
          <template #operation="{ row }">
            <el-button
              type="primary"
              link
              :icon="useRenderIcon('ri:eye-line')"
              @click="handleUpdate(row)"
              >Xem</el-button
            >
            <el-button
              type="primary"
              link
              :icon="useRenderIcon('ri:edit-line')"
              @click="handleUpdate(row)"
              >Sửa</el-button
            >
            <el-button
              type="danger"
              link
              :icon="useRenderIcon('ri:delete-line')"
              @click="handleDelete(row)"
              >Xóa</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.meter-container {
  padding: 16px;
}
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
