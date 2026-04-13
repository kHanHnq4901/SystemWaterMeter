<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "DeviceMeterDetail" });

const route = useRoute();
const loading = ref(false);
const notFound = ref(false);

const allMeters = ref([
  {
    id: 1,
    code: "MTR-001",
    serial: "WM01-2024-001",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-01-15",
    installDate: "2024-02-01",
    gateway: "GW-CG-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "Khu vực Bến Nghé A",
    cluster: "Cụm A1",
    address: "123 Lê Lợi, P. Bến Nghé, Q.1",
    customer: "Nguyễn Văn A",
    customerPhone: "0912345678",
    status: "active",
    battery: 98,
    signalStrength: 95,
    lastReading: 1250.5,
    lastReadTime: "09/04/2026 08:15:00",
    totalConsumption: 1250.5,
    monthlyConsumption: 32.7,
    avgDailyConsumption: 1.09,
    pressure: 3.2,
    temperature: 28.5,
    flowRate: 0.85
  },
  {
    id: 2,
    code: "MTR-002",
    serial: "WM01-2024-002",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-01-20",
    installDate: "2024-02-05",
    gateway: "GW-CG-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "Khu vực Bến Nghé A",
    cluster: "Cụm A1",
    address: "456 Nguyễn Huệ, P. Bến Nghé, Q.1",
    customer: "Trần Thị B",
    customerPhone: "0912345679",
    status: "active",
    battery: 95,
    signalStrength: 88,
    lastReading: 890.3,
    lastReadTime: "09/04/2026 08:10:00",
    totalConsumption: 890.3,
    monthlyConsumption: 21.9,
    avgDailyConsumption: 0.73,
    pressure: 3.0,
    temperature: 28.2,
    flowRate: 0.45
  },
  {
    id: 3,
    code: "MTR-003",
    serial: "WM01A-2024-001",
    model: "WM-01A",
    manufacturer: "Công ty XYZ",
    manufactureDate: "2023-12-10",
    installDate: "2024-01-15",
    gateway: "GW-CG-02",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "Khu vực Bến Nghé A",
    cluster: "Cụm A2",
    address: "789 Pasteur, P. Bến Nghé, Q.1",
    customer: "Lê Văn C",
    customerPhone: "0912345680",
    status: "inactive",
    battery: 15,
    signalStrength: 25,
    lastReading: 2105.8,
    lastReadTime: "05/04/2026 14:00:00",
    totalConsumption: 2105.8,
    monthlyConsumption: 0,
    avgDailyConsumption: 0,
    pressure: 2.8,
    temperature: 27.8,
    flowRate: 0
  },
  {
    id: 4,
    code: "MTR-004",
    serial: "WM02-2024-001",
    model: "WM-02",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-02-01",
    installDate: "2024-02-20",
    gateway: "GW-BD-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Thành",
    zone: "Khu vực Chợ Bến Thành",
    cluster: "Cụm C1",
    address: "321 Chợ Bến Thành, P. Bến Thành, Q.1",
    customer: "Phạm Thị D",
    customerPhone: "0912345681",
    status: "active",
    battery: 92,
    signalStrength: 82,
    lastReading: 567.2,
    lastReadTime: "09/04/2026 07:55:00",
    totalConsumption: 567.2,
    monthlyConsumption: 15.4,
    avgDailyConsumption: 0.51,
    pressure: 3.1,
    temperature: 28.0,
    flowRate: 0.32
  },
  {
    id: 5,
    code: "MTR-005",
    serial: "WM01-2024-010",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-01-25",
    installDate: "2024-02-10",
    gateway: "GW-BD-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Thành",
    zone: "Khu vực Chợ Bến Thành",
    cluster: "Cụm C1",
    address: "555 Lê Hồng Phong, P. Bến Thành, Q.1",
    customer: "Hoàng Văn E",
    customerPhone: "0912345682",
    status: "active",
    battery: 88,
    signalStrength: 90,
    lastReading: 1890.0,
    lastReadTime: "09/04/2026 08:20:00",
    totalConsumption: 1890.0,
    monthlyConsumption: 28.6,
    avgDailyConsumption: 0.95,
    pressure: 3.3,
    temperature: 28.6,
    flowRate: 0.68
  },
  {
    id: 6,
    code: "MTR-006",
    serial: "WM01-2024-015",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-02-05",
    installDate: "2024-02-25",
    gateway: "GW-DD-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 5",
    ward: "Phường 11",
    zone: "Khu vực Nguyễn Văn Linh",
    cluster: "Cụm N1",
    address: "777 Nguyễn Văn Linh, P.11, Q.5",
    customer: "Vũ Thị F",
    customerPhone: "0912345683",
    status: "active",
    battery: 75,
    signalStrength: 78,
    lastReading: 2345.6,
    lastReadTime: "09/04/2026 08:05:00",
    totalConsumption: 2345.6,
    monthlyConsumption: 35.2,
    avgDailyConsumption: 1.17,
    pressure: 3.2,
    temperature: 29.0,
    flowRate: 0.92
  },
  {
    id: 7,
    code: "MTR-007",
    serial: "WM01-2024-020",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-02-10",
    installDate: "2024-03-01",
    gateway: "GW-DD-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 5",
    ward: "Phường 11",
    zone: "Khu vực Nguyễn Văn Linh",
    cluster: "Cụm N1",
    address: "888 Nguyễn Văn Linh, P.11, Q.5",
    customer: "Đặng Văn G",
    customerPhone: "0912345684",
    status: "active",
    battery: 65,
    signalStrength: 70,
    lastReading: 1234.5,
    lastReadTime: "09/04/2026 07:45:00",
    totalConsumption: 1234.5,
    monthlyConsumption: 22.1,
    avgDailyConsumption: 0.74,
    pressure: 2.9,
    temperature: 28.4,
    flowRate: 0.48
  },
  {
    id: 8,
    code: "MTR-008",
    serial: "WM01A-2024-005",
    model: "WM-01A",
    manufacturer: "Công ty XYZ",
    manufactureDate: "2023-12-15",
    installDate: "2024-01-20",
    gateway: "GW-HK-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Thành",
    zone: "Khu vực Chợ Bến Thành",
    cluster: "Cụm C2",
    address: "999 Lý Thường Kiệt, P.9, Q.10",
    customer: "Bùi Thị H",
    customerPhone: "0912345685",
    status: "active",
    battery: 55,
    signalStrength: 62,
    lastReading: 987.6,
    lastReadTime: "09/04/2026 07:30:00",
    totalConsumption: 987.6,
    monthlyConsumption: 18.9,
    avgDailyConsumption: 0.63,
    pressure: 3.0,
    temperature: 28.1,
    flowRate: 0.38
  },
  {
    id: 9,
    code: "MTR-009",
    serial: "WM02-2024-003",
    model: "WM-02",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-02-20",
    installDate: "2024-03-10",
    gateway: "GW-BT-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 3",
    ward: "Phường 8",
    zone: "Khu vực Phường 8 - Nam",
    cluster: "Cụm A3",
    address: "111 Xô Viết Nghệ Tĩnh, P.21, Q.BT",
    customer: "Nguyễn Thị I",
    customerPhone: "0912345686",
    status: "active",
    battery: 82,
    signalStrength: 85,
    lastReading: 1567.8,
    lastReadTime: "09/04/2026 08:00:00",
    totalConsumption: 1567.8,
    monthlyConsumption: 25.3,
    avgDailyConsumption: 0.84,
    pressure: 3.1,
    temperature: 28.3,
    flowRate: 0.55
  },
  {
    id: 10,
    code: "MTR-010",
    serial: "WM01-2024-025",
    model: "WM-01",
    manufacturer: "Công ty ABC",
    manufactureDate: "2024-02-25",
    installDate: "2024-03-15",
    gateway: "GW-GV-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 7",
    ward: "Phường Tân Phú",
    zone: "Khu vực Tân Phú - Tây",
    cluster: "Cụm C3",
    address: "222 Phan Văn Trị, P.10, Q.GV",
    customer: "Trần Văn K",
    customerPhone: "0912345687",
    status: "active",
    battery: 91,
    signalStrength: 88,
    lastReading: 678.9,
    lastReadTime: "09/04/2026 07:50:00",
    totalConsumption: 678.9,
    monthlyConsumption: 12.7,
    avgDailyConsumption: 0.42,
    pressure: 3.0,
    temperature: 27.9,
    flowRate: 0.28
  }
]);

