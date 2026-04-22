<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { getMeterModelList, addMeterModel, updateMeterModel, deleteMeterModel } from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({ name: "ConfigMeterModel" });

const loading   = ref(false);
const dataList  = ref<any[]>([]);
const keyword   = ref("");
const formRef   = ref();
const dialogRef = ref();

const pagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const columns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Mã Model",         prop: "meterModelId",   width: 160 },
  { label: "Mô tả",            prop: "meterModelDesc", minWidth: 220 },
  { label: "Hệ số (Constant)", prop: "constant",       width: 160 },
  { label: "Loại (Class)",     prop: "class",          width: 140 },
  { label: "Thao tác", fixed: "right", width: 150, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getMeterModelList({
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
const form = reactive({ meterModelId: "", meterModelDesc: "", constant: "", cls: "" });
const rules = { meterModelId: [{ required: true, message: "Vui lòng nhập mã model", trigger: "blur" }] };

function openDialog(mode: "add" | "edit", row?: any) {
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm Model Đồng hồ" : "Sửa Model Đồng hồ";
  Object.assign(form, {
    meterModelId:   row?.meterModelId   ?? "",
    meterModelDesc: row?.meterModelDesc ?? "",
    constant:       row?.constant       ?? "",
    cls:            row?.class          ?? ""
  });
  dialogVisible.value = true;
}

async function handleSubmit() {
  try { await dialogRef.value.validate(); } catch { return; }
  const res = isEdit.value
    ? await updateMeterModel(form.meterModelId, { meterModelDesc: form.meterModelDesc, constant: form.constant, cls: form.cls })
    : await addMeterModel({ ...form });
  if (res.code === 0) {
    message(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công", { type: "success" });
    dialogVisible.value = false;
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleDelete(row: any) {
  const res = await deleteMeterModel(row.meterModelId);
  if (res.code === 0) { message(`Đã xóa: ${row.meterModelId}`, { type: "success" }); onSearch(); }
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

    <PureTableBar title="Cài đặt loại đồng hồ" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog('add')">
          Thêm mới
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table adaptive :adaptiveConfig="{ offsetBottom: 45 }" align-whole="center"
          row-key="meterModelId" showOverflowTooltip table-layout="auto"
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
            <el-popconfirm :title="`Xác nhận xóa model: ${row.meterModelId}?`" @confirm="handleDelete(row)">
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
      <el-form ref="dialogRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Mã Model" prop="meterModelId">
          <el-input v-model="form.meterModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="Mô tả">
          <el-input v-model="form.meterModelDesc" />
        </el-form-item>
        <el-form-item label="Hệ số">
          <el-input v-model="form.constant" />
        </el-form-item>
        <el-form-item label="Loại (Class)">
          <el-input v-model="form.cls" />
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
