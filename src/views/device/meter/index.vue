<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getWaterMeterList,
  getWaterMeterStats,
  getProvinces,
  getDistricts,
  getWards,
  getZones,
  getClusters
} from "@/api/waterMeter";

defineOptions({ name: "DeviceMeter" });

const router = useRouter();
const loading = ref(false);

const filters = reactive({
  provinceId: "",
  districtId: "",
  wardId: "",
  zoneId: "",
  clusterId: "",
  gatewayId: "",
  status: "",
  code: ""
});

const provinceOptions = ref<any[]>([]);
const districtOptions = ref<any[]>([]);
const wardOptions = ref<any[]>([]);
const zoneOptions = ref<any[]>([]);
const clusterOptions = ref<any[]>([]);

const fetchOptions = () => {
  provinceOptions.value = [
    { label: "Tất cả Tỉnh/TP", value: "" },
    { label: "TP. Hồ Chí Minh", value: 1 },
    { label: "Tỉnh Đồng Nai", value: 2 }
  ];
  districtOptions.value = [
    { label: "Tất cả Quận/Huyện", value: "" },
    { label: "Quận 1", value: 1 },
    { label: "Quận 3", value: 2 },
    { label: "Quận 5", value: 3 }
  ];
  wardOptions.value = [
    { label: "Phường Bến Nghé", value: 1 },
    { label: "Phường Bến Thành", value: 2 }
  ];
  zoneOptions.value = [
    { label: "Khu vực A", value: 1 },
    { label: "Khu vực B", value: 2 }
  ];
  clusterOptions.value = [
    { label: "Cụm 1", value: 1 },
    { label: "Cụm 2", value: 2 }
  ];
};

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const fetchMeters = async () => {
  loading.value = true;
  try {
    const res = await getWaterMeterList({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      provinceId: filters.provinceId || undefined,
      districtId: filters.districtId || undefined,
      wardId: filters.wardId || undefined,
      zoneId: filters.zoneId || undefined,
      clusterId: filters.clusterId || undefined,
      status: filters.status || undefined,
      search: filters.code || undefined
    });

    if (res?.success) {
      const data = res.data;
      dataList.value = data.list || [];
      pagination.total = data.total || 0;
    } else {
      useMockData();
    }
  } catch (error) {
    useMockData();
  } finally {
    loading.value = false;
  }
};

const useMockData = () => {
  dataList.value = [
    {
      id: 1,
      meterCode: "MTR001",
      meterSerial: "SN12345",
      model: "Elster",
      customerName: "Nguyễn Văn A",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      wardName: "Phường Bến Nghé",
      latitude: 10.7769,
      longitude: 106.6989,
      lastReading: 125.5,
      status: 1
    },
    {
      id: 2,
      meterCode: "MTR002",
      meterSerial: "SN12346",
      model: "Itron",
      customerName: "Trần Thị B",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      wardName: "Phường Bến Nghé",
      latitude: 10.777,
      longitude: 106.699,
      lastReading: 89.2,
      status: 1
    },
    {
      id: 3,
      meterCode: "MTR003",
      meterSerial: "SN12347",
      model: "Sensus",
      customerName: "Lê Văn C",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      wardName: "Phường Bến Thành",
      latitude: 10.778,
      longitude: 106.7,
      lastReading: 234.8,
      status: 1
    },
    {
      id: 4,
      meterCode: "MTR004",
      meterSerial: "SN12348",
      model: "Elster",
      customerName: "Phạm Thị D",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 3",
      wardName: "Phường 8",
      latitude: 10.779,
      longitude: 106.701,
      lastReading: 567.2,
      status: 1
    },
    {
      id: 5,
      meterCode: "MTR005",
      meterSerial: "SN12349",
      model: "Itron",
      customerName: "Hoàng Văn E",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 5",
      wardName: "Phường 11",
      latitude: 10.78,
      longitude: 106.702,
      lastReading: 753.9,
      status: 0
    }
  ];
  pagination.total = 5;
};

const onSearch = () => {
  pagination.currentPage = 1;
  fetchMeters();
};

