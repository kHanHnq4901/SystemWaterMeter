<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "SystemRole" });

const loading = ref(false);

const form = reactive({
  name: "",
  code: "",
  status: ""
});

const dataList = ref([
  {
    id: 1,
    name: "Quản trị viên",
    code: "admin",
    status: 1,
    remark: "Toàn quyền hệ thống",
    userCount: 3,
    createTime: "2024-01-01 00:00:00"
  },
  {
    id: 2,
    name: "Quản lý",
    code: "manager",
    status: 1,
    remark: "Quản lý phòng ban",
    userCount: 5,
    createTime: "2024-01-15 10:00:00"
  },
  {
    id: 3,
    name: "Kế toán",
    code: "accountant",
    status: 1,
    remark: "Truy cập mục tài chính",
    userCount: 4,
    createTime: "2024-02-01 08:30:00"
  },
  {
    id: 4,
    name: "Nhân viên",
    code: "staff",
    status: 1,
    remark: "Quyền hạn chế",
    userCount: 20,
    createTime: "2024-02-15 14:20:00"
  },
  {
    id: 5,
    name: "Khách hàng",
    code: "customer",
    status: 0,
    remark: "Tài khoản khách",
    userCount: 100,
    createTime: "2024-03-01 09:15:00"
  }
]);

const treeData = ref([
  {
    id: 100,
    label: "Bản đồ",
    children: [
      { id: 101, label: "Tổng quan" },
      { id: 102, label: "Bản đồ Gateway" },
      { id: 103, label: "Bản đồ Đồng hồ" }
    ]
  },
  {
    id: 200,
    label: "Thiết bị",
    children: [
      { id: 201, label: "Quản lý Gateway" },
      { id: 202, label: "Quản lý Đồng hồ" },
      { id: 203, label: "Quản lý Khu vực" }
    ]
  },
  {
    id: 300,
    label: "Phân tích",
    children: [
      { id: 301, label: "Xem dữ liệu" },
      { id: 302, label: "Sản lượng nước" },
      { id: 303, label: "Tổn thất" },
      { id: 304, label: "Cảnh báo" },
      { id: 305, label: "Báo cáo" }
    ]
  },
  {
    id: 400,
    label: "Hệ thống",
    children: [
      { id: 401, label: "Người dùng" },
      { id: 402, label: "Vai trò" },
      { id: 403, label: "Menu" },
      { id: 404, label: "Phòng ban" }
    ]
  }
]);

const pagination = reactive({
  total: 5,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55 },
  { label: "ID", prop: "id", width: 70 },
  { label: "Tên vai trò", prop: "name", minWidth: 120 },
  { label: "Mã vai trò", prop: "code", minWidth: 100 },
  { label: "Số người dùng", prop: "userCount", width: 110, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Ghi chú", prop: "remark", minWidth: 150 },
  { label: "Ngày tạo", prop: "createTime", minWidth: 160 },
  { label: "Thao tác", width: 180, fixed: "right", slot: "operation" }
];

const isShowMenu = ref(false);
const curRole = ref(null);

const onSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 300);
};

const resetForm = () => {
  form.name = "";
  form.code = "";
  form.status = "";
  onSearch();
};

const handleEdit = row => {
  console.log("Sửa:", row);
};

const handleDelete = row => {
  console.log("Xóa:", row);
};

const handleMenu = row => {
  curRole.value = row;
  isShowMenu.value = true;
};

const handleCloseMenu = () => {
  isShowMenu.value = false;
};

const handleSaveMenu = () => {
  console.log("Lưu quyền menu");
  isShowMenu.value = false;
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
      <el-form-item label="Tên vai trò:">
        <el-input
          v-model="form.name"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item label="Mã vai trò:">
        <el-input
          v-model="form.code"
          placeholder="Nhập mã"
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

    <div class="flex gap-2">
      <div :class="isShowMenu ? 'w-[60%]' : 'w-full'">
        <PureTableBar
          title="Quản lý Vai trò"
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
                <el-button type="warning" link @click="handleMenu(row)"
                  >Phân quyền</el-button
                >
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </div>

      <div
        v-if="isShowMenu"
        class="w-[38%] bg-white dark:bg-gray-800 rounded-lg p-4"
      >
        <div class="flex justify-between items-center mb-4">
          <span class="font-bold">Phân quyền menu - {{ curRole?.name }}</span>
          <el-button type="primary" size="small" @click="handleSaveMenu"
            >Lưu</el-button
          >
        </div>
        <el-input placeholder="Tìm kiếm menu" class="mb-2" />
        <el-tree
          :data="treeData"
          :props="{ label: 'label', children: 'children' }"
          show-checkbox
          default-expand-all
        />
      </div>
    </div>
  </div>
</template>
