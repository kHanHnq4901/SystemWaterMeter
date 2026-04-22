<script setup lang="ts">
import { useDark, useECharts } from "@pureadmin/utils";
import { type PropType, ref, computed, watch, nextTick } from "vue";

// Giữ nguyên tên biến props để không làm lỗi file index.vue cha
const props = defineProps({
  requireData: {
    type: Array as PropType<Array<number>>,
    default: () => []
  },
  questionData: {
    type: Array as PropType<Array<number>>,
    default: () => []
  },
  dates: {
    type: Array as PropType<Array<string>>,
    default: () => ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
  }
});

const { isDark } = useDark();

const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme
});

watch(
  () => props,
  async () => {
    await nextTick(); // Đảm bảo DOM cập nhật xong mới vẽ biểu đồ
    setOptions({
      container: ".bar-card",
      color: ["#41b6ff", "#e85f33"], // Xanh dương (Nước) và Đỏ cam (Cảnh báo)
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "none"
        }
      },
      grid: {
        top: "20px",
        left: "50px",
        right: 0
      },
      legend: {
        data: ["Tổng bản ghi", "Đồng hồ duy nhất"],
        textStyle: {
          color: "#606266",
          fontSize: "0.875rem"
        },
        bottom: 0
      },
      xAxis: [
        {
          type: "category",
          data: props.dates,
          axisLabel: {
            fontSize: "0.875rem"
          },
          axisPointer: {
            type: "shadow"
          }
        }
      ],
      yAxis: [
        {
          type: "value",
          axisLabel: {
            fontSize: "0.875rem"
          },
          splitLine: {
            show: false // Ẩn đường lưới ngang cho gọn mắt
          }
        }
      ],
      series: [
        {
          name: "Tổng bản ghi",
          type: "bar",
          barWidth: 10,
          itemStyle: {
            color: "#41b6ff",
            borderRadius: [10, 10, 0, 0]
          },
          data: props.requireData
        },
        {
          name: "Đồng hồ duy nhất",
          type: "bar",
          barWidth: 10,
          itemStyle: {
            color: "#e85f33",
            borderRadius: [10, 10, 0, 0]
          },
          data: props.questionData
        }
      ]
    });
  },
  {
    deep: true,
    immediate: true
  }
);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 365px" />
</template>
