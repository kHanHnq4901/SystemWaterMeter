<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useECharts } from "@pureadmin/utils";

const props = defineProps({
  days:  { type: Array as () => string[], default: () => [] },
  rates: { type: Array as () => number[], default: () => [] }
});

const chartRef = ref();
const { setOptions } = useECharts(chartRef);

watch(
  () => [props.days, props.rates],
  async () => {
    await nextTick();
    setOptions({
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}<br/><b style="color:${p.color}">${p.value}%</b>`;
        }
      },
      grid: { top: 24, left: 46, right: 20, bottom: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: props.days,
        axisLabel: { fontSize: 10, rotate: 40, color: "#888", hideOverlap: true },
        axisLine: { lineStyle: { color: "#e0e0e0" } }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", fontSize: 11, color: "#888" },
        splitLine: { lineStyle: { color: "#f0f0f0" } }
      },
      series: [
        {
          type: "bar",
          name: "Tỷ lệ Online",
          barMaxWidth: 14,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (p: any) => {
              const v = p.value;
              if (v >= 80) return "#67c23a";
              if (v >= 50) return "#e6a23c";
              return "#ef4444";
            }
          },
          data: props.rates,
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#67c23a", type: "dashed", width: 1.5 },
            data: [{ yAxis: 80, label: { formatter: "80%", position: "end", fontSize: 10, color: "#67c23a" } }]
          }
        }
      ]
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 100%" />
</template>
