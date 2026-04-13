<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "DeviceModel" });

const loading = ref(false);

const form = reactive({
  name: "",
  manufacturer: "",
  type: ""
});

const dataList = ref([
  {
    id: 1,
    name: "WM-01",
    type: "Đồng hồ nước",
    manufacturer: "Công ty ABC",
    version: "v1.0",
    meterCount: 316,
    status: 1,
    createTime: "2024-01-15"
  },
  {
    id: 2,
    name: "WM-01A",
    type: "Đồng hồ nước",
    manufacturer: "Công ty ABC",
    version: "v1.1",
    meterCount: 25,
    status: 1,
    createTime: "2024-02-01"
  },
  {
    id: 3,
    name: "WM-02",
    type: "Đồng hồ nước",
    manufacturer: "Công ty XYZ",
    version: "v2.0",
    meterCount: 10,
    status: 1,
    createTime: "2024-02-15"
  },
  {
    id: 4,
    name: "WM-02A",
    type: "Đồng hồ nước",
    manufacturer: "Công ty XYZ",
    version: "v2.1",
    meterCount: 1,
    status: 0,
    createTime: "2024-03-01"
  },
  {
    id: 5,
    name: "WM-03",
    type: "Đồng hồ nước",
    manufacturer: "Công ty DEF",
    version: "v3.0",
    meterCount: 2,
    status: 1,
    createTime: "2024-03-10"
  },
  {
    id: 6,
    name: "GW-1000",
    type: "Gateway",
    manufacturer: "Công ty ABC",
    version: "v4.0",
    meterCount: 13,
    status: 1,
    createTime: "2024-01-10"
  },
  {
    id: 7,
    name: "GW-2000",
    type: "Gateway",
    manufacturer: "Công ty XYZ",
    version: "v3.5",
    meterCount: 2,
    status: 1,
    createTime: "2024-02-20"
  }
]);

const pagination = reactive({
  total: 7,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Tên model", prop: "name", width: 100 },
  { label: "Loại", prop: "type", width: 120 },
  { label: "Hãng sản xuất", prop: "manufacturer", minWidth: 140 },
  { label: "Phiên bản", prop: "version", width: 90 },
  { label: "Số lượng", prop: "meterCount", width: 100, align: "center" },
  { label: "Trạng thái", prop: "status", width: 100, align: "center" },
  { label: "Ngày thêm", prop: "createTime", width: 120 },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 300);
};

const resetForm = () => {
  form.name = "";
  form.manufacturer = "";
  form.type = "";
  onSearch();
};

const handleEdit = row => {
  console.log("Sửa:", row);
};

const handleDelete = row => {
  console.log("Xóa:", row);
};

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="p-4">
    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Tên model:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-36!"
        />
      </el-form-item>
      <el-form-item label="Hãng:">
        <el-select
          v-model="form.manufacturer"
          placeholder="Chọn"
          clearable
          class="w-40!"
        >
          <el-option label="Công ty ABC" value="abc" />
          <el-option label="Công ty XYZ" value="xyz" />
          <el-option label="Công ty DEF" value="def" />
        </el-select>
      </el-form-item>
      <el-form-item label="Loại:">
        <el-select
          v-model="form.type"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Đồng hồ nước" value="meter" />
          <el-option label="Gateway" value="gateway" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Quản lý Model Thiết bị"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary">Thêm mới</el-button>
      </template>
      <template #default>
        <pure-table
          :loading="loading"
          :data="dataList"
          :columns="columns"
          :pagination="pagination"
          row-key="id"
        >
          <template #status="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 1 ? "Hoạt động" : "Ngừng" }}
            </el-tag>
          </template>
          <template #operation="{ row }">
            <el-button type="primary" link @click="handleEdit(row)"
              >Sửa</el-button
            >
            <el-button type="danger" link @click="handleDelete(row)"
              >Xóa</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
