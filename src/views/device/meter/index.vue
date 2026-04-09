<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "DeviceMeter" });

const formRef = ref();
const form = reactive({ code: "", serial: "", gateway: "", status: "" });

const dataList = ref([
  {
    id: 1,
    code: "MTR-001",
    serial: "WM01-2024-001",
    model: "WM-01",
    gateway: "GW-CG-01",
    area: "Cầu Giấy",
    reading: 1250.5,
    status: "active",
    battery: 98
  },
  {
    id: 2,
    code: "MTR-002",
    serial: "WM01-2024-002",
    model: "WM-01",
    gateway: "GW-CG-01",
    area: "Cầu Giấy",
    reading: 890.3,
    status: "active",
    battery: 95
  },
  {
    id: 3,
    code: "MTR-003",
    serial: "WM01A-2024-001",
    model: "WM-01A",
    gateway: "GW-CG-02",
    area: "Cầu Giấy",
    reading: 2105.8,
    status: "inactive",
    battery: 15
  },
  {
    id: 4,
    code: "MTR-004",
    serial: "WM02-2024-001",
    model: "WM-02",
    gateway: "GW-BD-01",
    area: "Ba Đình",
    reading: 567.2,
    status: "active",
    battery: 92
  },
  {
    id: 5,
    code: "MTR-005",
    serial: "WM01-2024-010",
    model: "WM-01",
    gateway: "GW-BD-01",
    area: "Ba Đình",
    reading: 1890.0,
    status: "active",
    battery: 88
  }
]);

const loading = ref(false);
const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "code", width: 100 },
  { label: "Serial", prop: "serial", minWidth: 150 },
  { label: "Model", prop: "model", width: 90 },
  { label: "Gateway", prop: "gateway", width: 100 },
  { label: "Khu vực", prop: "area", width: 100 },
  { label: "Chỉ số", prop: "reading", width: 100 },
  { label: "Trạng thái", prop: "status", width: 100 },
  { label: "Pin", prop: "battery", width: 70 },
  { label: "Thao tác", width: 120, fixed: "right", slot: "operation" }
];
const pagination = reactive({ current: 1, pageSize: 10, total: 5 });

const onSearch = () => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
};
const resetForm = () => {
  formRef.value?.resetFields();
  onSearch();
};
</script>

<template>
  <div class="p-4">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Mã:" prop="code">
        <el-input
          v-model="form.code"
          placeholder="Nhập mã"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Gateway:" prop="gateway">
        <el-select
          v-model="form.gateway"
          placeholder="Chọn"
          clearable
          class="w-40!"
        >
          <el-option label="GW-CG-01" value="GW-CG-01" />
          <el-option label="GW-CG-02" value="GW-CG-02" />
        </el-select>
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="status">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Hoạt động" value="active" />
          <el-option label="Ngừng" value="inactive" />
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
          >Đặt lại</el-button
        >
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Quản lý Đồng hồ"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon('ri:add-circle-line')"
          >Thêm mới</el-button
        >
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
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
              >{{ row.status === "active" ? "Hoạt động" : "Ngừng" }}</el-tag
            >
          </template>
          <template #operation>
            <el-button type="primary" link>Sửa</el-button>
            <el-button type="danger" link>Xóa</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
