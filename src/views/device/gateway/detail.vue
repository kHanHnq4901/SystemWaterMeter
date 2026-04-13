<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";

defineOptions({ name: "DeviceGatewayDetail" });

const router = useRouter();
const route = useRoute();
const loading = ref(false);

const gatewayId = computed(() => Number(route.params.id));

const gatewayData = ref({
  id: 1,
  code: "GW-CG-01",
  name: "Gateway Cầu Giấy 01",
  clusterId: 1,
  clusterName: "Cụm A1",
  zoneId: 1,
  zoneName: "Khu vực Bến Nghé A",
  wardId: 1,
  wardName: "Phường Bến Nghé",
  districtId: 1,
  districtName: "Quận 1",
  provinceId: 1,
  provinceName: "TP. Hồ Chí Minh",
  ip: "192.168.1.101",
  mac: "00:1B:44:11:3A:B7",
  status: "online",
  signal: -65,
  firmware: "v4.2.1",
  lastUpdate: "09/04/2026 08:15:00",
  uptime: "45 ngày 12 giờ",
  totalMeters: 65,
  activeMeters: 63,
  inactiveMeters: 2,
  totalConsumption: 12500,
  monthlyConsumption: 980,
  manufacturer: "Công ty ABC",
  model: "GW-01",
  installDate: "2024-02-01"
});

const meters = ref([
  {
    id: 1,
    code: "MTR-001",
    serial: "WM01-2024-001",
    customer: "Nguyễn Văn A",
    address: "123 Lê Lợi",
    reading: 1250.5,
    consumption: 32.7,
    status: "active",
    battery: 98,
    signal: 95,
    lastRead: "09/04/2026 08:15"
  },
  {
    id: 2,
    code: "MTR-002",
    serial: "WM01-2024-002",
    customer: "Trần Thị B",
    address: "456 Nguyễn Huệ",
    reading: 890.3,
    consumption: 21.9,
    status: "active",
    battery: 95,
    signal: 88,
    lastRead: "09/04/2026 08:12"
  },
  {
    id: 3,
    code: "MTR-003",
    serial: "WM01-2024-003",
    customer: "Lê Văn C",
    address: "789 Pasteur",
    reading: 567.2,
    consumption: 15.4,
    status: "active",
    battery: 92,
    signal: 82,
    lastRead: "09/04/2026 08:10"
  },
  {
    id: 4,
    code: "MTR-004",
    serial: "WM01-2024-004",
    customer: "Phạm Thị D",
    address: "321 Đông Kinh",
    reading: 1890.0,
    consumption: 28.6,
    status: "active",
    battery: 88,
    signal: 90,
    lastRead: "09/04/2026 08:08"
  },
  {
    id: 5,
    code: "MTR-005",
    serial: "WM01-2024-005",
    customer: "Hoàng Văn E",
    address: "555 Lê Hồng Phong",
    reading: 2345.6,
    consumption: 35.2,
    status: "active",
    battery: 75,
    signal: 78,
    lastRead: "09/04/2026 08:05"
  },
  {
    id: 6,
    code: "MTR-006",
    serial: "WM01-2024-006",
    customer: "Vũ Thị F",
    address: "777 Nguyễn Văn Linh",
    reading: 1234.5,
    consumption: 22.1,
    status: "active",
    battery: 65,
    signal: 70,
    lastRead: "09/04/2026 08:02"
  },
  {
    id: 7,
    code: "MTR-007",
    serial: "WM01A-2024-001",
    customer: "Đặng Văn G",
    address: "888 Lê Văn Việt",
    reading: 0,
    consumption: 0,
    status: "inactive",
    battery: 15,
    signal: 25,
    lastRead: "05/04/2026 14:00"
  }
]);

onMounted(() => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
});

const navigateToMeter = (meterId: number) => {
  router.push(`/device/meter/${meterId}`);
};
</script>

