<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRole } from "./utils/hook";
import { getPickerShortcuts } from "../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import View from "~icons/ep/view";
import Delete from "~icons/ep/delete";
import Refresh from "~icons/ep/refresh";

defineOptions({ name: "SystemLog" });

const { t } = useI18n();
const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  selectedNum,
  onSearch,
  onDetail,
  clearAll,
  resetForm,
  onbatchDel,
  handleSizeChange,
  onSelectionCancel,
  handleCellDblclick,
  handleCurrentChange,
  handleSelectionChange
} = useRole(tableRef);
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item :label="t('logs.system.operation')" prop="module">
        <el-input v-model="form.module" :placeholder="t('logs.system.operationPlaceholder')" clearable class="w-42.5!" />
      </el-form-item>
      <el-form-item :label="t('logs.system.timeRange')" prop="requestTime">
        <el-date-picker v-model="form.requestTime" :shortcuts="getPickerShortcuts()"
          type="datetimerange" :range-separator="t('logs.system.to')"
          :start-placeholder="t('logs.system.startDate')"
          :end-placeholder="t('logs.system.endDate')" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri:search-line')" :loading="loading" @click="onSearch">
          {{ t("common.search") }}
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">{{ t("common.reset") }}</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar :title="t('logs.system.title')" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-popconfirm :title="t('logs.system.confirmDeleteAll')" @confirm="clearAll">
          <template #reference>
            <el-button type="danger" :icon="useRenderIcon(Delete)">{{ t("logs.system.deleteAll") }}</el-button>
          </template>
        </el-popconfirm>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <div v-if="selectedNum > 0" v-motion-fade
          class="bg-(--el-fill-color-light) w-full h-11.5 mb-2 pl-4 flex items-center">
          <div class="flex-auto">
            <span style="font-size: var(--el-font-size-base)" class="text-[rgba(42,46,54,0.5)] dark:text-[rgba(220,220,242,0.5)]">
              {{ t("logs.system.selected") }} {{ selectedNum }} {{ t("logs.system.items") }}
            </span>
            <el-button type="primary" text @click="onSelectionCancel">{{ t("logs.system.cancelSelect") }}</el-button>
          </div>
          <el-popconfirm :title="t('logs.system.confirmBatchDelete')" @confirm="onbatchDel">
            <template #reference>
              <el-button type="danger" text class="mr-1!">{{ t("logs.system.batchDelete") }}</el-button>
            </template>
          </el-popconfirm>
        </div>
        <pure-table ref="tableRef" row-key="id" align-whole="center" table-layout="auto"
          :loading="loading" :size="size" adaptive :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList" :columns="dynamicColumns" :pagination="{ ...pagination, size }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
          @selection-change="handleSelectionChange" @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange" @cell-dblclick="handleCellDblclick">
          <template #operation="{ row }">
            <el-button class="reset-margin outline-hidden!" link type="primary" :size="size"
              :icon="useRenderIcon(View)" @click="onDetail(row)">
              {{ t("logs.system.detail") }}
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) { margin: 0; }
.search-form { :deep(.el-form-item) { margin-bottom: 12px; } }
</style>
