<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "SystemUser" });

const loading = ref(false);
const treeLoading = ref(true);

const form = reactive({
  username: "",
  phone: "",
  status: ""
});

const treeData = ref([
  {
    id: 100,
    label: "Công ty A",
    children: [
      {
        id: 101,
        label: "Chi nhánh 1",
        children: [
          { id: 103, label: "Phòng IT" },
          { id: 104, label: "Phòng Kế toán" }
        ]
      },
      {
        id: 102,
        label: "Chi nhánh 2",
        children: [
          { id: 105, label: "Phòng kinh doanh" },
          { id: 106, label: "Phòng nhân sự" }
        ]
      }
    ]
  }
]);

const dataList = ref([
  {
    id: 1,
    avatar: "https://avatars.githubusercontent.com/u/44761321",
    username: "admin",
    nickname: "Nguyễn Văn Admin",
    phone: "0912345678",
    email: "admin@example.com",
    sex: 0,
    dept: { id: 103, name: "Phòng IT" },
    status: 1,
    createTime: "2024-01-15 10:00:00"
  },
  {
    id: 2,
    avatar: "https://avatars.githubusercontent.com/u/52823142",
    username: "user001",
    nickname: "Trần Thị B",
    phone: "0923456789",
    email: "user001@example.com",
    sex: 1,
    dept: { id: 104, name: "Phòng Kế toán" },
    status: 1,
    createTime: "2024-02-01 08:30:00"
  },
  {
    id: 3,
    avatar: "",
    username: "tech01",
    nickname: "Lê Văn Công",
    phone: "0934567890",
    email: "tech01@example.com",
    sex: 0,
    dept: { id: 103, name: "Phòng IT" },
    status: 1,
    createTime: "2024-02-15 14:20:00"
  },
  {
    id: 4,
    avatar: "",
    username: "ketoan01",
    nickname: "Phạm Thị D",
    phone: "0945678901",
    email: "ketoan01@example.com",
    sex: 1,
    dept: { id: 104, name: "Phòng Kế toán" },
    status: 1,
    createTime: "2024-03-01 09:15:00"
  },
  {
    id: 5,
    avatar: "",
    username: "kd01",
    nickname: "Hoàng Văn E",
    phone: "0956789012",
    email: "kd01@example.com",
    sex: 0,
    dept: { id: 105, name: "Phòng kinh doanh" },
    status: 0,
    createTime: "2024-03-10 11:45:00"
  },
  {
    id: 6,
    avatar: "https://avatars.githubusercontent.com/u/44761321",
    username: "hr01",
    nickname: "Vũ Thị F",
    phone: "0967890123",
    email: "hr01@example.com",
    sex: 1,
    dept: { id: 106, name: "Phòng nhân sự" },
    status: 1,
    createTime: "2024-03-20 16:30:00"
  }
]);

const pagination = reactive({
  total: 6,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { type: "selection", width: 55, fixed: "left" },
  { label: "ID", prop: "id", width: 70 },
  {
    label: "Ảnh",
    prop: "avatar",
    width: 70,
    cellRenderer: ({ row }) =>
      row.avatar
        ? `<img src="${row.avatar}" class="w-8 h-8 rounded-full"/>`
        : `<div class="w-8 h-8 rounded-full bg-gray-300"></div>`
  },
  { label: "Tên đăng nhập", prop: "username", minWidth: 120 },
  { label: "Tên hiển thị", prop: "nickname", minWidth: 120 },
  {
    label: "Giới tính",
    prop: "sex",
    width: 80,
    cellRenderer: ({ row }) => (row.sex === 1 ? "Nữ" : "Nam")
  },
  { label: "Phòng ban", prop: "dept.name", minWidth: 120 },
  { label: "Số điện thoại", prop: "phone", minWidth: 110 },
  {
    label: "Trạng thái",
    prop: "status",
    width: 80,
    cellRenderer: ({ row }) => (row.status === 1 ? "Hoạt động" : "Ngừng")
  },
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
  form.username = "";
  form.phone = "";
  form.status = "";
  onSearch();
};

const onTreeSelect = data => {
  if (data.selected) {
    console.log("Selected dept:", data.id);
  }
  onSearch();
};

const handleAdd = () => {
  console.log("Thêm người dùng");
};

const handleEdit = row => {
  console.log("Sửa:", row);
};

const handleDelete = row => {
  console.log("Xóa:", row);
};

onMounted(() => {
  treeLoading.value = false;
  onSearch();
});
</script>

<template>
  <div class="flex justify-between">
    <div class="w-48 mr-2 bg-white dark:bg-gray-800 rounded-lg p-2">
      <el-tree
        :data="treeData"
        :props="{ label: 'label', children: 'children' }"
        @node-click="onTreeSelect"
      />
    </div>
    <div class="flex-1">
      <el-form
        :inline="true"
        :model="form"
        class="search-form bg-bg_color w-full pl-8 pt-3 mb-4"
      >
        <el-form-item label="Tên:" prop="username">
          <el-input
            v-model="form.username"
            placeholder="Nhập tên"
            clearable
            class="w-40!"
          />
        </el-form-item>
        <el-form-item label="Điện thoại:" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="Nhập số điện thoại"
            clearable
            class="w-40!"
          />
        </el-form-item>
        <el-form-item label="Trạng thái:" prop="status">
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
        title="Quản lý Người dùng"
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
            <template #operation>
              <el-button type="primary" link>Sửa</el-button>
              <el-button type="danger" link>Xóa</el-button>
            </template>
          </pure-table>
        </template>
      </PureTableBar>
    </div>
  </div>
</template>