<template>
  <div class="p-4">
    <el-breadcrumb separator="/" class="mb-4">
      <el-breadcrumb-item :to="{ path: '/device/province' }"
        >Tỉnh/TP</el-breadcrumb-item
      >
      <el-breadcrumb-item :to="{ path: '/device/district' }"
        >Quận/Huyện</el-breadcrumb-item
      >
      <el-breadcrumb-item :to="{ path: '/device/ward' }"
        >Phường/Xã</el-breadcrumb-item
      >
      <el-breadcrumb-item :to="{ path: '/device/zone' }"
        >Khu vực</el-breadcrumb-item
      >
      <el-breadcrumb-item :to="{ path: '/device/cluster' }"
        >Cụm</el-breadcrumb-item
      >
      <el-breadcrumb-item>{{ gatewayData.code }}</el-breadcrumb-item>
    </el-breadcrumb>

    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium"
            >Thông tin Gateway - {{ gatewayData.code }}</span
          >
          <div>
            <el-button type="primary" size="small">Cấu hình</el-button>
            <el-button type="success" size="small">Khởi động lại</el-button>
            <el-button type="danger" size="small">Xóa</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="Mã">{{
          gatewayData.code
        }}</el-descriptions-item>
        <el-descriptions-item label="Tên">{{
          gatewayData.name
        }}</el-descriptions-item>
        <el-descriptions-item label="Cụm">{{
          gatewayData.clusterName
        }}</el-descriptions-item>
        <el-descriptions-item label="Khu vực">{{
          gatewayData.zoneName
        }}</el-descriptions-item>
        <el-descriptions-item label="Phường/Xã">{{
          gatewayData.wardName
        }}</el-descriptions-item>
        <el-descriptions-item label="Quận/Huyện">{{
          gatewayData.districtName
        }}</el-descriptions-item>
        <el-descriptions-item label="Tỉnh/TP">{{
          gatewayData.provinceName
        }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{
          gatewayData.ip
        }}</el-descriptions-item>
        <el-descriptions-item label="MAC">{{
          gatewayData.mac
        }}</el-descriptions-item>
        <el-descriptions-item label="Model">{{
          gatewayData.model
        }}</el-descriptions-item>
        <el-descriptions-item label="Hãng">{{
          gatewayData.manufacturer
        }}</el-descriptions-item>
        <el-descriptions-item label="Ngày lắp đặt">{{
          gatewayData.installDate
        }}</el-descriptions-item>
        <el-descriptions-item label="Firmware">{{
          gatewayData.firmware
        }}</el-descriptions-item>
        <el-descriptions-item label="Uptime">{{
          gatewayData.uptime
        }}</el-descriptions-item>
        <el-descriptions-item label="Trạng thái">
          <el-tag
            :type="gatewayData.status === 'online' ? 'success' : 'danger'"
            size="small"
          >
            {{ gatewayData.status === "online" ? "Online" : "Offline" }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Tín hiệu"
            :value="gatewayData.signal"
            suffix="dBm"
          >
            <template #suffix>
              <span
                :class="
                  gatewayData.signal > -70
                    ? 'text-green-500 ml-1'
                    : gatewayData.signal > -80
                      ? 'text-yellow-500 ml-1'
                      : 'text-red-500 ml-1'
                "
              >
                {{
                  gatewayData.signal > -70
                    ? "Tốt"
                    : gatewayData.signal > -80
                      ? "Yếu"
                      : "Kém"
                }}
              </span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Tổng Đồng hồ" :value="gatewayData.totalMeters" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Đang hoạt động"
            :value="gatewayData.activeMeters"
          >
            <template #suffix
              ><span class="text-green-500 ml-1"
                >({{
                  Math.round(
                    (gatewayData.activeMeters / gatewayData.totalMeters) * 100
                  )
                }}%)</span
              ></template
            >
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Cập nhật lần cuối">{{
            gatewayData.lastUpdate
          }}</el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <span class="font-medium"
          >Danh sách Đồng hồ ({{ gatewayData.totalMeters }})</span
        >
      </template>
      <el-table :data="meters" stripe border>
        <el-table-column prop="code" label="Mã ĐH" width="90" />
        <el-table-column prop="serial" label="Serial" min-width="130" />
        <el-table-column prop="customer" label="Khách hàng" min-width="120" />
        <el-table-column prop="address" label="Địa chỉ" min-width="150" />
        <el-table-column
          prop="reading"
          label="Chỉ số"
          width="90"
          align="right"
        />
        <el-table-column
          prop="consumption"
          label="Tiêu thụ"
          width="90"
          align="right"
        />
        <el-table-column prop="battery" label="Pin" width="70" align="center">
          <template #default="{ row }">
            <span
              :class="
                row.battery < 30
                  ? 'text-red-500'
                  : row.battery < 50
                    ? 'text-yellow-500'
                    : 'text-green-500'
              "
              >{{ row.battery }}%</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="signal"
          label="Tín hiệu"
          width="70"
          align="center"
        >
          <template #default="{ row }">
            <span
              :class="
                row.signal < 40
                  ? 'text-red-500'
                  : row.signal < 60
                    ? 'text-yellow-500'
                    : 'text-green-500'
              "
              >{{ row.signal }}%</span
            >
          </template>
        </el-table-column>
        <el-table-column prop="lastRead" label="Đọc lần cuối" width="140" />
        <el-table-column
          prop="status"
          label="Trạng thái"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
              >{{ row.status === "active" ? "Hoạt động" : "Ngừng" }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="navigateToMeter(row.id)"
              >Chi tiết</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
