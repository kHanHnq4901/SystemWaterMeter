<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import * as echarts from "echarts";

defineOptions({ name: "AnalysisLoss" });

const { t } = useI18n();

const summaryData = computed(() => [
  { label: t("analysis.loss.avgLossRate"),    value: "11.8", unit: "%",       trend: "+3.3%", color: "#ef4444" },
  { label: t("analysis.loss.totalProduction"),value: "1,245,678", unit: "m³", color: "#3b82f6" },
  { label: t("analysis.loss.totalConsumption"),value:"1,098,765", unit: "m³", color: "#10b981" },
  { label: t("analysis.loss.totalLoss"),       value: "146,913",  unit: "m³", color: "#ef4444" }
]);

const districtData = [
  { name: "Quận 1",    production: 156780, consumption: 142345, loss: 14435,  lossRate: 9.2  },
  { name: "Quận 3",    production: 134560, consumption: 119876, loss: 14684,  lossRate: 10.9 },
  { name: "Quận 5",    production: 128900, consumption: 112456, loss: 16444,  lossRate: 12.8 },
  { name: "Quận 7",    production: 245670, consumption: 215678, loss: 29992,  lossRate: 12.2 },
  { name: "Quận 10",   production: 112340, consumption: 98765,  loss: 13575,  lossRate: 12.1 },
  { name: "Bình Thạnh",production: 189650, consumption: 172345, loss: 17305,  lossRate: 9.1  },
  { name: "Gò Vấp",    production: 178900, consumption: 156789, loss: 22111,  lossRate: 12.4 },
  { name: "Phú Nhuận", production: 98878,  consumption: 80511,  loss: 18367,  lossRate: 18.6 }
];

const lossReasons = [
  { reason: "Rò rỉ đường ống", percentage: 45, value: 66111 },
  { reason: "Đồng hồ lỗi/già", percentage: 22, value: 32321 },
  { reason: "Trộm cắp nước",   percentage: 15, value: 22037 },
  { reason: "Lỗi đo lường",    percentage: 10, value: 14691 },
  { reason: "Khác",             percentage: 8,  value: 11753 }
];

const initCharts = () => {
  const chart1 = document.getElementById("lossChart");
  if (chart1) {
    const c1 = echarts.init(chart1);
    c1.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: [t("analysis.loss.avgLossRate"), t("analysis.loss.allowedRate")] },
      xAxis: {
        type: "category",
        data: ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"]
      },
      yAxis: { type: "value", name: "%", max: 20 },
      series: [
        {
          name: t("analysis.loss.avgLossRate"),
          type: "bar",
          data: [12.5,11.2,10.8,11.5,12.1,13.2,11.8,12.7,11.3,10.9,11.6,12.4],
          itemStyle: { color: "#ef4444" }
        },
        {
          name: t("analysis.loss.allowedRate"),
          type: "line",
          data: [8.5,8.5,8.5,8.5,8.5,8.5,8.5,8.5,8.5,8.5,8.5,8.5],
          itemStyle: { color: "#22c55e" },
          lineStyle: { type: "dashed" }
        }
      ]
    });
  }

  const chart2 = document.getElementById("pieChart");
  if (chart2) {
    const c2 = echarts.init(chart2);
    c2.setOption({
      tooltip: { trigger: "item" },
      series: [{
        type: "pie",
        radius: ["40%", "70%"],
        data: lossReasons.map(r => ({ value: r.percentage, name: r.reason }))
      }]
    });
  }
};

onMounted(() => { setTimeout(initCharts, 100); });
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item :label="t('analysis.loss.filterZone')">
          <el-select :placeholder="t('analysis.loss.all')" style="width: 150px">
            <el-option :label="t('analysis.loss.all')" value="all" />
            <el-option label="Quận 1" value="q1" />
            <el-option label="Quận 3" value="q3" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('analysis.loss.filterDate')">
          <el-date-picker
            type="daterange"
            range-separator="-"
            :start-placeholder="t('report.pressure.from')"
            :end-placeholder="t('report.pressure.to')"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">{{ t("analysis.loss.search") }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6" v-for="(item, i) in summaryData" :key="i">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">{{ item.label }}</div>
          <div class="text-2xl font-bold" :style="{ color: item.color }">
            {{ item.value }}<span class="text-sm text-gray-400 ml-1">{{ item.unit }}</span>
          </div>
          <div v-if="item.trend" class="text-sm" :style="{ color: item.color }">{{ item.trend }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header><span>{{ t("analysis.loss.lossMonthly") }}</span></template>
          <div id="lossChart" style="height: 280px"></div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never">
          <template #header><span>{{ t("analysis.loss.lossReasons") }}</span></template>
          <div id="pieChart" style="height: 280px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header><span>{{ t("analysis.loss.districtDetail") }}</span></template>
      <el-table :data="districtData" stripe border>
        <el-table-column prop="name" :label="t('analysis.loss.colDistrict')" width="120" />
        <el-table-column prop="production" :label="t('analysis.loss.colProduction')" width="130" align="right">
          <template #default="{ row }">{{ row.production.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="consumption" :label="t('analysis.loss.colConsumption')" width="130" align="right">
          <template #default="{ row }">{{ row.consumption.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="loss" :label="t('analysis.loss.colLoss')" width="130" align="right">
          <template #default="{ row }">
            <span class="text-red-600 font-medium">{{ row.loss.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lossRate" :label="t('analysis.loss.colLossRate')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.lossRate > 10 ? 'danger' : row.lossRate > 8.5 ? 'warning' : 'success'" size="small">
              {{ row.lossRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('analysis.loss.colChart')" width="150">
          <template #default="{ row }">
            <el-progress :percentage="row.lossRate" :max="20"
              :color="row.lossRate > 10 ? '#ef4444' : row.lossRate > 8.5 ? '#f59e0b' : '#22c55e'" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
