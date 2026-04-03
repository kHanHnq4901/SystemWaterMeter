<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useECharts } from "@pureadmin/utils";

const props = defineProps({
  xAxisData: Array,
  seriesData: Array
});

const chartRef = ref();
const { setOptions } = useECharts(chartRef);

watch(
  () => props.seriesData,
  async () => {
    await nextTick();
    setOptions({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 20, right: 10, bottom: 20, left: 30 },
      xAxis: {
        type: "category",
        data: props.xAxisData as string[],
        axisLabel: { fontSize: 10, color: "#666" },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#ddd" } }
      },
      yAxis: {
        type: "value",
        max: 100, // Tỷ lệ thu thập max 100%
        splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        axisLabel: { fontSize: 10, color: "#666" }
      },
      series: [
        {
          name: "Tỷ lệ thu thập",
          type: "bar",
          barWidth: "70%",
          itemStyle: { color: "#14c49d" }, // Trùng màu xanh ngọc trong ảnh
          data: props.seriesData
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