const resetForm = () => {
  filters.provinceId = "";
  filters.districtId = "";
  filters.wardId = "";
  filters.zoneId = "";
  filters.clusterId = "";
  filters.gatewayId = "";
  filters.status = "";
  filters.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/meter/${row.id}`);
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  fetchMeters();
};

const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  fetchMeters();
};

onMounted(() => {
  fetchOptions();
  fetchMeters();
});

const dataList = ref([
  {
    id: 1,
    code: "MTR-001",
    serial: "WM01-2024-001",
    model: "WM-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "KV Bến Nghé A",
    cluster: "Cụm A1",
    gateway: "GW-CG-01",
    customer: "Nguyễn Văn A",
    address: "123 Lê Lợi",
    reading: 1250.5,
    consumption: 32.7,
    status: "active",
    battery: 98,
    signal: 95
  },
  {
    id: 2,
    code: "MTR-002",
    serial: "WM01-2024-002",
    model: "WM-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "KV Bến Nghé A",
    cluster: "Cụm A1",
    gateway: "GW-CG-01",
    customer: "Trần Thị B",
    address: "456 Nguyễn Huệ",
    reading: 890.3,
    consumption: 21.9,
    status: "active",
    battery: 95,
    signal: 88
  },
  {
    id: 3,
    code: "MTR-003",
    serial: "WM01A-2024-001",
    model: "WM-01A",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    zone: "KV Bến Nghé A",
    cluster: "Cụm A2",
    gateway: "GW-CG-02",
    customer: "Lê Văn C",
    address: "789 Pasteur",
    reading: 2105.8,
    consumption: 0,
    status: "inactive",
    battery: 15,
    signal: 25
  },
  {
    id: 4,
    code: "MTR-004",
    serial: "WM02-2024-001",
    model: "WM-02",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Thành",
    zone: "KV Chợ Bến Thành",
    cluster: "Cụm C1",
    gateway: "GW-BD-01",
    customer: "Phạm Thị D",
    address: "321 Chợ Bến Thành",
    reading: 567.2,
    consumption: 15.4,
    status: "active",
    battery: 92,
    signal: 82
  },
  {
    id: 5,
    code: "MTR-005",
    serial: "WM01-2024-010",
    model: "WM-01",
    province: "TP. Hồ Chí Minh",
    district: "Quận 5",
    ward: "Phường 11",
    zone: "KV Nguyễn Văn Linh",
    cluster: "Cụm N1",
    gateway: "GW-DD-01",
    customer: "Hoàng Văn E",
    address: "555 Nguyễn Văn Linh",
    reading: 1890.0,
    consumption: 28.6,
    status: "active",
    battery: 88,
    signal: 90
  }
]);

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã ĐH", prop: "code", width: 90, fixed: "left" },
  { label: "Serial", prop: "serial", minWidth: 130 },
  { label: "Model", prop: "model", width: 70 },
  { label: "Cụm", prop: "cluster", width: 80 },
  { label: "Khu vực", prop: "zone", width: 120 },
  { label: "Phường", prop: "ward", width: 100 },
  { label: "Quận", prop: "district", width: 80 },
  { label: "Khách hàng", prop: "customer", minWidth: 110 },
  { label: "Chỉ số", prop: "reading", width: 80, align: "right" },
  { label: "Pin", prop: "battery", width: 60, align: "center" },
  { label: "Tín hiệu", prop: "signal", width: 60, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Thao tác", width: 120, fixed: "right", slot: "operation" }
];
</script>

<template>
  <div class="p-4">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <span class="font-medium">Lọc theo phân cấp đơn vị</span>
      </template>
      <div class="flex flex-wrap gap-3 items-center">
        <el-select
          v-model="filters.provinceId"
          placeholder="Tỉnh/TP"
          clearable
          class="w-32!"
          @change="filters.districtId = ''"
        >
          <el-option
            v-for="item in provinceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.districtId"
          placeholder="Quận/Huyện"
          clearable
          class="w-32!"
          :disabled="!filters.provinceId"
          @change="filters.wardId = ''"
        >
          <el-option
            v-for="item in districtOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.wardId"
          placeholder="Phường/Xã"
          clearable
          class="w-32!"
          :disabled="!filters.districtId"
          @change="filters.zoneId = ''"
        >
          <el-option
            v-for="item in wardOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.zoneId"
          placeholder="Khu vực"
          clearable
          class="w-32!"
          :disabled="!filters.wardId"
          @change="filters.clusterId = ''"
        >
          <el-option
            v-for="item in zoneOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.clusterId"
          placeholder="Cụm"
          clearable
          class="w-28!"
          :disabled="!filters.zoneId"
          @change="filters.gatewayId = ''"
        >
          <el-option
            v-for="item in clusterOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.gatewayId"
          placeholder="Gateway"
          clearable
          class="w-28!"
          :disabled="!filters.clusterId"
        >
          <el-option
            v-for="item in gatewayOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="Trạng thái"
          clearable
          class="w-28!"
        >
          <el-option label="Hoạt động" value="active" />
          <el-option label="Ngừng" value="inactive" />
        </el-select>
        <el-button type="primary" @click="onSearch">Lọc</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </div>
    </el-card>

    <PureTableBar
      title="Quản lý Đồng hồ Nước"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary">Thêm mới</el-button>
      </template>
      <template #default>
        <pure-table
          :loading="loading"
          :data="dataList"
          :columns="columns"
          :pagination="pagination"
          row-key="id"
        >
          <template #status="{ row }">
            <el-tag
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === "active" ? "Hoạt động" : "Ngừng" }}
            </el-tag>
          </template>
          <template #battery="{ row }">
            <span
              :class="
                row.battery < 30
                  ? 'text-red-500'
                  : row.battery < 50
                    ? 'text-yellow-500'
                    : 'text-green-500'
              "
            >
              {{ row.battery }}%
            </span>
          </template>
          <template #operation="{ row }">
            <el-button type="primary" link @click="handleView(row)"
              >Chi tiết</el-button
            >
            <el-button type="primary" link>Sửa</el-button>
            <el-button type="danger" link>Xóa</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
