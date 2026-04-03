<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useECharts } from "@pureadmin/utils";

const props = defineProps({
  data: Array,
  name: String
});

const chartRef = ref();
const { setOptions } = useECharts(chartRef);

watch(
  () => props.data,
  async (newData) => {
    await nextTick();
    setOptions({
      tooltip: { trigger: "item", formatter: "{a} <br/>{b}: {c} ({d}%)" },
      legend: { 
        bottom: "0%", 
        left: "center",
        icon: "roundRect", 
        itemWidth: 14, 
        itemHeight: 8,
        textStyle: { fontSize: 10, color: '#666' }
      },
      series: [
        {
          name: props.name,
          type: "pie",
          radius: "55%", // Tròn đặc như trong ảnh
          center: ["50%", "45%"],
          data: newData,
          label: {
            show: true,
            formatter: "{b}\n{c}({d}%)", // Chữ rẽ ra ngoài
            fontSize: 10,
            color: 'inherit'
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 15
          },
          itemStyle: {
            borderWidth: 0
          }
        }
      ]
    });
  },
  { deep: true, immediate: true }
);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: calc(100% - 20px)" />
</template>