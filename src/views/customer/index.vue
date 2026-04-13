<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getCustomers,
  getCustomerStats,
  deleteCustomer
} from "@/api/waterMeter";

defineOptions({ name: "CustomerManagement" });

const router = useRouter();
const loading = ref(false);

const form = reactive({
  name: "",
  phone: "",
  meterCode: "",
  status: ""
});

const dataList = ref<any[]>([]);

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const stats = reactive({
  totalCustomers: 0,
  activeCustomers: 0,
  individualCustomers: 0,
  businessCustomers: 0
});

const fetchCustomers = async () => {
  loading.value = true;
  try {
    const [customersRes, statsRes] = await Promise.allSettled([
      getCustomers({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        search: form.name || undefined
      }),
      getCustomerStats()
    ]);

    if (
      customersRes?.status === "fulfilled" &&
      customersRes.value?.data?.success
    ) {
      const data = customersRes.value.data.data;
      dataList.value = data.list || [];
      pagination.total = data.total || 0;
    } else {
      useMockData();
    }

    if (statsRes?.status === "fulfilled" && statsRes.value?.data?.success) {
      const s = statsRes.value.data.data;
      stats.totalCustomers = s.totalCustomers || 0;
      stats.activeCustomers = s.activeCustomers || 0;
      stats.individualCustomers = s.individualCustomers || 0;
      stats.businessCustomers = s.businessCustomers || 0;
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
      customerCode: "KH001",
      customerName: "Nguyễn Văn A",
      phone: "0912345678",
      address: "123 Lê Lợi, Q.1, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      status: 1
    },
    {
      id: 2,
      customerCode: "KH002",
      customerName: "Trần Thị B",
      phone: "0912345679",
      address: "456 Nguyễn Huệ, Q.1, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      status: 1
    },
    {
      id: 3,
      customerCode: "KH003",
      customerName: "Lê Văn C",
      phone: "0912345680",
      address: "789 Pasteur, Q.1, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      status: 0
    },
    {
      id: 4,
      customerCode: "KH004",
      customerName: "Phạm Thị D",
      phone: "0912345681",
      address: "321 Chợ Bến Thành, Q.1, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 1",
      status: 1
    },
    {
      id: 5,
      customerCode: "KH005",
      customerName: "Hoàng Văn E",
      phone: "0912345682",
      address: "555 Lê Hồng Phong, Q.5, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 5",
      status: 1
    },
    {
      id: 6,
      customerCode: "KH006",
      customerName: "Vũ Thị F",
      phone: "0912345683",
      address: "777 Nguyễn Văn Linh, Q.5, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 5",
      status: 1
    },
    {
      id: 7,
      customerCode: "KH007",
      customerName: "Đặng Văn G",
      phone: "0912345684",
      address: "888 Nguyễn Văn Linh, Q.5, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 5",
      status: 1
    },
    {
      id: 8,
      customerCode: "KH008",
      customerName: "Bùi Thị H",
      phone: "0912345685",
      address: "999 Lý Thường Kiệt, Q.10, TP.HCM",
      provinceName: "TP. Hồ Chí Minh",
      districtName: "Quận 10",
      status: 1
    }
  ];
  pagination.total = 8;
  stats.totalCustomers = 350;
  stats.activeCustomers = 320;
  stats.individualCustomers = 280;
  stats.businessCustomers = 70;
};

const columns = [
  { type: "selection", width: 55 },
  { label: "Mã KH", prop: "customerCode", width: 100 },
  { label: "Tên khách hàng", prop: "customerName", minWidth: 150 },
  { label: "Số điện thoại", prop: "phone", width: 110 },
  { label: "Địa chỉ", prop: "address", minWidth: 200 },
  { label: "Tỉnh/TP", prop: "provinceName", width: 100 },
  { label: "Quận/Huyện", prop: "districtName", width: 100 },
  { label: "Trạng thái", prop: "status", width: 100, align: "center" },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  pagination.currentPage = 1;
  fetchCustomers();
};

const resetForm = () => {
  form.name = "";
  form.phone = "";
  form.meterCode = "";
  form.status = "";
  onSearch();
};

const handleView = (row: { id: number }) => {
  router.push(`/customer/detail/${row.id}`);
};

const handleEdit = (row: any) => {
  console.log("Edit customer:", row);
};

const handleDelete = async (row: any) => {
  try {
    await deleteCustomer(row.id);
    fetchCustomers();
  } catch (error) {
    console.error("Error deleting customer:", error);
  }
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  fetchCustomers();
};

const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  fetchCustomers();
};

onMounted(() => {
  fetchCustomers();
});
</script>

<template>
  <div class="p-4">
    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Tên KH:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-36!"
        />
      </el-form-item>
      <el-form-item label="SĐT:">
        <el-input
          v-model="form.phone"
          placeholder="Nhập số điện thoại"
          clearable
          class="w-36!"
        />
      </el-form-item>
      <el-form-item label="Mã ĐH:">
        <el-input
          v-model="form.meterCode"
          placeholder="Nhập mã"
          clearable
          class="w-32!"
        />
      </el-form-item>
      <el-form-item label="Trạng thái:">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-32!"
        >
          <el-option label="Hoạt động" value="active" />
          <el-option label="Ngừng" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Quản lý Khách hàng"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary">Thêm mới</el-button>
        <el-button type="success">Xuất Excel</el-button>
      </template>
      <template #default>
        <pure-table
          :loading="loading"
          :data="dataList"
          :columns="columns"
          :pagination="pagination"
          row-key="id"
          @page-current-change="handleCurrentChange"
          @page-size-change="handleSizeChange"
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
            <el-button type="primary" link @click="handleEdit(row)"
              >Sửa</el-button
            >
            <el-button type="danger" link @click="handleDelete(row)"
              >Xóa</el-button
            >
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
