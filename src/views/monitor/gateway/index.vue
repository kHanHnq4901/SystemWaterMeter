<script setup lang="ts">
import { ref, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import EditPen from "~icons/ri/edit-line";
import Delete from "~icons/ri/delete-line";

defineOptions({ name: "Gateway" });

const { t } = useI18n();

const formRef = ref();
const tableRef = ref();

const form = reactive({ code: "", name: "", area: "", status: "" });

const dataList = ref([
  { id: 1, code: "GW-CG-01", name: "Gateway Cầu Giấy 01", area: "Cầu Giấy", ip: "192.168.1.101", meterCount: 45, online: 43, offline: 2, status: "online", lastUpdate: "2026-04-09 08:00", signal: -65, battery: 98 },
  { id: 2, code: "GW-CG-02", name: "Gateway Cầu Giấy 02", area: "Cầu Giấy", ip: "192.168.1.102", meterCount: 52, online: 50, offline: 2, status: "offline", lastUpdate: "2026-04-08 22:15", signal: -85, battery: 0 },
  { id: 3, code: "GW-BD-01", name: "Gateway Ba Đình 01", area: "Ba Đình", ip: "192.168.1.103", meterCount: 48, online: 47, offline: 1, status: "online", lastUpdate: "2026-04-09 08:02", signal: -58, battery: 95 },
  { id: 4, code: "GW-BD-02", name: "Gateway Ba Đình 02", area: "Ba Đình", ip: "192.168.1.104", meterCount: 50, online: 48, offline: 2, status: "online", lastUpdate: "2026-04-09 08:01", signal: -72, battery: 88 },
  { id: 5, code: "GW-DD-01", name: "Gateway Đống Đa 01", area: "Đống Đa", ip: "192.168.1.105", meterCount: 47, online: 45, offline: 2, status: "online", lastUpdate: "2026-04-09 08:00", signal: -68, battery: 92 },
  { id: 6, code: "GW-DD-02", name: "Gateway Đống Đa 02", area: "Đống Đa", ip: "192.168.1.106", meterCount: 40, online: 38, offline: 2, status: "online", lastUpdate: "2026-04-09 07:58", signal: -75, battery: 85 },
  { id: 7, code: "GW-HK-01", name: "Gateway Hoàn Kiếm 01", area: "Hoàn Kiếm", ip: "192.168.1.107", meterCount: 57, online: 53, offline: 4, status: "online", lastUpdate: "2026-04-09 08:02", signal: -62, battery: 90 },
  { id: 8, code: "GW-HK-02", name: "Gateway Hoàn Kiếm 02", area: "Hoàn Kiếm", ip: "192.168.1.108", meterCount: 28, online: 0, offline: 28, status: "offline", lastUpdate: "2026-04-08 18:30", signal: -95, battery: 5 }
]);

const loading = ref(true);

const columns: TableColumnList = [
  { type: "selection", width: 55 },
  { label: t("monitor.gateway.code"),      prop: "code",        width: 120 },
  { label: t("monitor.gateway.name"),      prop: "name",        minWidth: 180 },
  { label: t("monitor.gateway.area"),      prop: "area",        width: 120,
    filters: [
      { text: "Cầu Giấy", value: "Cầu Giấy" }, { text: "Ba Đình", value: "Ba Đình" },
      { text: "Đống Đa", value: "Đống Đa" }, { text: "Hoàn Kiếm", value: "Hoàn Kiếm" }
    ]
  },
  { label: "IP",                           prop: "ip",          width: 140 },
  { label: t("monitor.gateway.meters"),    prop: "meterCount",  width: 80 },
  { label: "Online",                       prop: "online",      width: 70 },
  { label: "Offline",                      prop: "offline",     width: 70 },
  { label: t("common.status"),             prop: "status",      width: 100 },
  { label: t("monitor.gateway.signal"),    prop: "signal",      width: 110 },
  { label: t("monitor.gateway.battery"),   prop: "battery",     width: 80 },
  { label: t("monitor.gateway.lastUpdate"), prop: "lastUpdate", width: 160 },
  { label: t("common.action"), width: 150, fixed: "right", slot: "operation" }
];

const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

setTimeout(() => { loading.value = false; pagination.total = dataList.value.length; }, 500);

const onSearch = () => { loading.value = true; setTimeout(() => { loading.value = false; }, 500); };
const resetForm = () => { formRef.value?.resetFields(); onSearch(); };
const handleUpdate = (row: any) => console.log("Update", row);
const handleDelete = (row: any) => console.log("Delete", row);
const handleAdd = () => console.log("Add new");
const handleRefresh = () => onSearch();

function getSignalColor(signal: number) { return signal > -70 ? "#10b981" : signal > -85 ? "#f59e0b" : "#ef4444"; }
function getBatteryColor(battery: number) { return battery > 50 ? "#10b981" : battery > 20 ? "#f59e0b" : "#ef4444"; }
function getStatusType(status: string) { return status === "online" ? "success" : "danger"; }
</script>

<template>
  <div class="gateway-container">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form bg-bg_color w-full pl-8 pt-3">
      <el-form-item :label="t('monitor.gateway.code') + ':'" prop="code">
        <el-input v-model="form.code" :placeholder="t('monitor.gateway.enterCode')" clearable class="w-44!" />
      </el-form-item>
      <el-form-item :label="t('monitor.gateway.area') + ':'" prop="area">
        <el-select v-model="form.area" :placeholder="t('monitor.gateway.chooseArea')" clearable class="w-40!">
          <el-option label="Cầu Giấy" value="caugiay" />
          <el-option label="Ba Đình" value="badinh" />
          <el-option label="Đống Đa" value="dongda" />
          <el-option label="Hoàn Kiếm" value="hoankiem" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('common.status') + ':'" prop="status">
        <el-select v-model="form.status" :placeholder="t('monitor.gateway.chooseStatus')" clearable class="w-36!">
          <el-option label="Online" value="online" />
          <el-option label="Offline" value="offline" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri:search-line')" @click="onSearch">{{ t("common.search") }}</el-button>
        <el-button :icon="useRenderIcon('ri:refresh-line')" @click="resetForm">{{ t("common.refresh") }}</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar :title="t('monitor.gateway.title')" :columns="columns" @refresh="handleRefresh">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon('ri:add-circle-line')" @click="handleAdd">{{ t("common.add") }}</el-button>
      </template>
      <template #default>
        <pure-table ref="tableRef" :loading="loading" :data="dataList" :columns="columns"
          :pagination="pagination" row-key="id" showOverflowTooltip>
          <template #empty>
            <el-empty :description="t('monitor.noData')" />
          </template>
          <template #operation="{ row }">
            <el-button type="primary" link :icon="useRenderIcon('ri:edit-line')" @click="handleUpdate(row)">{{ t("common.edit") }}</el-button>
            <el-button type="danger" link :icon="useRenderIcon('ri:delete-line')" @click="handleDelete(row)">{{ t("common.delete") }}</el-button>
          </template>
          <template #status="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.status === "online" ? "Online" : "Offline" }}
            </el-tag>
          </template>
          <template #signal="{ row }">
            <span :style="{ color: getSignalColor(row.signal) }">{{ row.signal }}</span>
          </template>
          <template #battery="{ row }">
            <span :style="{ color: getBatteryColor(row.battery) }">{{ row.battery }}%</span>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.gateway-container { padding: 16px; }
.search-form { :deep(.el-form-item) { margin-bottom: 12px; } }
</style>
