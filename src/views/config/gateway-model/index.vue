<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { getGatewayModelList, addGatewayModel, updateGatewayModel, deleteGatewayModel } from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({ name: "ConfigGatewayModel" });

const loading   = ref(false);
const dataList  = ref<any[]>([]);
const keyword   = ref("");
const formRef   = ref();
const dialogRef = ref();

const pagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const columns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Mã Model",    prop: "gatewayModelId",     width: 160 },
  { label: "Mô tả (EN)", prop: "gatewayModelDesc",   minWidth: 200 },
  { label: "Mô tả (VI)", prop: "gatewayModelDescVn", minWidth: 200 },
  { label: "Thao tác", fixed: "right", width: 150, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getGatewayModelList({
      keyword: keyword.value || undefined,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (code === 0 && data) { dataList.value = data.list ?? []; pagination.total = data.total ?? 0; }
  } finally { loading.value = false; }
}

function resetSearch() { keyword.value = ""; pagination.currentPage = 1; onSearch(); }

// Dialog
const dialogVisible = ref(false);
const dialogTitle   = ref("");
const isEdit        = ref(false);
const form = reactive({ gatewayModelId: "", gatewayModelDesc: "", gatewayModelDescVn: "" });
const rules = { gatewayModelId: [{ required: true, message: "Vui lòng nhập mã model", trigger: "blur" }] };

function openDialog(mode: "add" | "edit", row?: any) {
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm Model Gateway" : "Sửa Model Gateway";
  Object.assign(form, {
    gatewayModelId:     row?.gatewayModelId     ?? "",
    gatewayModelDesc:   row?.gatewayModelDesc   ?? "",
    gatewayModelDescVn: row?.gatewayModelDescVn ?? ""
  });
  dialogVisible.value = true;
}

async function handleSubmit() {
  try { await dialogRef.value.validate(); } catch { return; }
  const res = isEdit.value
    ? await updateGatewayModel(form.gatewayModelId, { gatewayModelDesc: form.gatewayModelDesc, gatewayModelDescVn: form.gatewayModelDescVn })
    : await addGatewayModel({ ...form });
  if (res.code === 0) {
    message(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công", { type: "success" });
    dialogVisible.value = false;
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleDelete(row: any) {
  const res = await deleteGatewayModel(row.gatewayModelId);
  if (res.code === 0) { message(`Đã xóa: ${row.gatewayModelId}`, { type: "success" }); onSearch(); }
  else message(res.message, { type: "error" });
}

onMounted(() => onSearch());
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="Tìm kiếm:">
        <el-input v-model="keyword" placeholder="Mã hoặc mô tả model" clearable class="w-56!"
          @keyup.enter="() => { pagination.currentPage = 1; onSearch(); }" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="loading"
          @click="() => { pagination.currentPage = 1; onSearch(); }">
          Tìm kiếm
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetSearch">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="Cài đặt kiểu Gateway" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog('add')">
          Thêm mới
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table adaptive :adaptiveConfig="{ offsetBottom: 45 }" align-whole="center"
          row-key="gatewayModelId" showOverflowTooltip table-layout="auto"
          :loading="loading" :size="size" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, pageSizes: [20, 50, 100] }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
          @page-size-change="v => { pagination.pageSize = v; onSearch(); }"
          @page-current-change="v => { pagination.currentPage = v; onSearch(); }">
          <template #operation="{ row }">
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(EditPen)" @click="openDialog('edit', row)">
              Sửa
            </el-button>
            <el-popconfirm :title="`Xác nhận xóa model: ${row.gatewayModelId}?`" @confirm="handleDelete(row)">
              <template #reference>
                <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">
                  Xóa
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" draggable>
      <el-form ref="dialogRef" :model="form" :rules="rules" label-width="130px">
        <el-form-item label="Mã Model" prop="gatewayModelId">
          <el-input v-model="form.gatewayModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="Mô tả (EN)">
          <el-input v-model="form.gatewayModelDesc" />
        </el-form-item>
        <el-form-item label="Mô tả (VI)">
          <el-input v-model="form.gatewayModelDescVn" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="handleSubmit">Lưu</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) { margin-bottom: 12px; }
}
</style>
