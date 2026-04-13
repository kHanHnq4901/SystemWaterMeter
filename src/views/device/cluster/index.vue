<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "DeviceCluster" });

const router = useRouter();
const loading = ref(false);

const form = reactive({
  zoneId: "",
  name: "",
  code: ""
});

const zoneOptions = ref([
  { label: "Khu vực Bến Nghé A", value: 1 },
  { label: "Khu vực Bến Nghé B", value: 2 },
  { label: "Khu vực Chợ Bến Thành", value: 3 },
  { label: "Khu vực Đông Tây", value: 4 },
  { label: "Khu vực Nguyễn Thái Bình", value: 5 }
]);

const dataList = ref([
  {
    id: 1,
    zoneId: 1,
    zoneName: "Khu vực Bến Nghé A",
    name: "Cụm A1",
    code: "C-A1",
    gatewayCount: 3,
    meterCount: 85,
    activeMeter: 83,
    status: 1
  },
  {
    id: 2,
    zoneId: 1,
    zoneName: "Khu vực Bến Nghé A",
    name: "Cụm A2",
    code: "C-A2",
    gatewayCount: 3,
    meterCount: 92,
    activeMeter: 90,
    status: 1
  },
  {
    id: 3,
    zoneId: 1,
    zoneName: "Khu vực Bến Nghé A",
    name: "Cụm A3",
    code: "C-A3",
    gatewayCount: 2,
    meterCount: 68,
    activeMeter: 66,
    status: 1
  },
  {
    id: 4,
    zoneId: 2,
    zoneName: "Khu vực Bến Nghé B",
    name: "Cụm B1",
    code: "C-B1",
    gatewayCount: 3,
    meterCount: 78,
    activeMeter: 77,
    status: 1
  },
  {
    id: 5,
    zoneId: 2,
    zoneName: "Khu vực Bến Nghé B",
    name: "Cụm B2",
    code: "C-B2",
    gatewayCount: 3,
    meterCount: 85,
    activeMeter: 83,
    status: 1
  },
  {
    id: 6,
    zoneId: 3,
    zoneName: "Khu vực Chợ Bến Thành",
    name: "Cụm C1",
    code: "C-C1",
    gatewayCount: 4,
    meterCount: 120,
    activeMeter: 118,
    status: 1
  },
  {
    id: 7,
    zoneId: 3,
    zoneName: "Khu vực Chợ Bến Thành",
    name: "Cụm C2",
    code: "C-C2",
    gatewayCount: 3,
    meterCount: 95,
    activeMeter: 93,
    status: 1
  }
]);

const pagination = reactive({
  total: 7,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã", prop: "code", width: 70 },
  { label: "Tên Cụm", prop: "name", minWidth: 120 },
  { label: "Khu vực", prop: "zoneName", width: 150 },
  { label: "GW", prop: "gatewayCount", width: 70, align: "center" },
  { label: "ĐH", prop: "meterCount", width: 80, align: "center" },
  { label: "Hoạt động", prop: "activeMeter", width: 90, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Thao tác", width: 120, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  loading.value = true;
  setTimeout(() => (loading.value = false), 300);
};

const resetForm = () => {
  form.zoneId = "";
  form.name = "";
  form.code = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/device/cluster/${row.id}`);
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
      <el-form-item label="Khu vực:">
        <el-select
          v-model="form.zoneId"
          placeholder="Chọn"
          clearable
          class="w-44!"
        >
          <el-option
            v-for="item in zoneOptions"
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

    <PureTableBar title="5. Quản lý Cụm" :columns="columns" @refresh="onSearch">
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
