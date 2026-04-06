<script setup lang="ts">
import { ref, markRaw } from "vue";
import ReCol from "@/components/ReCol";
import { useDark, randomGradient } from "./utils";
import WelcomeTable from "./components/table/index.vue";
import { ReNormalCountTo } from "@/components/ReCountTo";
import { useRenderFlicker } from "@/components/ReFlicker";
import { ChartBar, ChartLine, ChartRound } from "./components/charts";
import Segmented, { type OptionsType } from "@/components/ReSegmented";
import { chartData, barChartData, progressData, latestNewsData } from "./data";

defineOptions({
  name: "Welcome"
});

const { isDark } = useDark();

// --- BIẾN CHO BỘ LỌC DỮ LIỆU ---
const selectedUnit = ref("all");
const dateRange = ref("");

// --- BIẾN CHO BIỂU ĐỒ ---
let curWeek = ref(1); // 0: Tuần trước, 1: Tuần này
const optionsBasis: Array<OptionsType> = [
  {
    label: "Tuần trước"
  },
  {
    label: "Tuần này"
  }
];
</script>

<template>
  <div>
    <el-card shadow="never" class="mb-4.5 border-0">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="flex items-center space-x-4">
          <el-select
            v-model="selectedUnit"
            placeholder="Chọn đơn vị / trạm"
            class="w-48"
          >
            <el-option label="Tất cả đơn vị" value="all" />
            <el-option label="Khu vực Cầu Giấy" value="caugiay" />
            <el-option label="Khu vực Ba Đình" value="badinh" />
            <el-option label="Khu vực Đống Đa" value="dongda" />
          </el-select>

          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            class="w-64"
          />

          <el-button type="primary"> Lọc dữ liệu </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="24" justify="space-around">
      <re-col
        v-for="(item, index) in chartData"
        :key="index"
        v-motion
        class="mb-4.5"
        :value="6"
        :md="12"
        :sm="12"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 80 * (index + 1) } }"
      >
        <el-card class="line-card" shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">
              {{ item.name }}
            </span>
            <div
              class="size-8 flex-c rounded-md"
              :style="{
                backgroundColor: isDark ? 'transparent' : item.bgColor
              }"
            >
              <IconifyIconOffline
                :icon="item.icon"
                :color="item.color"
                width="18"
                height="18"
              />
            </div>
          </div>
          <div class="flex justify-between items-start mt-3">
            <div class="w-1/2">
              <ReNormalCountTo
                :duration="item.duration"
                :fontSize="'1.6em'"
                :startVal="0"
                :endVal="item.value"
              />
              <p class="font-medium text-green-500">{{ item.percent }}</p>
            </div>
            <ChartLine
              v-if="item.data.length > 1"
              class="w-1/2!"
              :color="item.color"
              :data="item.data"
            />
            <ChartRound v-else class="w-1/2!" />
          </div>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-4.5"
        :value="18"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
      >
        <el-card class="bar-card" shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium"
              >Biểu đồ Sản lượng theo ngày (m³)</span
            >
            <Segmented v-model="curWeek" :options="optionsBasis" />
          </div>
          <div class="flex justify-between items-start mt-3">
            <ChartBar
              :requireData="barChartData[curWeek].requireData"
              :questionData="barChartData[curWeek].questionData"
            />
          </div>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-4.5"
        :value="6"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 480 } }"
      >
        <el-card shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">Tỷ lệ thu thập dữ liệu</span>
          </div>
          <div
            v-for="(item, index) in progressData"
            :key="index"
            :class="[
              'flex',
              'justify-between',
              'items-start',
              index === 0 ? 'mt-8' : 'mt-[2.15rem]'
            ]"
          >
            <el-progress
              :text-inside="true"
              :percentage="item.percentage"
              :stroke-width="21"
              :color="item.color"
              striped
              striped-flow
              :duration="item.duration"
            />
            <span class="text-nowrap ml-2 text-text_color_regular text-sm">
              {{ item.week }}
            </span>
          </div>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-4.5"
        :value="18"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 560 } }"
      >
        <el-card shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">Thống kê Dữ liệu Thiết bị</span>
          </div>
          <el-scrollbar max-height="504" class="mt-3">
            <WelcomeTable />
          </el-scrollbar>
        </el-card>
      </re-col>

      <re-col
        v-motion
        class="mb-4.5"
        :value="6"
        :xs="24"
        :initial="{ opacity: 0, y: 100 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 640 } }"
      >
        <el-card shadow="never">
          <div class="flex justify-between">
            <span class="text-md font-medium">Nhật ký Hệ thống</span>
          </div>
          <el-scrollbar max-height="504" class="mt-3">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in latestNewsData"
                :key="index"
                center
                placement="top"
                :icon="
                  markRaw(
                    useRenderFlicker({
                      background: randomGradient({
                        randomizeHue: true
                      })
                    })
                  )
                "
                :timestamp="item.date"
              >
                <p class="text-text_color_regular text-sm">
                  {{
                    `Phát hiện ${item.questionNumber || item.requiredNumber} cảnh báo, đã xử lý ${item.resolveNumber}`
                  }}
                </p>
              </el-timeline-item>
            </el-timeline>
          </el-scrollbar>
        </el-card>
      </re-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-card) {
  --el-card-border-color: none;

  /* Chiều rộng thanh tiến độ */
  .el-progress--line {
    width: 85%;
  }

  /* Cỡ chữ trong thanh tiến độ */
  .el-progress-bar__innerText {
    font-size: 15px;
  }

  /* Ẩn thanh cuộn mặc định */
  .el-scrollbar__bar {
    display: none;
  }

  /* Căn lề cho dòng thời gian */
  .el-timeline-item {
    margin: 0 6px;
  }
}

:deep(.el-timeline.is-start) {
  padding-left: 0;
}

.main-content {
  margin: 20px 20px 0 !important;
}
</style>
