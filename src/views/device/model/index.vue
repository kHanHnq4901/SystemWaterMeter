<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
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

const { t } = useI18n();

const activeTab = ref("meter");

// ─── Meter Model ───────────────────────────────────────────
const meterLoading = ref(false);
const meterList = ref<any[]>([]);
const meterFormRef = ref();
const meterKeyword = ref("");
const meterPagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const meterColumns = computed<TableColumnList>(() => [
  { type: "index", label: t("common.stt"), width: 60 },
  { label: t("device.model.code"),      prop: "meterModelId",   width: 150 },
  { label: t("device.model.description"), prop: "meterModelDesc", minWidth: 200 },
  { label: t("device.model.constantFull"), prop: "constant",    width: 160 },
  { label: t("device.model.class"),     prop: "class",          width: 140 },
  { label: t("common.action"), fixed: "right", width: 150, slot: "meterOp" }
]);

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

const gwColumns = computed<TableColumnList>(() => [
  { type: "index", label: t("common.stt"), width: 60 },
  { label: t("device.model.code"),         prop: "gatewayModelId",    width: 150 },
  { label: t("device.model.descriptionEn"), prop: "gatewayModelDesc",  minWidth: 200 },
  { label: t("device.model.descriptionVi"), prop: "gatewayModelDescVn", minWidth: 200 },
  { label: t("common.action"), fixed: "right", width: 150, slot: "gwOp" }
]);

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

// ─── Dialog ─────────────────────────────────────
const dialogVisible = ref(false);
const dialogTitle = ref("");
const dialogRef = ref();
const isEdit = ref(false);
const dialogType = ref<"meter" | "gateway">("meter");

const meterForm = reactive({ meterModelId: "", meterModelDesc: "", constant: "", cls: "" });
const gwForm = reactive({ gatewayModelId: "", gatewayModelDesc: "", gatewayModelDescVn: "" });

const meterRules = computed(() => ({
  meterModelId: [{ required: true, message: t("device.model.codeRequired"), trigger: "blur" }]
}));
const gwRules = computed(() => ({
  gatewayModelId: [{ required: true, message: t("device.model.codeRequired"), trigger: "blur" }]
}));

function openMeterDialog(mode: "add" | "edit", row?: any) {
  dialogType.value = "meter";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? t("device.model.addMeterModel") : t("device.model.editMeterModel");
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
  dialogTitle.value = mode === "add" ? t("device.model.addGatewayModel") : t("device.model.editGatewayModel");
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
    message(isEdit.value ? t("common.updateSuccess") : t("common.addSuccess"), { type: "success" });
    dialogVisible.value = false;
    dialogType.value === "meter" ? loadMeterModels() : loadGwModels();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleMeterDelete(row: any) {
  const res = await deleteMeterModel(row.meterModelId);
  if (res.code === 0) { message(t("common.deleteSuccess"), { type: "success" }); loadMeterModels(); }
  else message(res.message, { type: "error" });
}

async function handleGwDelete(row: any) {
  const res = await deleteGatewayModel(row.gatewayModelId);
  if (res.code === 0) { message(t("common.deleteSuccess"), { type: "success" }); loadGwModels(); }
  else message(res.message, { type: "error" });
}

onMounted(() => { loadMeterModels(); loadGwModels(); });
</script>

<template>
  <div class="main">
    <el-tabs v-model="activeTab" class="px-4 pt-2">
      <!-- ─── Tab Meter Model ─── -->
      <el-tab-pane :label="t('device.model.meterModel')" name="meter">
        <el-form ref="meterFormRef" :inline="true" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
          <el-form-item :label="t('common.search') + ':'">
            <el-input v-model="meterKeyword" :placeholder="t('common.search')" clearable class="w-52!"
              @keyup.enter="() => { meterPagination.currentPage = 1; loadMeterModels(); }" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="meterLoading"
              @click="() => { meterPagination.currentPage = 1; loadMeterModels(); }">
              {{ t("common.search") }}
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)"
              @click="() => { meterKeyword = ''; meterPagination.currentPage = 1; loadMeterModels(); }">
              {{ t("common.reset") }}
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar :title="t('device.model.meterModel')" :columns="meterColumns" @refresh="loadMeterModels">
          <template #buttons>
            <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openMeterDialog('add')">
              {{ t("common.add") }}
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
                  :icon="useRenderIcon(EditPen)" @click="openMeterDialog('edit', row)">{{ t("common.edit") }}</el-button>
                <el-popconfirm :title="`${t('device.model.confirmDelete')}: ${row.meterModelId}?`" @confirm="handleMeterDelete(row)">
                  <template #reference>
                    <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">{{ t("common.delete") }}</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>

      <!-- ─── Tab Gateway Model ─── -->
      <el-tab-pane :label="t('device.model.gatewayModel')" name="gateway">
        <el-form ref="gwFormRef" :inline="true" class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
          <el-form-item :label="t('common.search') + ':'">
            <el-input v-model="gwKeyword" :placeholder="t('common.search')" clearable class="w-52!"
              @keyup.enter="() => { gwPagination.currentPage = 1; loadGwModels(); }" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="gwLoading"
              @click="() => { gwPagination.currentPage = 1; loadGwModels(); }">
              {{ t("common.search") }}
            </el-button>
            <el-button :icon="useRenderIcon(Refresh)"
              @click="() => { gwKeyword = ''; gwPagination.currentPage = 1; loadGwModels(); }">
              {{ t("common.reset") }}
            </el-button>
          </el-form-item>
        </el-form>

        <PureTableBar :title="t('device.model.gatewayModel')" :columns="gwColumns" @refresh="loadGwModels">
          <template #buttons>
            <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openGwDialog('add')">
              {{ t("common.add") }}
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
                  :icon="useRenderIcon(EditPen)" @click="openGwDialog('edit', row)">{{ t("common.edit") }}</el-button>
                <el-popconfirm :title="`${t('device.model.confirmDelete')}: ${row.gatewayModelId}?`" @confirm="handleGwDelete(row)">
                  <template #reference>
                    <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">{{ t("common.delete") }}</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>
    </el-tabs>

    <!-- ─── Shared Dialog ─── -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" draggable>
      <el-form v-if="dialogType === 'meter'" ref="dialogRef" :model="meterForm"
        :rules="meterRules" label-width="130px">
        <el-form-item :label="t('device.model.code')" prop="meterModelId">
          <el-input v-model="meterForm.meterModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item :label="t('device.model.description')">
          <el-input v-model="meterForm.meterModelDesc" />
        </el-form-item>
        <el-form-item :label="t('device.model.constant')">
          <el-input v-model="meterForm.constant" />
        </el-form-item>
        <el-form-item :label="t('device.model.class')">
          <el-input v-model="meterForm.cls" />
        </el-form-item>
      </el-form>

      <el-form v-else ref="dialogRef" :model="gwForm" :rules="gwRules" label-width="130px">
        <el-form-item :label="t('device.model.code')" prop="gatewayModelId">
          <el-input v-model="gwForm.gatewayModelId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item :label="t('device.model.descriptionEn')">
          <el-input v-model="gwForm.gatewayModelDesc" />
        </el-form-item>
        <el-form-item :label="t('device.model.descriptionVi')">
          <el-input v-model="gwForm.gatewayModelDescVn" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="handleSubmit">{{ t("common.save") }}</el-button>
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
