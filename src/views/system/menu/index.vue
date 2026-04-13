<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";

defineOptions({ name: "SystemMenu" });

const loading = ref(false);

const form = reactive({
  title: ""
});

const dataList = ref([
  {
    id: 1,
    parentId: 0,
    menuType: 0,
    title: "Bản đồ",
    icon: "ri:map-2-line",
    path: "/map",
    sort: 1,
    isShow: 1,
    status: 1
  },
  {
    id: 2,
    parentId: 0,
    menuType: 0,
    title: "Thiết bị",
    icon: "ri:wireless-charging-line",
    path: "/device",
    sort: 2,
    isShow: 1,
    status: 1
  },
  {
    id: 3,
    parentId: 0,
    menuType: 0,
    title: "Phân tích",
    icon: "ri:bar-chart-box-line",
    path: "/analysis",
    sort: 3,
    isShow: 1,
    status: 1
  },
  {
    id: 4,
    parentId: 0,
    menuType: 0,
    title: "Hệ thống",
    icon: "ri:settings-3-line",
    path: "/system",
    sort: 4,
    isShow: 1,
    status: 1
  },
  {
    id: 5,
    parentId: 0,
    menuType: 0,
    title: "Nhật ký",
    icon: "ri:file-history-line",
    path: "/logs",
    sort: 5,
    isShow: 1,
    status: 1
  },
  // Sub-items for Bản đồ
  {
    id: 11,
    parentId: 1,
    menuType: 0,
    title: "Tổng quan",
    icon: "ri:map-range-line",
    path: "/map/overview",
    sort: 1,
    isShow: 1,
    status: 1
  },
  {
    id: 12,
    parentId: 1,
    menuType: 0,
    title: "Gateway",
    icon: "ri:router-line",
    path: "/map/gateway",
    sort: 2,
    isShow: 1,
    status: 1
  },
  {
    id: 13,
    parentId: 1,
    menuType: 0,
    title: "Đồng hồ",
    icon: "ri:water-drop-line",
    path: "/map/meter",
    sort: 3,
    isShow: 1,
    status: 1
  },
  // Sub-items for Thiết bị
  {
    id: 21,
    parentId: 2,
    menuType: 0,
    title: "Gateway",
    icon: "ri:router-line",
    path: "/device/gateway",
    sort: 1,
    isShow: 1,
    status: 1
  },
  {
    id: 22,
    parentId: 2,
    menuType: 0,
    title: "Đồng hồ",
    icon: "ri:gauge-line",
    path: "/device/meter",
    sort: 2,
    isShow: 1,
    status: 1
  },
  {
    id: 23,
    parentId: 2,
    menuType: 0,
    title: "Khu vực",
    icon: "ri:map-pin-range-line",
    path: "/device/area",
    sort: 3,
    isShow: 1,
    status: 1
  },
  // Sub-items for Phân tích
  {
    id: 31,
    parentId: 3,
    menuType: 0,
    title: "Dữ liệu",
    icon: "ri:database-line",
    path: "/analysis/data",
    sort: 1,
    isShow: 1,
    status: 1
  },
  {
    id: 32,
    parentId: 3,
    menuType: 0,
    title: "Sản lượng",
    icon: "ri:water-flash-line",
    path: "/analysis/production",
    sort: 2,
    isShow: 1,
    status: 1
  },
  {
    id: 33,
    parentId: 3,
    menuType: 0,
    title: "Tổn thất",
    icon: "ri:alarm-warning-line",
    path: "/analysis/loss",
    sort: 3,
    isShow: 1,
    status: 1
  },
  {
    id: 34,
    parentId: 3,
    menuType: 0,
    title: "Cảnh báo",
    icon: "ri:notification-3-line",
    path: "/analysis/alert",
    sort: 4,
    isShow: 1,
    status: 1
  },
  {
    id: 35,
    parentId: 3,
    menuType: 0,
    title: "Báo cáo",
    icon: "ri:file-chart-line",
    path: "/analysis/report",
    sort: 5,
    isShow: 1,
    status: 1
  },
  // Sub-items for Hệ thống
  {
    id: 41,
    parentId: 4,
    menuType: 0,
    title: "Người dùng",
    icon: "ri:user-settings-line",
    path: "/system/user",
    sort: 1,
    isShow: 1,
    status: 1
  },
  {
    id: 42,
    parentId: 4,
    menuType: 0,
    title: "Vai trò",
    icon: "ri:shield-user-line",
    path: "/system/role",
    sort: 2,
    isShow: 1,
    status: 1
  },
  {
    id: 43,
    parentId: 4,
    menuType: 0,
    title: "Menu",
    icon: "ri:menu-2-line",
    path: "/system/menu",
    sort: 3,
    isShow: 1,
    status: 1
  },
  {
    id: 44,
    parentId: 4,
    menuType: 0,
    title: "Phòng ban",
    icon: "ri:organisation-chart",
    path: "/system/dept",
    sort: 4,
    isShow: 1,
    status: 1
  }
]);

const pagination = reactive({
  total: 21,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns = [
  { label: "Tên menu", prop: "title", minWidth: 180, align: "left" },
  { label: "Icon", prop: "icon", width: 80, align: "center" },
  { label: "Đường dẫn", prop: "path", minWidth: 150 },
  { label: "Loại", prop: "menuType", width: 90, align: "center" },
  { label: "Sắp xếp", prop: "sort", width: 80, align: "center" },
  { label: "Hiển thị", prop: "isShow", width: 80, align: "center" },
  { label: "Trạng thái", prop: "status", width: 90, align: "center" },
  { label: "Thao tác", width: 150, fixed: "right", slot: "operation" }
];

const getMenuType = type => {
  const types = { 0: "Menu", 1: "Iframe", 2: "External", 3: "Button" };
  return types[type] || "Menu";
};

const onSearch = () => {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
  }, 300);
};

const resetForm = () => {
  form.title = "";
  onSearch();
};

const handleEdit = row => {
  console.log("Sửa:", row);
};

const handleDelete = row => {
  console.log("Xóa:", row);
};

const handleAdd = () => {
  console.log("Thêm menu");
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
      <el-form-item label="Tên menu:">
        <el-input
          v-model="form.title"
          placeholder="Nhập tên"
          clearable
          class="w-40!"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">Tìm kiếm</el-button>
        <el-button @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="Quản lý Menu" :columns="columns" @refresh="onSearch">
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
          <template #menuType="{ row }">
            <el-tag
              :type="
                row.menuType === 0
                  ? 'primary'
                  : row.menuType === 1
                    ? 'warning'
                    : row.menuType === 2
                      ? 'danger'
                      : 'info'
              "
              size="small"
            >
              {{ getMenuType(row.menuType) }}
            </el-tag>
          </template>
          <template #isShow="{ row }">
            <el-tag
              :type="row.isShow === 1 ? 'success' : 'info'"
              size="small"
              >{{ row.isShow === 1 ? "Hiện" : "Ẩn" }}</el-tag
            >
          </template>
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
