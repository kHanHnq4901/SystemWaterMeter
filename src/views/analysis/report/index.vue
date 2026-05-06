<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({ name: "AnalysisReport" });

const { t } = useI18n();

const reportTypes = computed(() => [
  { label: t("analysis.report.typeDaily"),     value: "daily" },
  { label: t("analysis.report.typeWeekly"),    value: "weekly" },
  { label: t("analysis.report.typeMonthly"),   value: "monthly" },
  { label: t("analysis.report.typeQuarterly"), value: "quarterly" },
  { label: t("analysis.report.typeYearly"),    value: "yearly" }
]);

const typeLabels = computed(() => ({
  daily:     t("analysis.report.typeDaily"),
  weekly:    t("analysis.report.typeWeekly"),
  monthly:   t("analysis.report.typeMonthly"),
  quarterly: t("analysis.report.typeQuarterly"),
  yearly:    t("analysis.report.typeYearly")
}));

const reportData = ref([
  { id: 1, name: "Báo cáo tiêu thụ nước - Tháng 3/2026", type: "monthly", date: "01/04/2026", creator: "Admin", status: "completed" },
  { id: 2, name: "Báo cáo tổn thất nước - Tháng 3/2026", type: "monthly", date: "01/04/2026", creator: "Admin", status: "completed" },
  { id: 3, name: "Báo cáo sản lượng - Tuần 13/2026",     type: "weekly",  date: "01/04/2026", creator: "Admin", status: "completed" },
  { id: 4, name: "Báo cáo tiêu thụ nước - Tháng 2/2026", type: "monthly", date: "01/03/2026", creator: "Admin", status: "completed" },
  { id: 5, name: "Báo cáo tổn thất nước - Tháng 2/2026", type: "monthly", date: "01/03/2026", creator: "Admin", status: "completed" },
  { id: 6, name: "Báo cáo sản lượng - Tuần 12/2026",     type: "weekly",  date: "25/03/2026", creator: "Admin", status: "completed" },
  { id: 7, name: "Báo cáo tiêu thụ nước - Tháng 1/2026", type: "monthly", date: "01/02/2026", creator: "Admin", status: "completed" },
  { id: 8, name: "Báo cáo tổn thất nước - Tháng 1/2026", type: "monthly", date: "01/02/2026", creator: "Admin", status: "completed" }
]);

const handleView     = (row: any) => { console.log("view:", row); };
const handleDownload = (row: any) => { console.log("download:", row); };
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item :label="t('analysis.report.filterType')">
          <el-select :placeholder="t('analysis.report.selectType')" style="width: 180px">
            <el-option v-for="tp in reportTypes" :key="tp.value" :label="tp.label" :value="tp.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('analysis.report.filterDate')">
          <el-date-picker
            type="daterange"
            range-separator="-"
            :start-placeholder="t('analysis.report.from')"
            :end-placeholder="t('analysis.report.to')"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">{{ t("analysis.report.createReport") }}</el-button>
          <el-button type="success">{{ t("analysis.report.exportExcel") }}</el-button>
          <el-button type="warning">{{ t("analysis.report.exportPDF") }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">{{ t("analysis.report.title") }}</span>
      </template>
      <el-table :data="reportData" stripe border style="width: 100%">
        <el-table-column prop="name" :label="t('analysis.report.colName')" min-width="250" />
        <el-table-column prop="type" :label="t('analysis.report.colType')" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ typeLabels[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="date" :label="t('analysis.report.colDate')" width="120" />
        <el-table-column prop="creator" :label="t('analysis.report.colCreator')" width="100" />
        <el-table-column prop="status" :label="t('analysis.report.colStatus')" width="120" align="center">
          <template #default>
            <el-tag type="success" size="small">{{ t("analysis.report.statusCompleted") }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('analysis.report.colAction')" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">{{ t("analysis.report.view") }}</el-button>
            <el-button type="success" link size="small" @click="handleDownload(row)">{{ t("analysis.report.download") }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="mt-4 justify-end"
        :page-size="10"
        :total="50"
        layout="total, prev, pager, next"
      />
    </el-card>
  </div>
</template>
