<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "DeviceGateway" });

const formRef = ref();
const tableRef = ref();

const form = reactive({ code: "", name: "", area: "", status: "" });

const dataList = ref([
  {
    id: 1,
    code: "GW-CG-01",
    name: "Gateway Cầu Giấy 01",
    area: "Cầu Giấy",
    ip: "192.168.1.101",
    meterCount: 45,
    online: 43,
    offline: 2,
    status: "online",
    signal: -65
  },
  {
    id: 2,
    code: "GW-CG-02",
    name: "Gateway Cầu Giấy 02",
    area: "Cầu Giấy",
    ip: "192.168.1.102",
    meterCount: 52,
    online: 50,
    offline: 2,
    status: "offline",
    signal: -85
  },
  {
    id: 3,
    code: "GW-BD-01",
    name: "Gateway Ba Đình 01",
    area: "Ba Đình",
    ip: "192.168.1.103",
    meterCount: 48,
    online: 47,
    offline: 1,
    status: "online",
    signal: -58
  },
  {
    id: 4,
    code: "GW-BD-02",
    name: "Gateway Ba Đình 02",
    area: "Ba Đình",
    ip: "192.168.1.104",
    meterCount: 50,
    online: 48,
    offline: 2,
    status: "online",
    signal: -72
  },
  {
    id: 5,
    code: "GW-DD-01",
    name: "Gateway Đống Đa 01",
    area: "Đống Đa",
    ip: "192.168.1.105",
    meterCount: 47,
    online: 45,
    offline: 2,
    status: "online",
    signal: -68
  },
  {
    id: 6,
    code: "GW-DD-02",
    name: "Gateway Đống Đa 02",
    area: "Đống Đa",
    ip: "192.168.1.106",
    meterCount: 40,
    online: 38,
    offline: 2,
    status: "online",
    signal: -75
  }
]);

const loading = ref(false);

const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "code", width: 120 },
  { label: "Tên", prop: "name", minWidth: 180 },
  { label: "Khu vực", prop: "area", width: 120 },
  { label: "IP", prop: "ip", width: 140 },
  { label: "Đồng hồ", prop: "meterCount", width: 80 },
  { label: "Online", prop: "online", width: 70 },
  { label: "Trạng thái", prop: "status", width: 100 },
  { label: "Tín hiệu", prop: "signal", width: 80 },
  { label: "Thao tác", width: 120, fixed: "right", slot: "operation" }
];

const pagination = reactive({ current: 1, pageSize: 10, total: 6 });

setTimeout(() => {
  loading.value = false;
}, 300);

const onSearch = () => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
};
const resetForm = () => {
  formRef.value?.resetFields();
  onSearch();
};
const handleAdd = () => console.log("Add");
const handleUpdate = (row: any) => console.log("Update", row);
const handleDelete = (row: any) => console.log("Delete", row);
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
      <el-form-item label="Khu vực:" prop="area">
        <el-select
          v-model="form.area"
          placeholder="Chọn"
          clearable
          class="w-40!"
        >
          <el-option label="Cầu Giấy" value="caugiay" />
          <el-option label="Ba Đình" value="badinh" />
          <el-option label="Đống Đa" value="dongda" />
        </el-select>
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="status">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Online" value="online" />
          <el-option label="Offline" value="offline" />
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
      title="Quản lý Gateway"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:add-circle-line')"
          @click="handleAdd"
          >Thêm mới</el-button
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
        >
          <template #status="{ row }">
            <el-tag
              :type="row.status === 'online' ? 'success' : 'danger'"
              size="small"
              >{{ row.status === "online" ? "Online" : "Offline" }}</el-tag
            >
          </template>
          <template #operation="{ row }">
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
