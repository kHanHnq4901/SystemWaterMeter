<script setup lang="ts">
import { useDark, useECharts } from "@pureadmin/utils";
import { type PropType, ref, computed, watch, nextTick } from "vue";

// Giữ nguyên tên biến props để không làm lỗi file index.vue cha
const props = defineProps({
  requireData: {
    // Sẽ đại diện cho: Lưu lượng nước
    type: Array as PropType<Array<number>>,
    default: () => []
  },
  questionData: {
    // Sẽ đại diện cho: Cảnh báo / Sự cố
    type: Array as PropType<Array<number>>,
    default: () => []
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
        // Đã Việt hóa chú thích
        data: ["Sản lượng (m³)", "Sự cố"],
        textStyle: {
          color: "#606266",
          fontSize: "0.875rem"
        },
        bottom: 0
      },
      xAxis: [
        {
          type: "category",
          // Đã Việt hóa các ngày trong tuần
          data: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
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
          name: "Sản lượng (m³)",
          type: "bar",
          barWidth: 10,
          itemStyle: {
            color: "#41b6ff", // Màu xanh của nước
            borderRadius: [10, 10, 0, 0] // Bo tròn 2 góc trên của cột
          },
          data: props.requireData
        },
        {
          name: "Sự cố",
          type: "bar",
          barWidth: 10,
          itemStyle: {
            color: "#e86033ce", // Màu đỏ cam cảnh báo
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