const meterId = computed(() => Number(route.params.id));

const meterDetail = computed(() => {
  return allMeters.value.find(m => m.id === meterId.value) || null;
});

const readingHistory = computed(() => {
  const baseReadings = [
    1250.5, 1217.8, 1189.4, 1154.2, 1124.1, 1094.3, 1062.8, 1033.9, 1000.7,
    973.1
  ];
  const meter = meterDetail.value;
  if (!meter) return [];

  const multiplier = meter.lastReading / 1250.5;
  return [
    {
      date: "09/04/2026",
      reading: meter.lastReading,
      consumption: meter.monthlyConsumption
    },
    {
      date: "08/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 0.35).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.35).toFixed(1)
    },
    {
      date: "07/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 0.67).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.32).toFixed(1)
    },
    {
      date: "06/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.33).toFixed(1)
    },
    {
      date: "05/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 1.33).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.33).toFixed(1)
    },
    {
      date: "04/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 1.67).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.34).toFixed(1)
    },
    {
      date: "03/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 2.0).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.33).toFixed(1)
    },
    {
      date: "02/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 2.33).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.33).toFixed(1)
    },
    {
      date: "01/04/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 2.67).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.34).toFixed(1)
    },
    {
      date: "31/03/2026",
      reading: (meter.lastReading - meter.monthlyConsumption * 3.0).toFixed(1),
      consumption: (meter.monthlyConsumption * 0.33).toFixed(1)
    }
  ];
});

