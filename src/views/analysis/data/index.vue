<script setup lang="ts">
import { ref, reactive } from "vue";
import * as echarts from "echarts";

defineOptions({ name: "AnalysisData" });

const dateRange = ref("");
const selectedArea = ref("");
const loading = ref(false);

const filterForm = reactive({
  district: "",
  status: "",
  startDate: "",
  endDate: ""
});

const meterData = ref([
  {
    id: 1,
    code: "WM-000001",
    customer: "Nguyễn Văn A",
    address: "123 Lê Lợi, Q1",
    district: "Quận 1",
    lastReading: 1245.6,
    currentReading: 1278.3,
    consumption: 32.7,
    updateTime: "09/04/2026 08:15",
    status: 1
  },
  {
    id: 2,
    code: "WM-000002",
    customer: "Trần Thị B",
    address: "456 Nguyễn Trãi, Q3",
    district: "Quận 3",
    lastReading: 876.3,
    currentReading: 898.2,
    consumption: 21.9,
    updateTime: "09/04/2026 08:17",
    status: 1
  },
  {
    id: 3,
    code: "WM-000003",
    customer: "Lê Văn C",
    address: "789 30/4, Q5",
    district: "Quận 5",
    lastReading: 2341.2,
    currentReading: 2379.8,
    consumption: 38.6,
    updateTime: "09/04/2026 08:20",
    status: 1
  },
  {
    id: 4,
    code: "WM-000004",
    customer: "Phạm Thị D",
    address: "321 NVL, Q7",
    district: "Quận 7",
    lastReading: 567.8,
    currentReading: 576.4,
    consumption: 8.6,
    updateTime: "09/04/2026 08:22",
    status: 0
  },
  {
    id: 5,
    code: "WM-000005",
    customer: "Hoàng Văn E",
    address: "654 CM8, Q10",
    district: "Quận 10",
    lastReading: 1567.4,
    currentReading: 1598.7,
    consumption: 31.3,
    updateTime: "09/04/2026 08:25",
    status: 1
  },
  {
    id: 6,
    code: "WM-000006",
    customer: "Vũ Thị F",
    address: "987 XVN, BT",
    district: "Bình Thạnh",
    lastReading: 987.5,
    currentReading: 1012.3,
    consumption: 24.8,
    updateTime: "09/04/2026 08:28",
    status: 1
  },
  {
    id: 7,
    code: "WM-000007",
    customer: "Đặng Văn G",
    address: "147 NK, GV",
    district: "Gò Vấp",
    lastReading: 734.2,
    currentReading: 765.9,
    consumption: 31.7,
    updateTime: "09/04/2026 08:30",
    status: 1
  },
  {
    id: 8,
    code: "WM-000008",
    customer: "Bùi Thị H",
    address: "258 HVT, PN",
    district: "Phú Nhuận",
    lastReading: 1123.7,
    currentReading: 1189.4,
    consumption: 65.7,
    updateTime: "09/04/2026 08:32",
    status: 1
  },
  {
    id: 9,
    code: "WM-000009",
    customer: "Nguyễn Thị I",
    address: "369 LĐ, Q1",
    district: "Quận 1",
    lastReading: 543.2,
    currentReading: 558.6,
    consumption: 15.4,
    updateTime: "09/04/2026 08:35",
    status: 1
  },
  {
    id: 10,
    code: "WM-000010",
    customer: "Trần Văn K",
    address: "741 QĐ, Q3",
    district: "Quận 3",
    lastReading: 2341.8,
    currentReading: 2387.0,
    consumption: 45.2,
    updateTime: "09/04/2026 08:38",
    status: 1
  }
]);

const districts = [
  { label: "Tất cả quận", value: "" },
  { label: "Quận 1", value: "Q1" },
  { label: "Quận 3", value: "Q3" },
  { label: "Quận 5", value: "Q5" },
  { label: "Quận 7", value: "Q7" },
  { label: "Quận 10", value: "Q10" }
];

const initChart = () => {
  const chartDom = document.getElementById("dataChart");
  if (!chartDom) return;
  const chart = echarts.init(chartDom);
  chart.setOption({
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: ["0h", "4h", "8h", "12h", "16h", "20h", "24h"]
    },
    yAxis: { type: "value", name: "m³" },
    series: [
      {
        type: "line",
        smooth: true,
        data: [850, 620, 1450, 1980, 2340, 1670, 1120],
        areaStyle: {}
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
        <el-form-item label="Quận/Huyện">
          <el-select
            v-model="filterForm.district"
            placeholder="Chọn quận"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="d in districts"
              :key="d.value"
              :label="d.label"
              :value="d.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-select
            v-model="filterForm.status"
            placeholder="Chọn"
            clearable
            style="width: 140px"
          >
            <el-option label="Hoạt động" :value="1" />
            <el-option label="Ngừng hoạt động" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="Từ ngày">
          <el-date-picker
            v-model="filterForm.startDate"
            type="date"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="Đến ngày">
          <el-date-picker
            v-model="filterForm.endDate"
            type="date"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary">Tìm kiếm</el-button>
          <el-button>Đặt lại</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Tổng số đồng hồ" :value="9876" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Đã đọc chỉ số" :value="9654" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Chưa đọc chỉ số" :value="222" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Tỷ lệ đọc thành công" :value="97.8" suffix="%" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium">Biểu đồ tiêu thụ trong ngày</span>
          <el-button type="success" size="small">Xuất Excel</el-button>
        </div>
      </template>
      <div id="dataChart" style="height: 280px"></div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span class="text-lg font-medium">Dữ liệu Đồng hồ Nước</span>
      </template>
      <el-table :data="meterData" stripe border style="width: 100%">
        <el-table-column prop="code" label="Mã ĐH" width="100" fixed />
        <el-table-column prop="customer" label="Khách hàng" min-width="140" />
        <el-table-column prop="district" label="Quận" width="90" />
        <el-table-column prop="address" label="Địa chỉ" min-width="180" />
        <el-table-column
          prop="lastReading"
          label="Chỉ số cũ (m³)"
          width="110"
          align="right"
        />
        <el-table-column
          prop="currentReading"
          label="Chỉ số mới (m³)"
          width="110"
          align="right"
        />
        <el-table-column
          prop="consumption"
          label="Tiêu thụ (m³)"
          width="100"
          align="right"
        >
          <template #default="{ row }">
            <span
              :class="row.consumption > 50 ? 'text-red-600 font-medium' : ''"
              >{{ row.consumption }}</span
            >
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="Cập nhật" width="140" />
        <el-table-column
          prop="status"
          label="Trạng thái"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 1 ? "Đã đọc" : "Chưa đọc" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="mt-4 justify-end"
        :page-size="10"
        :total="50"
        layout="total, prev, pager, next"
      />
    </el-card>
  </div>
</template>
