<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import { getProvinces, getProvince } from "@/api/waterMeter";

defineOptions({ name: "DeviceProvince" });

const router = useRouter();
const loading = ref(false);

const form = reactive({
  name: "",
  code: ""
});

const dataList = ref<any[]>([]);

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const fetchProvinces = async () => {
  loading.value = true;
  try {
    const res = await getProvinces();
    if (res?.data?.success) {
      dataList.value = res.data.data || [];
      pagination.total = dataList.value.length;
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
    { id: 1, provinceCode: "HCM", provinceName: "TP. Hồ Chí Minh", status: 1, createdDate: "2024-01-01" },
    { id: 2, provinceCode: "DN", provinceName: "Tỉnh Đồng Nai", status: 1, createdDate: "2024-01-01" },
    { id: 3, provinceCode: "BD", provinceName: "Tỉnh Bình Dương", status: 1, createdDate: "2024-01-01" },
    { id: 4, provinceCode: "LA", provinceName: "Tỉnh Long An", status: 0, createdDate: "2024-01-01" }
  ];
  pagination.total = 4;
};

const onSearch = () => {
  fetchProvinces();
};

const resetForm = () => {
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = async (row: { id: number }) => {
  router.push(`/device/province/${row.id}`);
};

onMounted(() => {
  onSearch();
});
</script>
    code: "HCM",
    districtCount: 22,
    wardCount: 322,
    clusterCount: 480,
    gatewayCount: 1250,
    meterCount: 85000,
    activeMeter: 82500,
    status: 1
  },
  {
    id: 2,
    name: "Tỉnh Đồng Nai",
    code: "DN",
    districtCount: 9,
    wardCount: 156,
    clusterCount: 280,
    gatewayCount: 450,
    meterCount: 32000,
    activeMeter: 31000,
    status: 1
  },
  {
    id: 3,
    name: "Tỉnh Bình Dương",
    code: "BD",
    districtCount: 8,
    wardCount: 142,
    clusterCount: 220,
    gatewayCount: 380,
    meterCount: 28000,
    activeMeter: 27000,
    status: 1
  },
  {
    id: 4,
    name: "Tỉnh Long An",
    code: "LA",
    districtCount: 15,
    wardCount: 180,
    clusterCount: 150,
    gatewayCount: 220,
    meterCount: 18000,
    activeMeter: 17500,
    status: 0
  }
]);

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "provinceCode", width: 80 },
  { label: "Tên Tỉnh/TP", prop: "provinceName", minWidth: 150 },
  { label: "Trạng thái", prop: "status", width: 100, align: "center" },
  { label: "Ngày tạo", prop: "createdDate", width: 120, align: "center" },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  fetchProvinces();
};

const resetForm = () => {
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/province/${row.id}`);
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
      <el-form-item label="Tên:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Mã:">
        <el-input
          v-model="form.code"
          placeholder="Nhập mã"
          clearable
          class="w-32!"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="1. Quản lý Tỉnh/TP"
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
