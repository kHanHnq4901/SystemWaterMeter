<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import { getWaterAlerts } from "@/api/dashboard";

defineOptions({ name: "AnalysisAlert" });

const { t } = useI18n();

const loading = ref(false);
const alertData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const filterType   = ref("");
const filterStatus = ref("");
const dateRange    = ref<[string, string] | null>(null);

function alertLevel(type: number) {
  return type === 1 ? "danger" : type === 2 ? "warning" : "info";
}
function alertLabel(type: number) {
  return type === 1 ? t("analysis.alert.typeDanger") : type === 2 ? t("analysis.alert.typeWarning") : t("analysis.alert.typeInfo");
}

async function loadAlerts() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value
    };
    if (filterType.value !== "")   params.type   = filterType.value;
    if (filterStatus.value !== "") params.status  = filterStatus.value;
    if (dateRange.value?.[0])      params.fromDate = dateRange.value[0];
    if (dateRange.value?.[1])      params.toDate   = dateRange.value[1];

    const res = await getWaterAlerts(params);
    const body = (res as any)?.data ?? res;
    if (body?.success) {
      alertData.value = (body.data?.list ?? []).map((a: any) => ({
        id:         a.id ?? a.MESSAGE_ID,
        time:       a.time ? dayjs(a.time).format("DD/MM/YYYY HH:mm") : "—",
        alertType:  a.alertType ?? a.MESSAGE_TYPE ?? 2,
        message:    a.message ?? a.MESSAGE_CONTENT ?? "—",
        meterNo:    a.relatedId ?? a.METER_NO ?? "—",
        isRead:     a.isRead ?? a.READ_STATUS ?? 0,
        confirmStatus: a.confirmStatus ?? a.CONFIRM_STATUS ?? 0
      }));
      total.value = body.data?.total ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

async function handleResolve(row: any) {
  row.confirmStatus = 1;
}

async function markAllResolved() {
  alertData.value.forEach(a => { a.confirmStatus = 1; });
}

function handleSearch() {
  currentPage.value = 1;
  loadAlerts();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadAlerts();
}

onMounted(() => loadAlerts());
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item :label="t('analysis.alert.filterType')">
          <el-select v-model="filterType" :placeholder="t('analysis.alert.all')" clearable style="width: 150px">
            <el-option :label="t('analysis.alert.all')" value="" />
            <el-option :label="t('analysis.alert.typeDanger')" :value="1" />
            <el-option :label="t('analysis.alert.typeWarning')" :value="2" />
            <el-option :label="t('analysis.alert.typeInfo')" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('analysis.alert.filterStatus')">
          <el-select v-model="filterStatus" :placeholder="t('analysis.alert.all')" clearable style="width: 150px">
            <el-option :label="t('analysis.alert.all')" value="" />
            <el-option :label="t('analysis.alert.statusUnresolved')" :value="0" />
            <el-option :label="t('analysis.alert.statusResolved')" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('analysis.alert.filterDate')">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="–"
            :start-placeholder="t('analysis.alert.from')" :end-placeholder="t('analysis.alert.to')"
            value-format="YYYY-MM-DD" style="width: 250px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">{{ t("common.search") }}</el-button>
          <el-button type="success" @click="markAllResolved">{{ t("analysis.alert.markAllResolved") }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium">{{ t("analysis.alert.title") }}</span>
          <el-tag type="info">{{ total }} {{ t("analysis.alert.totalRecords") }}</el-tag>
        </div>
      </template>

      <el-table :data="alertData" stripe border style="width: 100%" v-loading="loading">
        <el-table-column prop="time" :label="t('analysis.alert.colTime')" width="155" />
        <el-table-column :label="t('analysis.alert.colType')" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="alertLevel(row.alertType)" size="small">
              {{ alertLabel(row.alertType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="meterNo" :label="t('analysis.alert.colMeter')" width="120" />
        <el-table-column prop="message" :label="t('analysis.alert.colContent')" min-width="220" show-overflow-tooltip />
        <el-table-column :label="t('analysis.alert.colStatus')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.confirmStatus === 1 ? 'success' : 'warning'" size="small">
              {{ row.confirmStatus === 1 ? t("analysis.alert.statusResolved") : t("analysis.alert.statusUnresolved") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('analysis.alert.colAction')" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.confirmStatus !== 1" type="success" link size="small"
              @click="handleResolve(row)">{{ t("analysis.alert.resolve") }}</el-button>
            <el-button type="primary" link size="small">{{ t("analysis.alert.detail") }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="mt-4 justify-end"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>
