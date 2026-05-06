<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "DeviceZone" });

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);

const form = reactive({
  wardId: "",
  name: "",
  code: ""
});

const wardOptions = ref([
  { label: "Phường Bến Nghé", value: 1 },
  { label: "Phường Bến Thành", value: 2 },
  { label: "Phường Nguyễn Thái Bình", value: 3 },
  { label: "Phường 8", value: 4 },
  { label: "Phường 9", value: 5 },
  { label: "Phường 11", value: 6 }
]);

const dataList = ref([
  { id: 1, wardId: 1, wardName: "Phường Bến Nghé", name: "Khu vực Bến Nghé A", code: "KV-01A", clusterCount: 5, gatewayCount: 15, meterCount: 650, activeMeter: 640, status: 1 },
  { id: 2, wardId: 1, wardName: "Phường Bến Nghé", name: "Khu vực Bến Nghé B", code: "KV-01B", clusterCount: 4, gatewayCount: 12, meterCount: 520, activeMeter: 510, status: 1 },
  { id: 3, wardId: 2, wardName: "Phường Bến Thành", name: "Khu vực Chợ Bến Thành", code: "KV-02A", clusterCount: 6, gatewayCount: 18, meterCount: 780, activeMeter: 765, status: 1 },
  { id: 4, wardId: 2, wardName: "Phường Bến Thành", name: "Khu vực Đông Tây", code: "KV-02B", clusterCount: 3, gatewayCount: 10, meterCount: 420, activeMeter: 415, status: 1 },
  { id: 5, wardId: 3, wardName: "Phường Nguyễn Thái Bình", name: "Khu vực Nguyễn Thái Bình", code: "KV-03A", clusterCount: 4, gatewayCount: 14, meterCount: 580, activeMeter: 570, status: 1 }
]);

const pagination = reactive({ total: 5, pageSize: 10, currentPage: 1, background: true });

const columns = [
  { type: "selection", width: 55 },
  { label: t("device.zone.code"), prop: "code", width: 80 },
  { label: t("device.zone.name"), prop: "name", minWidth: 160 },
  { label: t("device.zone.ward"), prop: "wardName", width: 140 },
  { label: t("device.zone.cluster"), prop: "clusterCount", width: 80, align: "center" },
  { label: "GW", prop: "gatewayCount", width: 70, align: "center" },
  { label: "ĐH", prop: "meterCount", width: 80, align: "center" },
  { label: t("common.status"), prop: "status", width: 90, align: "center" },
  { label: t("common.action"), width: 120, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
};

const resetForm = () => {
  form.wardId = "";
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/zone/${row.id}`);
};

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item :label="t('device.zone.ward') + ':'">
        <el-select v-model="form.wardId" :placeholder="t('common.all')" clearable class="w-44!">
          <el-option v-for="item in wardOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('common.name') + ':'">
        <el-input v-model="form.name" :placeholder="t('common.name')" clearable class="w-40!" />
      </el-form-item>
      <el-form-item :label="t('common.code') + ':'">
        <el-input v-model="form.code" :placeholder="t('common.code')" clearable class="w-28!" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">{{ t("common.search") }}</el-button>
        <el-button @click="resetForm">{{ t("common.reset") }}</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar :title="t('device.zone.management')" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary">{{ t("common.add") }}</el-button>
      </template>
      <template #default>
        <pure-table :loading="loading" :data="dataList" :columns="columns" :pagination="pagination" row-key="id">
          <template #status="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? t("device.zone.active") : t("device.zone.inactive") }}
            </el-tag>
          </template>
          <template #operation="{ row }">
            <el-button type="primary" link @click="handleView(row)">{{ t("common.view") }}</el-button>
            <el-button type="primary" link>{{ t("common.edit") }}</el-button>
            <el-button type="danger" link>{{ t("common.delete") }}</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
