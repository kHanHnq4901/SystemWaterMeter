<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "SystemDept" });

const loading = ref(false);

const form = reactive({
  name: "",
  status: null
});

const dataList = ref([
  {
    id: 100,
    parentId: 0,
    name: "Công ty A",
    sort: 0,
    status: 1,
    leader: "Nguyễn Văn A",
    phone: "0912345678",
    email: "ctyA@example.com",
    createTime: "2024-01-01 00:00:00",
    remark: "Trụ sở chính"
  },
  {
    id: 101,
    parentId: 100,
    name: "Chi nhánh 1",
    sort: 1,
    status: 1,
    leader: "Trần Văn B",
    phone: "0923456789",
    email: "cn1@example.com",
    createTime: "2024-01-15 10:00:00",
    remark: "Chi nhánh miền Bắc"
  },
  {
    id: 102,
    parentId: 100,
    name: "Chi nhánh 2",
    sort: 2,
    status: 1,
    leader: "Lê Văn C",
    phone: "0934567890",
    email: "cn2@example.com",
    createTime: "2024-02-01 08:30:00",
    remark: "Chi nhánh miền Nam"
  },
  {
    id: 103,
    parentId: 101,
    name: "Phòng IT",
    sort: 1,
    status: 1,
    leader: "Phạm Văn D",
    phone: "0945678901",
    email: "it@example.com",
    createTime: "2024-02-15 14:20:00",
    remark: "Phòng công nghệ thông tin"
  },
  {
    id: 104,
    parentId: 101,
    name: "Phòng Kế toán",
    sort: 2,
    status: 1,
    leader: "Hoàng Thị E",
    phone: "0956789012",
    email: "ketoan@example.com",
    createTime: "2024-03-01 09:15:00",
    remark: "Phòng tài chính kế toán"
  },
  {
    id: 105,
    parentId: 102,
    name: "Phòng Kinh doanh",
    sort: 1,
    status: 1,
    leader: "Vũ Văn F",
    phone: "0967890123",
    email: "kd@example.com",
    createTime: "2024-03-10 11:45:00",
    remark: "Phòng kinh doanh"
  },
  {
    id: 106,
    parentId: 102,
    name: "Phòng Nhân sự",
    sort: 2,
    status: 0,
    leader: "Đặng Thị G",
    phone: "0978901234",
    email: "hr@example.com",
    createTime: "2024-03-20 16:30:00",
    remark: "Phòng nhân sự"
  }
]);

const pagination = reactive({
  total: 7,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { label: "Tên phòng ban", prop: "name", minWidth: 180 },
  { label: "Sắp xếp", prop: "sort", width: 80, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Người phụ trách", prop: "leader", minWidth: 130 },
  { label: "Điện thoại", prop: "phone", width: 120 },
  { label: "Ngày tạo", prop: "createTime", minWidth: 160 },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const onSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 300);
};

const resetForm = () => {
  form.name = "";
  form.status = null;
  onSearch();
};

const handleEdit = row => {
  console.log("Sửa:", row);
};

const handleDelete = row => {
  console.log("Xóa:", row);
};

const handleAdd = () => {
  console.log("Thêm phòng ban");
};

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="p-4">
    <el-form
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
    >
      <el-form-item label="Tên phòng ban:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Trạng thái:">
        <el-select
          v-model="form.status"
          placeholder="Chọn"
          clearable
          class="w-36!"
        >
          <el-option label="Hoạt động" :value="1" />
          <el-option label="Ngừng" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar
      title="Quản lý Phòng ban"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button type="primary" @click="handleAdd">Thêm mới</el-button>
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
              >{{ row.status === 1 ? "Hoạt động" : "Ngừng" }}</el-tag
            >
          </template>
          <template #operation="{ row }">
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
