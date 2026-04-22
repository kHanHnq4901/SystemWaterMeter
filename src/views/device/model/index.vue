<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import {
  getMeterModelList, addMeterModel, updateMeterModel, deleteMeterModel,
  getGatewayModelList, addGatewayModel, updateGatewayModel, deleteGatewayModel
} from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({ name: "DeviceModel" });

const activeTab = ref("meter");

// ─── Meter Model ───────────────────────────────────────────
const meterLoading = ref(false);
const meterList = ref<any[]>([]);
const meterFormRef = ref();
const meterKeyword = ref("");
const meterPagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const meterColumns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Mã Model",    prop: "meterModelId",   width: 150 },
  { label: "Mô tả",       prop: "meterModelDesc", minWidth: 200 },
  { label: "Hệ số (Constant)", prop: "constant",  width: 160 },
  { label: "Loại (Class)", prop: "class",         width: 140 },
  { label: "Thao tác", fixed: "right", width: 150, slot: "meterOp" }
];

async function loadMeterModels() {
  meterLoading.value = true;
  try {
    const { code, data } = await getMeterModelList({
      keyword: meterKeyword.value || undefined,
      currentPage: meterPagination.currentPage,
      pageSize: meterPagination.pageSize
    });
    if (code === 0 && data) { meterList.value = data.list ?? []; meterPagination.total = data.total ?? 0; }
  } finally { meterLoading.value = false; }
}

// ─── Gateway Model ─────────────────────────────────────────
const gwLoading = ref(false);
const gwList = ref<any[]>([]);
const gwFormRef = ref();
const gwKeyword = ref("");
const gwPagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const gwColumns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Mã Model",      prop: "gatewayModelId",    width: 150 },
  { label: "Mô tả (EN)",    prop: "gatewayModelDesc",  minWidth: 200 },
  { label: "Mô tả (VI)",    prop: "gatewayModelDescVn", minWidth: 200 },
  { label: "Thao tác", fixed: "right", width: 150, slot: "gwOp" }
];

async function loadGwModels() {
  gwLoading.value = true;
  try {
    const { code, data } = await getGatewayModelList({
      keyword: gwKeyword.value || undefined,
      currentPage: gwPagination.currentPage,
      pageSize: gwPagination.pageSize
    });
    if (code === 0 && data) { gwList.value = data.list ?? []; gwPagination.total = data.total ?? 0; }
  } finally { gwLoading.value = false; }
}

// ─── Dialog dùng chung ─────────────────────────────────────
const dialogVisible = ref(false);
const dialogTitle = ref("");
const dialogRef = ref();
const isEdit = ref(false);
const dialogType = ref<"meter" | "gateway">("meter");

const meterForm = reactive({ meterModelId: "", meterModelDesc: "", constant: "", cls: "" });
const gwForm = reactive({ gatewayModelId: "", gatewayModelDesc: "", gatewayModelDescVn: "" });

const meterRules = { meterModelId: [{ required: true, message: "Vui lòng nhập mã model", trigger: "blur" }] };
const gwRules    = { gatewayModelId: [{ required: true, message: "Vui lòng nhập mã model", trigger: "blur" }] };

function openMeterDialog(mode: "add" | "edit", row?: any) {
  dialogType.value = "meter";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm Model Đồng hồ" : "Sửa Model Đồng hồ";
  Object.assign(meterForm, {
    meterModelId:   row?.meterModelId   ?? "",
    meterModelDesc: row?.meterModelDesc ?? "",
    constant:       row?.constant       ?? "",
    cls:            row?.class          ?? ""
  });
  dialogVisible.value = true;
}

function openGwDialog(mode: "add" | "edit", row?: any) {
  dialogType.value = "gateway";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm Model Gateway" : "Sửa Model Gateway";
  Object.assign(gwForm, {
    gatewayModelId:    row?.gatewayModelId    ?? "",
    gatewayModelDesc:  row?.gatewayModelDesc  ?? "",
    gatewayModelDescVn: row?.gatewayModelDescVn ?? ""
  });
  dialogVisible.value = true;
}

