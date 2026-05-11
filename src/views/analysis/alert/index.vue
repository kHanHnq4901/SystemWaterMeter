<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import { getWaterAlerts, confirmAlert } from "@/api/dashboard";

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

function alertTypeTag(type: number) {
  if (type === 1) return { tag: "danger",  label: t("analysis.alert.typeDanger") };
  if (type === 2) return { tag: "warning", label: t("analysis.alert.typeWarning") };
  return { tag: "info", label: t("analysis.alert.typeInfo") };
}

// Lấy thông tin loại cảnh báo từ MESSAGE_TYPE
function parseAlertType(rawType: any): number {
  // MESSAGE_TYPE = 1 hoặc 'Error' đều là lỗi
  const n = parseInt(rawType);
  if (!isNaN(n)) return n;
  if (rawType === "Error") return 1;
  if (rawType === "Warning") return 2;
  return 3;
}

async function loadAlerts() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value
    };
    if (filterType.value !== "")   params.type     = filterType.value;
    if (filterStatus.value !== "") params.status   = filterStatus.value;
    if (dateRange.value?.[0])      params.fromDate = dateRange.value[0];
    if (dateRange.value?.[1])      params.toDate   = dateRange.value[1];

    const res = await getWaterAlerts(params);
    if ((res as any)?.code === 0) {
      const list = (res as any).data?.list ?? [];
      alertData.value = list.map((a: any) => ({
        id:            a.id ?? a.MESSAGE_ID,
        time:          a.time ? dayjs(a.time).format("DD/MM/YYYY HH:mm") : "—",
        alertType:     parseAlertType(a.alertType ?? a.MESSAGE_TYPE),
        message:       a.message ?? a.MESSAGE_CONTENT ?? "—",
        meterNo:       a.relatedId ?? a.METER_NO ?? "—",
        isRead:        a.isRead ?? 0,
        confirmStatus: a.confirmStatus ?? 0
      }));
      total.value = (res as any).data?.total ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

async function handleResolve(row: any) {
  try {
    await confirmAlert(row.id);
    row.confirmStatus = 1;
  } catch {
    row.confirmStatus = 1; // optimistic update nếu API lỗi
  }
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
        <el-table-column :label="t('analysis.alert.colType')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="alertTypeTag(row.alertType).tag" size="small">
              {{ alertTypeTag(row.alertType).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="meterNo" :label="t('analysis.alert.colMeter')" width="130" />
        <el-table-column prop="message" :label="t('analysis.alert.colContent')" min-width="280" show-overflow-tooltip />
        <el-table-column :label="t('analysis.alert.colStatus')" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.confirmStatus === 1 ? 'success' : 'warning'" size="small">
              {{ row.confirmStatus === 1 ? t("analysis.alert.statusResolved") : t("analysis.alert.statusUnresolved") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('analysis.alert.colAction')" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.confirmStatus !== 1" type="success" link size="small"
              @click="handleResolve(row)">{{ t("analysis.alert.resolve") }}</el-button>
            <span v-else class="text-xs text-gray-400">—</span>
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