const alertHistory = computed(() => {
  const allAlerts = {
    1: [
      {
        id: 1,
        time: "08/04/2026 14:30",
        type: "warning",
        title: "Tiêu thụ cao",
        desc: "Tiêu thụ cao hơn bình thường 20%",
        status: "resolved"
      },
      {
        id: 2,
        time: "25/03/2026 09:15",
        type: "info",
        title: "Cập nhật firmware",
        desc: "Đồng hồ cập nhật firmware thành công",
        status: "resolved"
      },
      {
        id: 3,
        time: "15/03/2026 22:45",
        type: "warning",
        title: "Pin yếu",
        desc: "Pin dưới 30%",
        status: "resolved"
      }
    ],
    2: [
      {
        id: 1,
        time: "07/04/2026 10:00",
        type: "info",
        title: "Đọc chỉ số thành công",
        desc: "Đồng hồ gửi dữ liệu thành công",
        status: "resolved"
      }
    ],
    3: [
      {
        id: 1,
        time: "05/04/2026 14:00",
        type: "danger",
        title: "Mất kết nối",
        desc: "Đồng hồ mất kết nối với gateway",
        status: "resolved"
      },
      {
        id: 2,
        time: "01/04/2026 08:30",
        type: "warning",
        title: "Pin yếu",
        desc: "Pin dưới 20%",
        status: "resolved"
      }
    ],
    4: [
      {
        id: 1,
        time: "08/04/2026 16:00",
        type: "info",
        title: "Đọc chỉ số thành công",
        desc: "Đồng hồ gửi dữ liệu thành công",
        status: "resolved"
      }
    ],
    5: [
      {
        id: 1,
        time: "06/04/2026 11:00",
        type: "warning",
        title: "Tiêu thụ cao",
        desc: "Tiêu thụ cao hơn bình thường 15%",
        status: "resolved"
      }
    ],
    6: [
      {
        id: 1,
        time: "07/04/2026 09:30",
        type: "info",
        title: "Đọc chỉ số thành công",
        desc: "Đồng hồ gửi dữ liệu thành công",
        status: "resolved"
      }
    ],
    7: [
      {
        id: 1,
        time: "05/04/2026 14:15",
        type: "warning",
        title: "Pin yếu",
        desc: "Pin dưới 70%",
        status: "warning"
      }
    ],
    8: [
      {
        id: 1,
        time: "04/04/2026 10:00",
        type: "warning",
        title: "Tín hiệu yếu",
        desc: "Tín hiệu dưới 70%",
        status: "resolved"
      }
    ],
    9: [
      {
        id: 1,
        time: "08/04/2026 15:00",
        type: "info",
        title: "Đọc chỉ số thành công",
        desc: "Đồng hồ gửi dữ liệu thành công",
        status: "resolved"
      }
    ],
    10: [
      {
        id: 1,
        time: "07/04/2026 12:00",
        type: "info",
        title: "Đọc chỉ số thành công",
        desc: "Đồng hồ gửi dữ liệu thành công",
        status: "resolved"
      }
    ]
  };
  return allAlerts[meterId.value] || [];
});

onMounted(() => {
  loading.value = true;
  setTimeout(() => {
    if (!meterDetail.value) {
      notFound.value = true;
    }
    loading.value = false;
  }, 300);
});
</script>

