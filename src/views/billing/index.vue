<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { getInvoices, getBillingStats, payInvoice } from "@/api/waterMeter";

defineOptions({ name: "BillingManagement" });

const loading = ref(false);

const form = reactive({
  month: "",
  status: "",
  customerName: ""
});

const dataList = ref<any[]>([]);

const pagination = reactive({
  total: 0,
  pageSize: 20,
  currentPage: 1,
  background: true
});

const stats = reactive({
  totalBills: 0,
  totalAmount: 0,
  paidAmount: 0,
  unpaidAmount: 0
});

const fetchInvoices = async () => {
  loading.value = true;
  try {
    const [invoicesRes, statsRes] = await Promise.allSettled([
      getInvoices({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        status: form.status || undefined,
        search: form.customerName || undefined
      }),
      getBillingStats()
    ]);

    if (
      invoicesRes?.status === "fulfilled" &&
      invoicesRes.value?.data?.success
    ) {
      const data = invoicesRes.value.data.data;
      dataList.value = data.list || [];
      pagination.total = data.total || 0;
    } else {
      useMockData();
    }

    if (statsRes?.status === "fulfilled" && statsRes.value?.data?.success) {
      const s = statsRes.value.data.data.overall;
      stats.totalBills = s.totalInvoices || 0;
      stats.totalAmount = s.totalAmount || 0;
      stats.paidAmount = s.paidAmount || 0;
      stats.unpaidAmount = s.unpaidAmount || 0;
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
      month: "04/2026",
      customerName: "Nguyễn Văn A",
      meterCode: "MTR-001",
      previousReading: 1217.8,
      currentReading: 1250.5,
      consumption: 32.7,
      unitPrice: 15000,
      totalAmount: 490500,
      status: "unpaid",
      dueDate: "15/04/2026"
    },
    {
      id: 2,
      month: "04/2026",
      customerName: "Trần Thị B",
      meterCode: "MTR-002",
      previousReading: 868.4,
      currentReading: 890.3,
      consumption: 21.9,
      unitPrice: 15000,
      totalAmount: 328500,
      status: "paid",
      dueDate: "15/04/2026"
    },
    {
      id: 3,
      month: "04/2026",
      customerName: "Lê Văn C",
      meterCode: "MTR-003",
      previousReading: 2105.8,
      currentReading: 2105.8,
      consumption: 0,
      unitPrice: 15000,
      totalAmount: 0,
      status: "unpaid",
      dueDate: "15/04/2026"
    },
    {
      id: 4,
      month: "04/2026",
      customerName: "Phạm Thị D",
      meterCode: "MTR-004",
      previousReading: 551.8,
      currentReading: 567.2,
      consumption: 15.4,
      unitPrice: 15000,
      totalAmount: 231000,
      status: "paid",
      dueDate: "15/04/2026"
    },
    {
      id: 5,
      month: "04/2026",
      customerName: "Hoàng Văn E",
      meterCode: "MTR-005",
      previousReading: 1861.4,
      currentReading: 1890.0,
      consumption: 28.6,
      unitPrice: 15000,
      totalAmount: 429000,
      status: "unpaid",
      dueDate: "15/04/2026"
    },
    {
      id: 6,
      month: "03/2026",
      customerName: "Nguyễn Văn A",
      meterCode: "MTR-001",
      previousReading: 1189.4,
      currentReading: 1217.8,
      consumption: 28.4,
      unitPrice: 15000,
      totalAmount: 426000,
      status: "paid",
      dueDate: "15/03/2026"
    },
    {
      id: 7,
      month: "03/2026",
      customerName: "Trần Thị B",
      meterCode: "MTR-002",
      previousReading: 846.5,
      currentReading: 868.4,
      consumption: 21.9,
      unitPrice: 15000,
      totalAmount: 328500,
      status: "paid",
      dueDate: "15/03/2026"
    }
  ];
  pagination.total = 7;
  stats.totalBills = 7;
  stats.totalAmount = 1905000;
  stats.paidAmount = 1082500;
  stats.unpaidAmount = 822500;
};

const columns = [
  { type: "selection", width: 55 },
  { label: "Kỳ thanh toán", prop: "month", width: 90 },
  { label: "Khách hàng", prop: "customerName", minWidth: 130 },
  { label: "Mã ĐH", prop: "meterCode", width: 90 },
  { label: "CS cũ (m³)", prop: "previousReading", width: 100, align: "right" },
  { label: "CS mới (m³)", prop: "currentReading", width: 100, align: "right" },
  { label: "Tiêu thụ (m³)", prop: "consumption", width: 100, align: "right" },
  { label: "Đơn giá", prop: "unitPrice", width: 90, align: "right" },
  { label: "Thành tiền", prop: "totalAmount", width: 120, align: "right" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  pagination.currentPage = 1;
  fetchInvoices();
};

const resetForm = () => {
  form.month = "";
  form.status = "";
  form.customerName = "";
  onSearch();
};

const handlePay = async (row: any) => {
  try {
    await payInvoice(row.id, { paymentMethod: "Cash" });
    fetchInvoices();
  } catch (error) {
    console.error("Error paying invoice:", error);
  }
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  fetchInvoices();
};

const handleCurrentChange = (val: number) => {
  pagination.currentPage = val;
  fetchInvoices();
};

onMounted(() => {
  fetchInvoices();
});
</script>

<template>
  <div class="p-4">
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic title="Tổng hóa đơn" :value="stats.totalBills" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Tổng tiền"
            :value="stats.totalAmount"
            suffix="đ"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Đã thanh toán"
            :value="stats.paidAmount"
            suffix="đ"
          />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <el-statistic
            title="Chưa thanh toán"
            :value="stats.unpaidAmount"
            suffix="đ"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Kỳ:">
        <el-select
          v-model="form.month"
          placeholder="Chọn kỳ"
          clearable
          class="w-32!"
        >
          <el-option label="04/2026" value="04/2026" />
          <el-option label="03/2026" value="03/2026" />
          <el-option label="02/2026" value="02/2026" />
        </el-select>
      </el-form-item>
      <el-form-item label="Tên KH:">
        <el-input
          v-model="form.customerName"
          placeholder="Nhập tên"
          clearable
          class="w-36!"
        />
      </el-form-item>
      <el-form-item label="Trạng thái:">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-32!"
        >
          <el-option label="Đã thanh toán" value="paid" />
          <el-option label="Chưa thanh toán" value="unpaid" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Quản lý Hóa đơn"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary">Tạo hóa đơn</el-button>
        <el-button type="success">Xuất Excel</el-button>
        <el-button>Gửi SMS</el-button>
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
          <template #totalAmount="{ row }">
            <span class="font-bold">{{
              row.totalAmount.toLocaleString()
            }}</span>
          </template>
          <template #status="{ row }">
            <el-tag
              :type="row.status === 'paid' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán" }}
            </el-tag>
          </template>
          <template #operation="{ row }">
            <el-button type="primary" link>Xem chi tiết</el-button>
            <el-button v-if="row.status === 'unpaid'" type="success" link
              >Thu tiền</el-button
            >
            <el-button type="info" link>In hóa đơn</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
