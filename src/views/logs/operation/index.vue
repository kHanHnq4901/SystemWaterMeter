<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "OperationLog" });

const formRef = ref();
const form = reactive({ username: "", operation: "" });

const dataList = ref([
  {
    id: 1,
    username: "admin",
    action: "Thêm mới Gateway",
    module: "Device",
    time: "2026-04-09 10:30:15",
    ip: "192.168.1.100"
  },
  {
    id: 2,
    username: "admin",
    action: "Cập nhật quyền",
    module: "System",
    time: "2026-04-09 09:45:22",
    ip: "192.168.1.100"
  },
  {
    id: 3,
    username: "user01",
    action: "Xem báo cáo",
    module: "Analysis",
    time: "2026-04-09 08:20:10",
    ip: "192.168.1.101"
  }
]);

const loading = ref(false);
const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Người dùng", prop: "username", width: 100 },
  { label: "Hành động", prop: "action", minWidth: 150 },
  { label: "Module", prop: "module", width: 100 },
  { label: "Thời gian", prop: "time", width: 180 },
  { label: "IP", prop: "ip", width: 140 }
];
const pagination = reactive({ current: 1, pageSize: 10, total: 3 });
</script>

<template>
  <div class="p-4">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Người dùng:" prop="username">
        <el-input
          v-model="form.username"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Hành động:" prop="operation">
        <el-input
          v-model="form.operation"
          placeholder="Nhập hành động"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri:search-line')"
          >Tìm kiếm</el-button
        >
        <el-button :icon="useRenderIcon('ri:refresh-line')">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Nhật ký Thao tác"
      :columns="columns"
      @refresh="() => {}"
    >
      <template #default>
        <pure-table
          :loading="loading"
          :data="dataList"
          :columns="columns"
          :pagination="pagination"
          row-key="id"
        />
      </template>
    </PureTableBar>
  </div>
</template>
