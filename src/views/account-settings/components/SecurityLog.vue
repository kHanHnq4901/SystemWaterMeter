<script setup lang="ts">
import dayjs from "dayjs";
import { h, computed, reactive, ref, onMounted } from "vue";
import { ElTag } from "element-plus";
import { useI18n } from "vue-i18n";
import { getMineLogs } from "@/api/user";
import { deviceDetection } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";

defineOptions({ name: "SecurityLog" });

const { t } = useI18n();

const loading = ref(true);
const dataList = ref([]);
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true,
  layout: "prev, pager, next"
});

const columns = computed<TableColumnList>(() => [
  {
    label: t("accountSettings.logStatus"),
    prop: "loginStatus",
    minWidth: 110,
    cellRenderer: ({ row }) =>
      h(
        ElTag,
        { type: row.loginStatus === 1 ? "success" : "danger", size: "small" },
        { default: () => row.loginStatus === 1 ? t("accountSettings.loginSuccess") : t("accountSettings.loginFail") }
      )
  },
  {
    label: t("accountSettings.logIp"),
    prop: "ip",
    minWidth: 130
  },
  {
    label: t("accountSettings.logLocation"),
    prop: "address",
    minWidth: 150
  },
  {
    label: t("accountSettings.logOs"),
    prop: "system",
    minWidth: 110
  },
  {
    label: t("accountSettings.logBrowser"),
    prop: "browser",
    minWidth: 110
  },
  {
    label: t("accountSettings.logTime"),
    prop: "operatingTime",
    minWidth: 170,
    formatter: ({ operatingTime }) =>
      operatingTime ? dayjs(operatingTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  }
]);

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getMineLogs({
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (code === 0) {
      dataList.value = data.list;
      pagination.total = data.total;
    }
  } finally {
    loading.value = false;
  }
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

onMounted(onSearch);
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">{{ t('accountSettings.securityLog') }}</h3>
    <pure-table
      row-key="operatingTime"
      table-layout="auto"
      :loading="loading"
      :data="dataList"
      :columns="columns"
      :pagination="pagination"
      @page-current-change="onPageChange"
      @page-size-change="onSizeChange"
    />
  </div>
</template>
