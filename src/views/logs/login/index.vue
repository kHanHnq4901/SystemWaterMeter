<script setup lang="ts">
import { ref, reactive, onMounted, h } from "vue";
import { ElTag } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getLoginLogsList } from "@/api/system";
import Refresh from "~icons/ep/refresh";

defineOptions({ name: "LoginLog" });

const formRef = ref();
const loading = ref(false);
const dataList = ref([]);

const form = reactive({
  username: "",
  loginStatus: ""
});

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

const columns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Tên đăng nhập", prop: "username", minWidth: 120 },
  { label: "Địa chỉ IP", prop: "ip", width: 140 },
  { label: "Vị trí", prop: "loginLocation", minWidth: 140 },
  { label: "Trình duyệt", prop: "browser", width: 130 },
  { label: "Hệ điều hành", prop: "os", width: 130 },
  {
    label: "Trạng thái",
    prop: "loginStatus",
    width: 120,
    cellRenderer: ({ row }) =>
      h(
        ElTag,
        { type: row.loginStatus === 1 ? "success" : "danger", size: "small" },
        { default: () => (row.loginStatus === 1 ? "Thành công" : "Thất bại") }
      )
  },
  {
    label: "Thời gian đăng nhập",
    prop: "createTime",
    minWidth: 170,
    formatter: ({ createTime }) =>
      createTime ? new Date(createTime).toLocaleString("vi-VN") : ""
  }
];

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getLoginLogsList({
      username: form.username,
      loginStatus: form.loginStatus,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (code === 0 && data) {
      dataList.value = data.list ?? [];
      pagination.total = data.total ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formRef.value?.resetFields();
  pagination.currentPage = 1;
  onSearch();
}

function onPageChange(page: number) {
  pagination.currentPage = page;
  onSearch();
}

function onSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.currentPage = 1;
  onSearch();
}

onMounted(() => onSearch());
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto"
    >
      <el-form-item label="Tên đăng nhập:" prop="username">
        <el-input
          v-model="form.username"
          placeholder="Nhập tên đăng nhập"
          clearable
          class="w-44!"
        />
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="loginStatus">
        <el-select
          v-model="form.loginStatus"
          placeholder="Tất cả"
          clearable
          class="w-36!"
        >
          <el-option label="Thành công" :value="1" />
          <el-option label="Thất bại" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="() => { pagination.currentPage = 1; onSearch(); }"
        >
          Tìm kiếm
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">
          Đặt lại
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Nhật ký Đăng nhập"
      :columns="columns"
      @refresh="onSearch"
    >
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          adaptive
          :adaptiveConfig="{ offsetBottom: 45 }"
          align-whole="center"
          row-key="id"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{
            ...pagination,
            pageSizes: [10, 20, 50, 100]
          }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="onSizeChange"
          @page-current-change="onPageChange"
        />
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
