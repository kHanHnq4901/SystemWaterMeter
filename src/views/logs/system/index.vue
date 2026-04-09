<script setup lang="ts">
import { ref, reactive } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({ name: "SystemLog" });

const formRef = ref();
const form = reactive({ level: "", message: "" });

const dataList = ref([
  {
    id: 1,
    level: "info",
    message: "Hệ thống khởi động thành công",
    time: "2026-04-09 00:00:01",
    source: "System"
  },
  {
    id: 2,
    level: "warning",
    message: "Kết nối DB chậm",
    time: "2026-04-09 08:15:00",
    source: "Database"
  },
  {
    id: 3,
    level: "error",
    message: "Gateway GW-CG-02 offline",
    time: "2026-04-09 09:30:00",
    source: "Device"
  }
]);

const loading = ref(false);
const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: "Mức độ", prop: "level", width: 100 },
  { label: "Thông báo", prop: "message", minWidth: 200 },
  { label: "Nguồn", prop: "source", width: 120 },
  { label: "Thời gian", prop: "time", width: 180 }
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
      <el-form-item label="Mức độ:" prop="level">
        <el-select
          v-model="form.level"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Info" value="info" />
          <el-option label="Warning" value="warning" />
          <el-option label="Error" value="error" />
        </el-select>
      </el-form-item>
      <el-form-item label="Thông báo:" prop="message">
        <el-input
          v-model="form.message"
          placeholder="Nhập từ khóa"
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
      title="Nhật ký Hệ thống"
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
        >
          <template #level="{ row }">
            <el-tag
              :type="
                row.level === 'error'
                  ? 'danger'
                  : row.level === 'warning'
                    ? 'warning'
                    : 'info'
              "
              size="small"
              >{{ row.level }}</el-tag
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
