<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getCustomers, getCustomerStats, deleteCustomer, createCustomer, updateCustomer } from "@/api/waterMeter";
import dayjs from "dayjs";

defineOptions({ name: "CustomerManagement" });

const loading = ref(false);
const dataList = ref<any[]>([]);
const total    = ref(0);

const pagination = reactive({ currentPage: 1, pageSize: 20 });
const searchText = ref("");

const stats = reactive({ totalCustomers: 0, hasMeters: 0, noMeters: 0 });

// ── Dialog thêm/sửa ────────────────────────────────────────────────
const dialogVisible = ref(false);
const dialogMode    = ref<"add" | "edit">("add");
const formRef       = ref();
const form = reactive({
  customerCode: "",
  customerName: "",
  phone:        "",
  email:        "",
  address:      "",
  billingDate:  "",
  note:         ""
});
const formRules = {
  customerCode: [{ required: true, message: "Nhập mã khách hàng", trigger: "blur" }],
  customerName: [{ required: true, message: "Nhập tên khách hàng", trigger: "blur" }]
};

function openAdd() {
  dialogMode.value = "add";
  Object.assign(form, { customerCode: "", customerName: "", phone: "", email: "", address: "", billingDate: "", note: "" });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  dialogMode.value = "edit";
  Object.assign(form, {
    customerCode: row.customerCode,
    customerName: row.customerName ?? "",
    phone:        row.phone        ?? "",
    email:        row.email        ?? "",
    address:      row.address      ?? "",
    billingDate:  row.billingDate  ?? "",
    note:         row.note         ?? ""
  });
  dialogVisible.value = true;
}