<template>
  <div class="p-4">
    <el-skeleton :loading="loading" animated>
      <template #default>
        <div v-if="notFound">
          <el-result icon="warning" title="Không tìm thấy" sub-title="Đồng hồ nước không tồn tại hoặc đã bị xóa">
            <template #extra>
              <el-button type="primary" @click="$router.push('/device/meter')">Quay lại</el-button>
            </template>
          </el-result>
        </div>
        <template v-else>
          <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium"
            >Chi tiết Đồng hồ - {{ meterDetail.code }}</span
          >
          <div>
            <el-button type="primary" size="small">Sửa thông tin</el-button>
            <el-button type="success" size="small">Đọc chỉ số</el-button>
            <el-button type="danger" size="small">Xóa</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="Mã đồng hồ">{{
          meterDetail.code
        }}</el-descriptions-item>
        <el-descriptions-item label="Số serial">{{
          meterDetail.serial
        }}</el-descriptions-item>
        <el-descriptions-item label="Model">{{
          meterDetail.model
        }}</el-descriptions-item>
        <el-descriptions-item label="Hãng sản xuất">{{
          meterDetail.manufacturer
        }}</el-descriptions-item>
        <el-descriptions-item label="Ngày sản xuất">{{
          meterDetail.manufactureDate
        }}</el-descriptions-item>
        <el-descriptions-item label="Ngày lắp đặt">{{
          meterDetail.installDate
        }}</el-descriptions-item>
        <el-descriptions-item label="Gateway">{{
          meterDetail.gateway
        }}</el-descriptions-item>
        <el-descriptions-item label="Cụm">{{
          meterDetail.cluster
        }}</el-descriptions-item>
        <el-descriptions-item label="Khu vực">{{
          meterDetail.zone
        }}</el-descriptions-item>
        <el-descriptions-item label="Phường/Xã">{{
          meterDetail.ward
        }}</el-descriptions-item>
        <el-descriptions-item label="Quận/Huyện">{{
          meterDetail.district
        }}</el-descriptions-item>
        <el-descriptions-item label="Tỉnh/TP">{{
          meterDetail.province
        }}</el-descriptions-item>
        <el-descriptions-item label="Trạng thái">
          <el-tag
            :type="meterDetail.status === 'active' ? 'success' : 'danger'"
            size="small"
          >
            {{ meterDetail.status === "active" ? "Hoạt động" : "Ngừng" }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Pin" :value="meterDetail.battery" suffix="%">
            <template #suffix>
              <span
                :class="
                  meterDetail.battery < 20 ? 'text-red-500' : 'text-green-500'
                "
                >%</span
              >
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Tín hiệu"
            :value="meterDetail.signalStrength"
            suffix="%"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Áp suất"
            :value="meterDetail.pressure"
            suffix="bar"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Nhiệt độ"
            :value="meterDetail.temperature"
            suffix="°C"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header
            ><span class="font-medium">Thông tin khách hàng</span></template
          >
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Tên khách hàng">{{
              meterDetail.customer
            }}</el-descriptions-item>
            <el-descriptions-item label="Số điện thoại">{{
              meterDetail.customerPhone
            }}</el-descriptions-item>
            <el-descriptions-item label="Địa chỉ">{{
              meterDetail.address
            }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header
            ><span class="font-medium">Thông tin tiêu thụ</span></template
          >
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Chỉ số hiện tại"
              >{{ meterDetail.lastReading }} m³</el-descriptions-item
            >
            <el-descriptions-item label="Tổng tiêu thụ"
              >{{ meterDetail.totalConsumption }} m³</el-descriptions-item
            >
            <el-descriptions-item label="Tiêu thụ tháng"
              >{{ meterDetail.monthlyConsumption }} m³</el-descriptions-item
            >
            <el-descriptions-item label="TB/ngày"
              >{{ meterDetail.avgDailyConsumption }} m³</el-descriptions-item
            >
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header
            ><span class="font-medium">Thông tin hoạt động</span></template
          >
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Đọc lần cuối">{{
              meterDetail.lastReadTime
            }}</el-descriptions-item>
            <el-descriptions-item label="Lưu lượng"
              >{{ meterDetail.flowRate }} l/phút</el-descriptions-item
            >
            <el-descriptions-item label="Trạng thái"
              >Bình thường</el-descriptions-item
            >
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mb-4">
      <template #header
        ><span class="font-medium"
          >Lịch sử đọc chỉ số (10 ngày gần nhất)</span
        ></template
      >
      <el-table :data="readingHistory" stripe border>
        <el-table-column prop="date" label="Ngày" width="120" />
        <el-table-column
          prop="reading"
          label="Chỉ số (m³)"
          width="120"
          align="right"
        />
        <el-table-column
          prop="consumption"
          label="Tiêu thụ (m³)"
          width="130"
          align="right"
        />
        <el-table-column label="Trạng thái" width="120" align="center">
          <template #default>
            <el-tag type="success" size="small">Thành công</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header
        ><span class="font-medium">Lịch sử cảnh báo</span></template
      >
      <el-table :data="alertHistory" stripe border>
        <el-table-column prop="time" label="Thời gian" width="160" />
        <el-table-column prop="type" label="Loại" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="
                row.type === 'danger'
                  ? 'danger'
                  : row.type === 'warning'
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{
                row.type === "danger"
                  ? "Nguy hiểm"
                  : row.type === "warning"
                    ? "Cảnh báo"
                    : "Thông tin"
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="Tiêu đề" width="150" />
        <el-table-column prop="desc" label="Mô tả" />
        <el-table-column
          prop="status"
          label="Trạng thái"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'resolved' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.status === "resolved" ? "Đã xử lý" : "Chờ xử lý" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
        </template>
    </el-skeleton>
  </div>
</template>
