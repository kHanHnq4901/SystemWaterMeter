<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "DeviceDistrict" });

const router = useRouter();
const loading = ref(false);

const form = reactive({
  provinceId: "",
  name: "",
  code: ""
});

const provinceOptions = ref([
  { label: "TP. Hồ Chí Minh", value: 1 },
  { label: "Tỉnh Đồng Nai", value: 2 },
  { label: "Tỉnh Bình Dương", value: 3 }
]);

const dataList = ref([
  {
    id: 1,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Quận 1",
    code: "Q1",
    wardCount: 10,
    zoneCount: 8,
    clusterCount: 25,
    gatewayCount: 85,
    meterCount: 5200,
    activeMeter: 5100,
    status: 1
  },
  {
    id: 2,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Quận 3",
    code: "Q3",
    wardCount: 12,
    zoneCount: 10,
    clusterCount: 32,
    gatewayCount: 95,
    meterCount: 6800,
    activeMeter: 6650,
    status: 1
  },
  {
    id: 3,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Quận 5",
    code: "Q5",
    wardCount: 14,
    zoneCount: 12,
    clusterCount: 38,
    gatewayCount: 110,
    meterCount: 7500,
    activeMeter: 7350,
    status: 1
  },
  {
    id: 4,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Quận 7",
    code: "Q7",
    wardCount: 10,
    zoneCount: 9,
    clusterCount: 28,
    gatewayCount: 92,
    meterCount: 6100,
    activeMeter: 5950,
    status: 1
  },
  {
    id: 5,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Quận 10",
    code: "Q10",
    wardCount: 15,
    zoneCount: 11,
    clusterCount: 35,
    gatewayCount: 105,
    meterCount: 7200,
    activeMeter: 7050,
    status: 1
  },
  {
    id: 6,
    provinceId: 1,
    provinceName: "TP. Hồ Chí Minh",
    name: "Bình Thạnh",
    code: "BT",
    wardCount: 21,
    zoneCount: 15,
    clusterCount: 45,
    gatewayCount: 130,
    meterCount: 9200,
    activeMeter: 9000,
    status: 1
  },
  {
    id: 7,
    provinceId: 2,
    provinceName: "Tỉnh Đồng Nai",
    name: "TP. Biên Hòa",
    code: "BH",
    wardCount: 30,
    zoneCount: 20,
    clusterCount: 60,
    gatewayCount: 180,
    meterCount: 12000,
    activeMeter: 11500,
    status: 1
  },
  {
    id: 8,
    provinceId: 3,
    provinceName: "Tỉnh Bình Dương",
    name: "TP. Thủ Dầu Một",
    code: "TDM",
    wardCount: 25,
    zoneCount: 18,
    clusterCount: 50,
    gatewayCount: 150,
    meterCount: 10000,
    activeMeter: 9700,
    status: 1
  }
]);

const pagination = reactive({
  total: 8,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "code", width: 70 },
  { label: "Tên Quận/Huyện", prop: "name", minWidth: 130 },
  { label: "Tỉnh/TP", prop: "provinceName", width: 120 },
  { label: "Phường", prop: "wardCount", width: 80, align: "center" },
  { label: "Cụm", prop: "clusterCount", width: 80, align: "center" },
  { label: "GW", prop: "gatewayCount", width: 70, align: "center" },
  { label: "ĐH", prop: "meterCount", width: 80, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Thao tác", width: 120, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
};

const resetForm = () => {
  form.provinceId = "";
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/district/${row.id}`);
};

onMounted(() => onSearch());
</script>

<template>
  <div class="p-4">
    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Tỉnh/TP:">
        <el-select
          v-model="form.provinceId"
          placeholder="Chọn"
          clearable
          class="w-40!"
        >
          <el-option
            v-for="item in provinceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Tên:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-36!"
        />
      </el-form-item>
      <el-form-item label="Mã:">
        <el-input
          v-model="form.code"
          placeholder="Nhập mã"
          clearable
          class="w-28!"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="2. Quản lý Quận/Huyện"
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
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 1 ? "Hoạt động" : "Ngừng" }}
            </el-tag>
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