async function submitForm() {
  await formRef.value?.validate();
  try {
    if (dialogMode.value === "add") {
      const res: any = await createCustomer({ ...form });
      if (res?.code === 0) {
        ElMessage.success("Thêm khách hàng thành công");
        dialogVisible.value = false;
        fetchCustomers();
      } else {
        ElMessage.error(res?.message ?? "Lỗi");
      }
    } else {
      const { customerCode, ...data } = form;
      const res: any = await updateCustomer(customerCode, data);
      if (res?.code === 0) {
        ElMessage.success("Cập nhật thành công");
        dialogVisible.value = false;
        fetchCustomers();
      } else {
        ElMessage.error(res?.message ?? "Lỗi");
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? "Lỗi");
  }
}

// ── Load data ──────────────────────────────────────────────────────
async function fetchCustomers() {
  loading.value = true;
  try {
    const [custRes, statsRes]: [any, any] = await Promise.all([
      getCustomers({
        page:     pagination.currentPage,
        pageSize: pagination.pageSize,
        search:   searchText.value || undefined
      }),
      getCustomerStats()
    ]);

    if (custRes?.code === 0) {
      dataList.value = custRes.data?.list ?? [];
      total.value    = custRes.data?.total ?? 0;
    }
    if (statsRes?.code === 0) {
      const s = statsRes.data;
      stats.totalCustomers = s.totalCustomers ?? 0;
      stats.hasMeters      = s.hasMeters      ?? 0;
      stats.noMeters       = s.noMeters       ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`Xóa khách hàng "${row.customerName ?? row.customerCode}"?`, "Xác nhận", {
    type: "warning"
  });
  try {
    const res: any = await deleteCustomer(row.customerCode);
    if (res?.code === 0) {
      ElMessage.success("Xóa thành công");
      fetchCustomers();
    } else {
      ElMessage.error(res?.message ?? "Lỗi");
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? "Lỗi");
  }
}

function handleSearch() {
  pagination.currentPage = 1;
  fetchCustomers();
}

function resetSearch() {
  searchText.value = "";
  handleSearch();
}

onMounted(fetchCustomers);
</script>

<template>
  <div class="p-4 space-y-4">

    <!-- KPI -->
    <div class="grid grid-cols-3 gap-3">
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-primary">{{ stats.totalCustomers.toLocaleString("vi-VN") }}</div>
        <div class="text-xs text-gray-500 mt-1">Tổng khách hàng</div>
      </el-card>
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-success">{{ stats.hasMeters.toLocaleString("vi-VN") }}</div>
        <div class="text-xs text-gray-500 mt-1">Có đồng hồ</div>
      </el-card>
      <el-card shadow="never" class="text-center">
        <div class="text-2xl font-bold text-warning">{{ stats.noMeters.toLocaleString("vi-VN") }}</div>
        <div class="text-xs text-gray-500 mt-1">Chưa có đồng hồ</div>
      </el-card>
    </div>

    <!-- Toolbar -->
    <el-card shadow="never">
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <el-input v-model="searchText" placeholder="Mã KH, tên, SĐT, email..." clearable style="width: 280px"
          @keyup.enter="handleSearch" @clear="handleSearch" />
        <el-button type="primary" @click="handleSearch">Tìm kiếm</el-button>
        <el-button @click="resetSearch">Đặt lại</el-button>
        <el-button type="primary" class="ml-auto" @click="openAdd">
          <i class="i-ri:add-line mr-1" />Thêm mới
        </el-button>
        <el-button type="success">
          <i class="i-ri:download-line mr-1" />Xuất Excel
        </el-button>
      </div>

      <el-table :data="dataList" v-loading="loading" stripe border size="small"
        :header-cell-style="{ background: 'var(--el-fill-color-light)', fontWeight: 600, fontSize: '12px' }">
        <el-table-column prop="customerCode" label="Mã KH" width="110" fixed="left" />
        <el-table-column prop="customerName" label="Tên khách hàng" min-width="160" show-overflow-tooltip />
        <el-table-column prop="phone"        label="Điện thoại" width="120" />
        <el-table-column prop="email"        label="Email" min-width="160" show-overflow-tooltip />
        <el-table-column prop="address"      label="Địa chỉ" min-width="200" show-overflow-tooltip />
        <el-table-column prop="billingDate"  label="Ngày TT" width="90" align="center" />
        <el-table-column prop="meterCount"   label="Số ĐH" width="75" align="center">
          <template #default="{ row }">
            <el-tag :type="row.meterCount > 0 ? 'success' : 'info'" size="small">{{ row.meterCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created" label="Ngày tạo" width="105" align="center">
          <template #default="{ row }">
            {{ row.created ? dayjs(row.created).format("DD/MM/YYYY") : "—" }}
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">Sửa</el-button>
            <el-button type="danger"  link size="small" @click="handleDelete(row)">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-3">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          small
          @current-change="fetchCustomers"
          @size-change="fetchCustomers"
        />
      </div>
    </el-card>

    <!-- Dialog thêm/sửa -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'add' ? 'Thêm khách hàng' : 'Sửa khách hàng'"
      width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="130px" size="default">
        <el-form-item label="Mã khách hàng" prop="customerCode">
          <el-input v-model="form.customerCode" :disabled="dialogMode === 'edit'" placeholder="VD: KH001" />
        </el-form-item>
        <el-form-item label="Tên khách hàng" prop="customerName">
          <el-input v-model="form.customerName" placeholder="Họ và tên" />
        </el-form-item>
        <el-form-item label="Điện thoại">
          <el-input v-model="form.phone" placeholder="0xxx..." />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="form.email" placeholder="email@..." />
        </el-form-item>
        <el-form-item label="Địa chỉ">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="Địa chỉ đầy đủ" />
        </el-form-item>
        <el-form-item label="Ngày thanh toán">
          <el-input v-model="form.billingDate" placeholder="VD: 15 (ngày trong tháng)" style="width: 160px" />
        </el-form-item>
        <el-form-item label="Ghi chú">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="Ghi chú" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="submitForm">{{ dialogMode === "add" ? "Thêm" : "Cập nhật" }}</el-button>
      </template>
    </el-dialog>

  </div>
</template>