async function handleSubmit() {
  try { await dialogRef.value.validate(); } catch { return; }

  let res: any;
  if (dialogType.value === "meter") {
    res = isEdit.value
      ? await updateMeterModel(meterForm.meterModelId, { meterModelDesc: meterForm.meterModelDesc, constant: meterForm.constant, cls: meterForm.cls })
      : await addMeterModel({ ...meterForm });
  } else {
    res = isEdit.value
      ? await updateGatewayModel(gwForm.gatewayModelId, { gatewayModelDesc: gwForm.gatewayModelDesc, gatewayModelDescVn: gwForm.gatewayModelDescVn })
      : await addGatewayModel({ ...gwForm });
  }

  if (res.code === 0) {
    message(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công", { type: "success" });
    dialogVisible.value = false;
    dialogType.value === "meter" ? loadMeterModels() : loadGwModels();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleMeterDelete(row: any) {
  const res = await deleteMeterModel(row.meterModelId);
  if (res.code === 0) { message(`Đã xóa: ${row.meterModelId}`, { type: "success" }); loadMeterModels(); }
  else message(res.message, { type: "error" });
}

async function handleGwDelete(row: any) {
  const res = await deleteGatewayModel(row.gatewayModelId);
  if (res.code === 0) { message(`Đã xóa: ${row.gatewayModelId}`, { type: "success" }); loadGwModels(); }
  else message(res.message, { type: "error" });
}

onMounted(() => { loadMeterModels(); loadGwModels(); });
</script>

<template>
  <div class="main">
    <el-tabs v-model="activeTab" class="px-4 pt-2">
      <!-- ─── Tab Model Đồng hồ ─── -->
      <el-tab-pane label="Model Đồng hồ" name="meter">
        <el-form ref="meterFormRef" :inline="true" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
          <el-form-item label="Tìm kiếm:">
            <el-input v-model="meterKeyword" placeholder="Mã hoặc mô tả" clearable class="w-52!"
              @keyup.enter="() => { meterPagination.currentPage = 1; loadMeterModels(); }" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="meterLoading"
              @click="() => { meterPagination.currentPage = 1; loadMeterModels(); }">
              Tìm kiếm
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)"
              @click="() => { meterKeyword = ''; meterPagination.currentPage = 1; loadMeterModels(); }">
              Đặt lại
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar title="Model Đồng hồ" :columns="meterColumns" @refresh="loadMeterModels">
          <template #buttons>
            <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openMeterDialog('add')">
              Thêm mới
            </el-button>
          </template>
          <template v-slot="{ size, dynamicColumns }">
            <pure-table adaptive :adaptiveConfig="{ offsetBottom: 108 }" align-whole="center"
              row-key="meterModelId" showOverflowTooltip table-layout="auto"
              :loading="meterLoading" :size="size" :data="meterList" :columns="dynamicColumns"
              :pagination="{ ...meterPagination, pageSizes: [20, 50, 100] }"
              :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
              @page-size-change="v => { meterPagination.pageSize = v; loadMeterModels(); }"
              @page-current-change="v => { meterPagination.currentPage = v; loadMeterModels(); }">
              <template #meterOp="{ row }">
                <el-button class="reset-margin" link type="primary" :size="size"
                  :icon="useRenderIcon(EditPen)" @click="openMeterDialog('edit', row)">Sửa</el-button>
                <el-popconfirm :title="`Xác nhận xóa model: ${row.meterModelId}?`" @confirm="handleMeterDelete(row)">
                  <template #reference>
                    <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">Xóa</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>

      <!-- ─── Tab Model Gateway ─── -->
      <el-tab-pane label="Model Gateway" name="gateway">
        <el-form ref="gwFormRef" :inline="true" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
          <el-form-item label="Tìm kiếm:">
            <el-input v-model="gwKeyword" placeholder="Mã hoặc mô tả" clearable class="w-52!"
              @keyup.enter="() => { gwPagination.currentPage = 1; loadGwModels(); }" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="gwLoading"
              @click="() => { gwPagination.currentPage = 1; loadGwModels(); }">
              Tìm kiếm
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)"
              @click="() => { gwKeyword = ''; gwPagination.currentPage = 1; loadGwModels(); }">
              Đặt lại
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar title="Model Gateway" :columns="gwColumns" @refresh="loadGwModels">
          <template #buttons>
            <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openGwDialog('add')">
              Thêm mới
            </el-button>
          </template>
          <template v-slot="{ size, dynamicColumns }">
            <pure-table adaptive :adaptiveConfig="{ offsetBottom: 108 }" align-whole="center"
              row-key="gatewayModelId" showOverflowTooltip table-layout="auto"
              :loading="gwLoading" :size="size" :data="gwList" :columns="dynamicColumns"
              :pagination="{ ...gwPagination, pageSizes: [20, 50, 100] }"
              :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
              @page-size-change="v => { gwPagination.pageSize = v; loadGwModels(); }"
              @page-current-change="v => { gwPagination.currentPage = v; loadGwModels(); }">
              <template #gwOp="{ row }">
                <el-button class="reset-margin" link type="primary" :size="size"
                  :icon="useRenderIcon(EditPen)" @click="openGwDialog('edit', row)">Sửa</el-button>
                <el-popconfirm :title="`Xác nhận xóa model: ${row.gatewayModelId}?`" @confirm="handleGwDelete(row)">
                  <template #reference>
                    <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">Xóa</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>
    </el-tabs>

    <!-- ─── Dialog dùng chung ─── -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" draggable>
      <!-- Form Meter Model -->
      <el-form v-if="dialogType === 'meter'" ref="dialogRef" :model="meterForm"
        :rules="meterRules" label-width="120px">
        <el-form-item label="Mã Model" prop="meterModelId">
          <el-input v-model="meterForm.meterModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="Mô tả">
          <el-input v-model="meterForm.meterModelDesc" />
        </el-form-item>
        <el-form-item label="Hệ số">
          <el-input v-model="meterForm.constant" />
        </el-form-item>
        <el-form-item label="Loại (Class)">
          <el-input v-model="meterForm.cls" />
        </el-form-item>
      </el-form>

      <!-- Form Gateway Model -->
      <el-form v-else ref="dialogRef" :model="gwForm" :rules="gwRules" label-width="120px">
        <el-form-item label="Mã Model" prop="gatewayModelId">
          <el-input v-model="gwForm.gatewayModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="Mô tả (EN)">
          <el-input v-model="gwForm.gatewayModelDesc" />
        </el-form-item>
        <el-form-item label="Mô tả (VI)">
          <el-input v-model="gwForm.gatewayModelDescVn" />
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
:deep(.el-tabs__header) { margin-bottom: 0; }

.search-form {
  :deep(.el-form-item) { margin-bottom: 12px; }
}
</style>
