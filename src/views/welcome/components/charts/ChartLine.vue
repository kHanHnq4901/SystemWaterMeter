<script setup lang="ts">
import { type PropType, ref, computed, watch, nextTick } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";

const props = defineProps({
  data: {
    type: Array as PropType<Array<number>>,
    default: () => []
  },
  color: {
    type: String,
    default: "#41b6ff"
  }
});

const { isDark } = useDark();

const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme,
  renderer: "svg"
});

// THÊM WATCH ĐỂ LẮNG NGHE SỰ THAY ĐỔI CỦA DỮ LIỆU
watch(
  () => props,
  async () => {
    await nextTick(); // Đảm bảo thẻ div <template> đã sẵn sàng mới vẽ
    setOptions({
      container: ".line-card",
      xAxis: {
        type: "category",
        show: false,
        data: props.data
      },
      grid: {
        top: "15px",
        bottom: 0,
        left: 0,
        right: 0
      },
      yAxis: {
        show: false,
        type: "value"
      },
      series: [
        {
          data: props.data,
          type: "line",
          symbol: "none",
          smooth: true,
          color: props.color,
          lineStyle: {
            shadowOffsetY: 3,
            shadowBlur: 7,
            shadowColor: props.color
          }
        }
      ]
    });
  },
  {
    deep: true, // Lắng nghe sâu vào từng phần tử của mảng data
    immediate: true // Kích hoạt vẽ ngay lần đầu tiên component được tạo
  }
);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 60px" />
</template>
