<script setup lang="ts">
import { ref, onMounted } from "vue";
import * as echarts from "echarts";

defineOptions({ name: "AnalysisProduction" });

const statsData = ref([
  {
    label: "Tổng sản lượng tháng",
    value: "1,245,678",
    unit: "m³",
    change: "+5.2%",
    color: "#3b82f6"
  },
  {
    label: "TB/ngày",
    value: "41,523",
    unit: "m³",
    change: "+3.8%",
    color: "#10b981"
  },
  {
    label: "TB/khách hàng",
    value: "16.5",
    unit: "m³",
    change: "+2.1%",
    color: "#8b5cf6"
  },
  {
    label: "Số khách hàng",
    value: "9,876",
    unit: "",
    change: "+156",
    color: "#f59e0b"
  }
]);

const monthlyData = [
  { month: "Tháng 1", production: 245678, revenue: 3685170000 },
  { month: "Tháng 2", production: 212345, revenue: 3185175000 },
  { month: "Tháng 3", production: 267890, revenue: 4018350000 },
  { month: "Tháng 4", production: 278456, revenue: 4176840000 },
  { month: "Tháng 5", production: 298765, revenue: 4481475000 },
  { month: "Tháng 6", production: 325678, revenue: 4885170000 },
  { month: "Tháng 7", production: 387654, revenue: 5814810000 },
  { month: "Tháng 8", production: 398765, revenue: 5981475000 },
  { month: "Tháng 9", production: 356789, revenue: 5351835000 },
  { month: "Tháng 10", production: 312456, revenue: 4686840000 },
  { month: "Tháng 11", production: 278954, revenue: 4184310000 },
  { month: "Tháng 12", production: 256789, revenue: 3851835000 }
];

const initChart = () => {
  const chartDom = document.getElementById("productionChart");
  if (!chartDom) return;
  const chart = echarts.init(chartDom);
  chart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["Sản lượng", "Doanh thu"] },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: { type: "category", data: monthlyData.map(d => d.month) },
    yAxis: [
      { type: "value", name: "m³" },
      {
        type: "value",
        name: "VND",
        axisLabel: { formatter: v => (v / 1e9).toFixed(0) + " tỷ" }
      }
    ],
    series: [
      {
        name: "Sản lượng",
        type: "bar",
        data: monthlyData.map(d => d.production),
        itemStyle: { color: "#3b82f6" }
      },
      {
        name: "Doanh thu",
        type: "line",
        yAxisIndex: 1,
        data: monthlyData.map(d => d.revenue),
        itemStyle: { color: "#10b981" }
      }
    ]
  });
};

setTimeout(initChart, 100);
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true">
        <el-form-item label="Khu vực">
          <el-select placeholder="Chọn khu vực" style="width: 150px">
            <el-option label="Tất cả" value="all" />
            <el-option label="Quận 1" value="q1" />
            <el-option label="Quận 3" value="q3" />
          </el-select>
        </el-form-item>
        <el-form-item label="Thời gian">
          <el-date-picker
            type="monthrange"
            range-separator="-"
            start-placeholder="Từ tháng"
            end-placeholder="Đến tháng"
            style="width: 250px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">Tìm kiếm</el-button>
          <el-button type="success">Xuất Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6" v-for="(item, i) in statsData" :key="i">
        <el-card shadow="never">
          <div class="text-sm text-gray-500">{{ item.label }}</div>
          <div class="text-2xl font-bold" :style="{ color: item.color }">
            {{ item.value
            }}<span class="text-sm text-gray-400 ml-1">{{ item.unit }}</span>
          </div>
          <div class="text-sm text-green-500">{{ item.change }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mb-4">
      <template #header
        ><span>Biểu đồ Sản lượng & Doanh thu - Năm 2026</span></template
      >
      <div id="productionChart" style="height: 320px"></div>
    </el-card>

    <el-card shadow="never">
      <template #header><span>Chi tiết Sản lượng theo Tháng</span></template>
      <el-table :data="monthlyData" stripe border>
        <el-table-column prop="month" label="Tháng" width="100" />
        <el-table-column
          prop="production"
          label="Sản lượng (m³)"
          width="140"
          align="right"
        >
          <template #default="{ row }">{{
            row.production.toLocaleString()
          }}</template>
        </el-table-column>
        <el-table-column
          prop="revenue"
          label="Doanh thu (VND)"
          width="160"
          align="right"
        >
          <template #default="{ row }">
            {{
              new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND"
              }).format(row.revenue)
            }}
          </template>
        </el-table-column>
        <el-table-column label="Đánh giá" width="100" align="center">
          <template #default>
            <el-tag type="success" size="small">Bình thường</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
