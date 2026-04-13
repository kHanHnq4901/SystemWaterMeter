<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getGateways,
  getGatewayStats,
  getProvinces,
  getDistricts,
  getWards,
  getZones,
  getClusters
} from "@/api/waterMeter";

defineOptions({ name: "DeviceGateway" });

const router = useRouter();
const loading = ref(false);

const filters = reactive({
  provinceId: "",
  districtId: "",
  wardId: "",
  zoneId: "",
  clusterId: "",
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

const dataList = ref<any[]>([]);
const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const fetchGateways = async () => {
  loading.value = true;
  try {
    const res = await getGateways({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      provinceId: filters.provinceId || undefined,
      districtId: filters.districtId || undefined,
      wardId: filters.wardId || undefined,
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
      gatewayCode: "GW001",
      gatewayName: "Gateway Q1",
      ipAddress: "192.168.1.100",
      port: 8080,
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      wardName: "Phường Bến Nghé",
      signalStrength: -55,
      status: 1,
      lastOnline: "2026-04-10 15:30",
      meterCount: 45
    },
    {
      id: 2,
      gatewayCode: "GW002",
      gatewayName: "Gateway Q3",
      ipAddress: "192.168.1.101",
      port: 8080,
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 3",
      wardName: "Phường 8",
      signalStrength: -65,
      status: 1,
      lastOnline: "2026-04-10 15:28",
      meterCount: 52
    },
    {
      id: 3,
      gatewayCode: "GW003",
      gatewayName: "Gateway Q5",
      ipAddress: "192.168.1.102",
      port: 8080,
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 5",
      wardName: "Phường 11",
      signalStrength: -70,
      status: 1,
      lastOnline: "2026-04-10 15:25",
      meterCount: 38
    },
    {
      id: 4,
      gatewayCode: "GW004",
      gatewayName: "Gateway Q7",
      ipAddress: "192.168.1.103",
      port: 8080,
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 7",
      wardName: "Phường 15",
      signalStrength: -45,
      status: 0,
      lastOnline: "2026-04-09 08:15",
      meterCount: 42
    }
  ];
  pagination.total = 4;
};

const onSearch = () => {
  pagination.currentPage = 1;
  fetchGateways();
};

const resetForm = () => {
  filters.provinceId = "";
  filters.districtId = "";
  filters.wardId = "";
  filters.zoneId = "";
  filters.clusterId = "";
  filters.status = "";
  filters.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/gateway/${row.id}`);
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  fetchGateways();
};

const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  fetchGateways();
};

onMounted(() => {
  fetchOptions();
  fetchGateways();
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã GW", prop: "gatewayCode", width: 100, fixed: "left" },
  { label: "Tên GW", prop: "gatewayName", minWidth: 150 },
  { label: "Cụm", prop: "clusterName", width: 90 },
  { label: "Khu vực", prop: "zoneName", width: 130 },
  { label: "Phường", prop: "wardName", width: 110 },
  { label: "Quận", prop: "districtName", width: 80 },
  { label: "IP", prop: "ipAddress", width: 120 },
  { label: "ĐH", prop: "meterCount", width: 60, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Tín hiệu", prop: "signalStrength", width: 80, align: "center" },
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
          class="w-36!"
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
          class="w-36!"
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
          class="w-36!"
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
          class="w-36!"
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
          class="w-32!"
          :disabled="!filters.zoneId"
        >
          <el-option
            v-for="item in clusterOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="Trạng thái"
          clearable
          class="w-32!"
        >
          <el-option label="Online" value="online" />
          <el-option label="Offline" value="offline" />
        </el-select>
        <el-button type="primary" @click="onSearch">Lọc</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </div>
    </el-card>

    <PureTableBar
      title="Quản lý Gateway"
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
              :type="row.status === 'online' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === "online" ? "Online" : "Offline" }}
            </el-tag>
          </template>
          <template #signal="{ row }">
            <span
              :class="
                row.signal > -70
                  ? 'text-green-500'
                  : row.signal > -80
                    ? 'text-yellow-500'
                    : 'text-red-500'
              "
            >
              {{ row.signal }} dBm
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
