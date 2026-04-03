<script setup lang="ts">
import { ref, watch, nextTick, type PropType } from "vue";
import { useECharts } from "@pureadmin/utils";
import * as echarts from "echarts/core";

const props = defineProps({
  xAxisData: {
    type: Array as PropType<Array<string>>,
    default: () => []
  },
  supplyData: {
    type: Array as PropType<Array<number>>,
    default: () => []
  },
  billedData: {
    type: Array as PropType<Array<number>>,
    default: () => []
  }
});

const chartRef = ref();
const { setOptions } = useECharts(chartRef);

watch(
  () => props.supplyData,
  async () => {
    await nextTick();
    setOptions({
      tooltip: { trigger: "axis", axisPointer: { type: "line" } },
      legend: { bottom: 0, icon: "circle", textStyle: { color: "#64748b" } },
      grid: { top: 20, right: 20, bottom: 40, left: 50 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        // Ép kiểu trực tiếp tại đây để tắt lỗi TypeScript của ECharts
        data: props.xAxisData as string[],
        axisLabel: { color: "#64748b", fontSize: 11 },
        axisLine: { lineStyle: { color: "#e2e8f0" } }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
        axisLabel: { color: "#64748b", fontSize: 11 }
      },
      series: [
        {
          name: "Nước Cấp (Tổng)",
          type: "line",
          smooth: true,
          symbol: "none",
          itemStyle: { color: "#3b82f6" }, // Xanh dương
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(59, 130, 246, 0.4)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.0)" }
            ])
          },
          // Ép kiểu mảng số
          data: props.supplyData as number[]
        },
        {
          name: "Ghi Thu (Đồng hồ)",
          type: "line",
          smooth: true,
          symbol: "none",
          itemStyle: { color: "#10b981" }, // Xanh lá
          lineStyle: { width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(16, 185, 129, 0.4)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.0)" }
            ])
          },
          // Ép kiểu mảng số
          data: props.billedData as number[]
        }
      ]
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 320px" />
</template>
