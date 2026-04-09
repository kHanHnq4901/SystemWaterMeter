<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "LoginLog" });

const formRef = ref();
const form = reactive({ username: "", status: "" });

const dataList = ref([
  {
    id: 1,
    username: "admin",
    ip: "192.168.1.100",
    time: "2026-04-09 09:30:15",
    status: "success",
    browser: "Chrome"
  },
  {
    id: 2,
    username: "user01",
    ip: "192.168.1.101",
    time: "2026-04-09 09:15:22",
    status: "success",
    browser: "Firefox"
  },
  {
    id: 3,
    username: "admin",
    ip: "192.168.1.102",
    time: "2026-04-09 08:45:10",
    status: "failed",
    browser: "Edge"
  }
]);

const loading = ref(false);
const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Tên đăng nhập", prop: "username", width: 120 },
  { label: "Địa chỉ IP", prop: "ip", width: 140 },
  { label: "Thời gian", prop: "time", width: 180 },
  { label: "Trạng thái", prop: "status", width: 100 },
  { label: "Trình duyệt", prop: "browser", width: 120 }
];
const pagination = reactive({ current: 1, pageSize: 10, total: 3 });

const onSearch = () => {};
</script>

<template>
  <div class="p-4">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Tên đăng nhập:" prop="username">
        <el-input
          v-model="form.username"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="status">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Thành công" value="success" />
          <el-option label="Thất bại" value="failed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri:search-line')"
          >Tìm kiếm</el-button
        >
        <el-button :icon="useRenderIcon('ri:refresh-line')">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Nhật ký Đăng nhập"
      :columns="columns"
      @refresh="onSearch"
    >
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
              :type="row.status === 'success' ? 'success' : 'danger'"
              size="small"
              >{{
                row.status === "success" ? "Thành công" : "Thất bại"
              }}</el-tag
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
