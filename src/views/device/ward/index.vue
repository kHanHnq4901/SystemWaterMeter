<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "DeviceWard" });

const router = useRouter();
const loading = ref(false);

const form = reactive({
  districtId: "",
  name: "",
  code: ""
});

const districtOptions = ref([
  { label: "Quận 1", value: 1 },
  { label: "Quận 3", value: 2 },
  { label: "Quận 5", value: 3 },
  { label: "Quận 7", value: 4 },
  { label: "Quận 10", value: 5 },
  { label: "Bình Thạnh", value: 6 },
  { label: "TP. Biên Hòa", value: 7 },
  { label: "TP. Thủ Dầu Một", value: 8 }
]);

const dataList = ref([
  {
    id: 1,
    districtId: 1,
    districtName: "Quận 1",
    name: "Phường Bến Nghé",
    code: "PN-01",
    zoneCount: 3,
    clusterCount: 8,
    gatewayCount: 28,
    meterCount: 1850,
    activeMeter: 1800,
    status: 1
  },
  {
    id: 2,
    districtId: 1,
    districtName: "Quận 1",
    name: "Phường Bến Thành",
    code: "PN-02",
    zoneCount: 4,
    clusterCount: 10,
    gatewayCount: 32,
    meterCount: 2100,
    activeMeter: 2050,
    status: 1
  },
  {
    id: 3,
    districtId: 1,
    districtName: "Quận 1",
    name: "Phường Nguyễn Thái Bình",
    code: "PN-03",
    zoneCount: 2,
    clusterCount: 7,
    gatewayCount: 25,
    meterCount: 1250,
    activeMeter: 1250,
    status: 1
  },
  {
    id: 4,
    districtId: 2,
    districtName: "Quận 3",
    name: "Phường 8",
    code: "Q3-08",
    zoneCount: 3,
    clusterCount: 9,
    gatewayCount: 30,
    meterCount: 1950,
    activeMeter: 1900,
    status: 1
  },
  {
    id: 5,
    districtId: 2,
    districtName: "Quận 3",
    name: "Phường 9",
    code: "Q3-09",
    zoneCount: 4,
    clusterCount: 11,
    gatewayCount: 35,
    meterCount: 2200,
    activeMeter: 2150,
    status: 1
  },
  {
    id: 6,
    districtId: 3,
    districtName: "Quận 5",
    name: "Phường 11",
    code: "Q5-11",
    zoneCount: 5,
    clusterCount: 15,
    gatewayCount: 45,
    meterCount: 2800,
    activeMeter: 2750,
    status: 1
  }
]);

const pagination = reactive({
  total: 6,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "code", width: 80 },
  { label: "Tên Phường/Xã", prop: "name", minWidth: 150 },
  { label: "Quận/Huyện", prop: "districtName", width: 110 },
  { label: "Khu vực", prop: "zoneCount", width: 90, align: "center" },
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
  form.districtId = "";
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/ward/${row.id}`);
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
      <el-form-item label="Quận/Huyện:">
        <el-select
          v-model="form.districtId"
          placeholder="Chọn"
          clearable
          class="w-40!"
        >
          <el-option
            v-for="item in districtOptions"
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
      title="3. Quản lý Phường/Xã"
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
