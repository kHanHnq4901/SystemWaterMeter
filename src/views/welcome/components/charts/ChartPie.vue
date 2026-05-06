<script setup lang="ts">
import { ref, watchEffect, nextTick } from "vue";
import { useECharts } from "@pureadmin/utils";

const props = defineProps({
  data:   Array,
  name:   String,
  colors: Array
});

const chartRef = ref();
const { setOptions } = useECharts(chartRef);

watchEffect(async () => {
  // Đọc props trước await để watchEffect track được dependency
  const data   = props.data   as any[] | undefined;
  const name   = props.name;
  const colors = props.colors as string[] | undefined;

  if (!data?.length) return;
  await nextTick();

  setOptions({
    color: colors?.length ? colors : undefined,
    tooltip: { trigger: "item", formatter: "{a} <br/>{b}: {c} ({d}%)" },
    legend: {
      bottom: 2,
      left: "center",
      icon: "roundRect",
      itemWidth: 12,
      itemHeight: 7,
      itemGap: 10,
      textStyle: { fontSize: 10, color: "#666" }
    },
    // Đặt grid rõ ràng để ECharts không bao giờ vẽ ra ngoài canvas
    series: [
      {
        name,
        type: "pie",
        radius: ["0%", "50%"],   // thu nhỏ để label không tràn
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        data,
        label: {
          show: true,
          formatter: "{b}\n{c} ({d}%)",
          fontSize: 10,
          color: "inherit",
          overflow: "truncate",
          width: 80
        },
        labelLine: { show: true, length: 8, length2: 10, smooth: true },
        itemStyle: { borderWidth: 0 }
      }
    ]
  });
});
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: calc(100% - 20px)" />
</template>