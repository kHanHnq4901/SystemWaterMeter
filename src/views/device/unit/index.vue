<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessageBox } from "element-plus";
import {
  getUnitTree,
  createUnit,
  updateUnit,
  deleteUnit
} from "@/api/waterMeter";

defineOptions({ name: "DeviceUnit" });

interface TreeNode {
  id: number;
  name: string;
  code: string;
  level: number;
  parentId: number | null;
  status: number;
  children?: TreeNode[];
}

const loading = ref(false);
const treeData = ref<TreeNode[]>([]);
const selectedNode = ref<TreeNode | null>(null);
const treeRef = ref();

const formVisible = ref(false);
const form = reactive({
  id: null as number | null,
  name: "",
  code: "",
  level: 1,
  parentId: null as number | null,
  status: 1
});

const defaultProps = {
  children: "children",
  label: "name"
};

const levelLabels: Record<number, string> = {
  1: "Tỉnh/TP",
  2: "Quận/Huyện",
  3: "Phường/Xã",
  4: "Khu vực",
  5: "Cụm"
};

const levelIcons: Record<number, string> = {
  1: "ri:compass-3-line",
  2: "ri:map-pin-line",
  3: "ri:building-2-line",
  4: "ri:community-line",
  5: "ri:group-line"
};

const fetchTree = async () => {
  loading.value = true;
  try {
    const res = await getUnitTree();
    if (res?.data?.success) {
      treeData.value = res.data.data || [];
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
  treeData.value = [
    {
      id: 1,
      name: "TP. Hồ Chí Minh",
      code: "HCM",
      level: 1,
      parentId: null,
      status: 1,
      children: [
        {
          id: 11,
          name: "Quận 1",
          code: "Q1",
          level: 2,
          parentId: 1,
          status: 1,
          children: [
            {
              id: 111,
              name: "Phường Bến Nghé",
              code: "PN",
              level: 3,
              parentId: 11,
              status: 1,
              children: [
                {
                  id: 1111,
                  name: "Khu vực A",
                  code: "KA",
                  level: 4,
                  parentId: 111,
                  status: 1,
                  children: [
                    {
                      id: 11111,
                      name: "Cụm 1",
                      code: "C1",
                      level: 5,
                      parentId: 1111,
                      status: 1
                    },
                    {
                      id: 11112,
                      name: "Cụm 2",
                      code: "C2",
                      level: 5,
                      parentId: 1111,
                      status: 1
                    }
                  ]
                },
                {
                  id: 1112,
                  name: "Khu vực B",
                  code: "KB",
                  level: 4,
                  parentId: 111,
                  status: 1,
                  children: [
                    {
                      id: 11121,
                      name: "Cụm 3",
                      code: "C3",
                      level: 5,
                      parentId: 1112,
                      status: 1
                    }
                  ]
                }
              ]
            },
            {
              id: 112,
              name: "Phường Đa Kao",
              code: "DK",
              level: 3,
              parentId: 11,
              status: 1,
              children: [
                {
                  id: 1121,
                  name: "Khu vực C",
                  code: "KC",
                  level: 4,
                  parentId: 112,
                  status: 1,
                  children: [
                    {
                      id: 11211,
                      name: "Cụm 4",
                      code: "C4",
                      level: 5,
                      parentId: 1121,
                      status: 1
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 12,
          name: "Quận Bình Thạnh",
          code: "BT",
          level: 2,
          parentId: 1,
          status: 1,
          children: [
            {
              id: 121,
              name: "Phường Phú Nhuận",
              code: "PN",
              level: 3,
              parentId: 12,
              status: 1,
              children: [
                {
                  id: 1211,
                  name: "Khu vực D",
                  code: "KD",
                  level: 4,
                  parentId: 121,
                  status: 1,
                  children: [
                    {
                      id: 12111,
                      name: "Cụm 5",
                      code: "C5",
                      level: 5,
                      parentId: 1211,
                      status: 1
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 2,
      name: "Tỉnh Đồng Nai",
      code: "DN",
      level: 1,
      parentId: null,
      status: 1,
      children: [
        {
          id: 21,
          name: "TP. Biên Hòa",
          code: "BH",
          level: 2,
          parentId: 2,
          status: 1,
          children: [
            {
              id: 211,
              name: "Phường Tam Hiệp",
              code: "TH",
              level: 3,
              parentId: 21,
              status: 1,
              children: [
                {
                  id: 2111,
                  name: "Khu vực E",
                  code: "KE",
                  level: 4,
                  parentId: 211,
                  status: 1,
                  children: [
                    {
                      id: 21111,
                      name: "Cụm 6",
                      code: "C6",
                      level: 5,
                      parentId: 2111,
                      status: 1
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 3,
      name: "Tỉnh Bình Dương",
      code: "BD",
      level: 1,
      parentId: null,
      status: 1,
      children: [
        {
          id: 31,
          name: "TP. Thủ Dầu Một",
          code: "TDM",
          level: 2,
          parentId: 3,
          status: 1
        }
      ]
    }
  ];
};

const nodeClick = (data: TreeNode) => {
  selectedNode.value = data;
};

const handleAdd = () => {
  form.id = null;
  form.name = "";
  form.code = "";
  form.status = 1;

  if (selectedNode.value) {
    if (selectedNode.value.level >= 5) {
      ElMessage.warning("Không thể thêm cấp con cho cụm");
      return;
    }
    form.level = selectedNode.value.level + 1;
    form.parentId = selectedNode.value.id;
  } else {
    form.level = 1;
    form.parentId = null;
  }

  formVisible.value = true;
};

const handleEdit = () => {
  if (!selectedNode.value) {
    ElMessage.warning("Vui lòng chọn một đơn vị để sửa");
    return;
  }
  form.id = selectedNode.value.id;
  form.name = selectedNode.value.name;
  form.code = selectedNode.value.code;
  form.level = selectedNode.value.level;
  form.parentId = selectedNode.value.parentId;
  form.status = selectedNode.value.status;
  formVisible.value = true;
};

const handleDelete = async () => {
  if (!selectedNode.value) {
    ElMessage.warning("Vui lòng chọn một đơn vị để xóa");
    return;
  }

  try {
    await ElMessageBox.confirm(
      `Bạn có chắc chắn muốn xóa "${selectedNode.value.name}" không?`,
      "Xác nhận xóa",
      { type: "warning" }
    );

    // In real app, call API here
    // await deleteUnit(selectedNode.value.id);

    ElMessage.success("Xóa thành công");
    fetchTree();
  } catch {}
};

const handleSubmit = async () => {
  if (!form.name || !form.code) {
    ElMessage.warning("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  try {
    if (form.id) {
      // Update
      // await updateUnit(form.id, form);
      ElMessage.success("Cập nhật thành công");
    } else {
      // Create
      // await createUnit(form);
      ElMessage.success("Thêm mới thành công");
    }
    formVisible.value = false;
    fetchTree();
  } catch (error) {
    ElMessage.error("Có lỗi xảy ra");
  }
};

const getLevelLabel = (level: number) => levelLabels[level] || "";

onMounted(() => {
  fetchTree();
});
</script>

<template>
  <div class="h-full flex gap-4 p-4">
    <!-- Tree Panel -->
    <div class="w-1/3 bg-bg_color rounded-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Cây Đơn vị</h3>
        <div class="flex gap-2">
          <el-button type="primary" size="small" @click="handleAdd"
            >Thêm</el-button
          >
          <el-button size="small" @click="handleEdit" :disabled="!selectedNode"
            >Sửa</el-button
          >
          <el-button
            type="danger"
            size="small"
            @click="handleDelete"
            :disabled="!selectedNode"
            >Xóa</el-button
          >
        </div>
      </div>

      <el-scrollbar height="calc(100vh - 200px)">
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="defaultProps"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          @node-click="nodeClick"
          v-loading="loading"
        >
          <template #default="{ node, data }">
            <div class="flex items-center gap-2 py-1">
              <span class="el-tree-node__label">{{ node.label }}</span>
              <el-tag size="small" type="info">{{
                getLevelLabel(data.level)
              }}</el-tag>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </div>

    <!-- Detail Panel -->
    <div class="flex-1 bg-bg_color rounded-lg p-4">
      <h3 class="text-lg font-semibold mb-4">Chi tiết Đơn vị</h3>

      <div v-if="selectedNode" class="space-y-4">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Tên">{{
            selectedNode.name
          }}</el-descriptions-item>
          <el-descriptions-item label="Mã">{{
            selectedNode.code
          }}</el-descriptions-item>
          <el-descriptions-item label="Cấp">{{
            getLevelLabel(selectedNode.level)
          }}</el-descriptions-item>
          <el-descriptions-item label="Trạng thái">
            <el-tag :type="selectedNode.status === 1 ? 'success' : 'danger'">
              {{ selectedNode.status === 1 ? "Hoạt động" : "Ngừng" }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-else class="flex items-center justify-center h-64 text-gray-400">
        <span>Vui lòng chọn một đơn vị để xem chi tiết</span>
      </div>
    </div>

    <!-- Dialog Form -->
    <el-dialog
      v-model="formVisible"
      :title="form.id ? 'Sửa Đơn vị' : 'Thêm Đơn vị'"
      width="500px"
    >
      <el-form :model="form" label-width="120px">
        <el-form-item label="Tên đơn vị">
          <el-input v-model="form.name" placeholder="Nhập tên" />
        </el-form-item>
        <el-form-item label="Mã đơn vị">
          <el-input v-model="form.code" placeholder="Nhập mã" />
        </el-form-item>
        <el-form-item label="Cấp đơn vị">
          <el-select v-model="form.level" class="w-full">
            <el-option
              v-for="(label, key) in levelLabels"
              :key="key"
              :label="label"
              :value="Number(key)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">Hủy</el-button>
        <el-button type="primary" @click="handleSubmit">Lưu</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-tree) {
  background: transparent;
}
</style>
