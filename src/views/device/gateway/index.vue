<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from "vue";
import { useI18n } from "vue-i18n";
import { ElTag } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { getGatewayList, addGateway, updateGateway, deleteGateway } from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";
import View from "~icons/ep/view";

defineOptions({ name: "DeviceGateway" });

const { t } = useI18n();

const loading = ref(false);
const dataList = ref<any[]>([]);
const formRef = ref();
const dialogRef = ref();

const form = reactive({ keyword: "", gatewayType: "" });

const pagination = reactive({
  total: 0, pageSize: 20, currentPage: 1, background: true
});

// Dialog state
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isView = ref(false);
const dialogForm = reactive({
  gatewayNo: "", gatewayName: "", gatewayModelId: "",
  gatewayType: "", simCardNo: "", lineId: "",
  address: "", note: "", imei: "", version: "", coordinate: ""
});
const dialogRules = computed(() => ({
  gatewayNo:   [{ required: true, message: t("device.gateway.codeRequired"), trigger: "blur" }],
  gatewayName: [{ required: true, message: t("device.gateway.nameRequired"), trigger: "blur" }]
}));
const isEdit = ref(false);

const columns = computed<TableColumnList>(() => [
  { type: "index", label: t("common.stt"), width: 60 },
  { label: t("device.gateway.code"),         prop: "gatewayNo",      width: 130, fixed: "left" },
  { label: t("device.gateway.name"),         prop: "gatewayName",    minWidth: 160 },
  { label: t("device.gateway.type"),         prop: "gatewayType",    width: 80 },
  { label: "SIM",                            prop: "simCardNo",      width: 130 },
  { label: "IMEI",                           prop: "imei",           minWidth: 150, showOverflowTooltip: true },
  { label: t("device.gateway.version"),      prop: "version",        width: 100 },
  { label: t("common.address"),              prop: "address",        minWidth: 180, showOverflowTooltip: true },
  {
    label: t("device.gateway.lastConnected"), prop: "lasttimeConnect", minWidth: 165,
    formatter: ({ lasttimeConnect }) =>
      lasttimeConnect ? new Date(lasttimeConnect).toLocaleString("vi-VN") : "—"
  },
  {
    label: t("common.status"), prop: "lasttimeConnect", width: 110,
    cellRenderer: ({ row }) => {
      const last = row.lasttimeConnect ? new Date(row.lasttimeConnect).getTime() : 0;
      const online = last > Date.now() - 24 * 60 * 60 * 1000;
      return h(ElTag, { type: online ? "success" : "danger", size: "small" },
        { default: () => (online ? "Online" : "Offline") });
    }
  },
  { label: t("common.note"), prop: "note", minWidth: 150, showOverflowTooltip: true },
  { label: t("common.action"), fixed: "right", width: 190, slot: "operation" }
]);

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getGatewayList({
      keyword: form.keyword || undefined,
      gatewayType: form.gatewayType || undefined,
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    });
    if (code === 0 && data) {
      dataList.value = data.list ?? [];
      pagination.total = data.total ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formRef.value?.resetFields();
  pagination.currentPage = 1;
  onSearch();
}

function handleSizeChange(val: number) { pagination.pageSize = val; onSearch(); }
function handleCurrentChange(val: number) { pagination.currentPage = val; onSearch(); }

function openDialog(mode: "add" | "edit" | "view", row?: any) {
  isView.value = mode === "view";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? t("device.gateway.addTitle") : mode === "edit" ? t("device.gateway.editTitle") : t("device.gateway.detailTitle");

  if (row) {
    Object.assign(dialogForm, {
      gatewayNo: row.gatewayNo ?? "", gatewayName: row.gatewayName ?? "",
      gatewayModelId: row.gatewayModelId ?? "", gatewayType: row.gatewayType ?? "",
      simCardNo: row.simCardNo ?? "", lineId: row.lineId ?? "",
      address: row.address ?? "", note: row.note ?? "",
      imei: row.imei ?? "", version: row.version ?? "", coordinate: row.coordinate ?? ""
    });
  } else {
    Object.assign(dialogForm, {
      gatewayNo: "", gatewayName: "", gatewayModelId: "", gatewayType: "",
      simCardNo: "", lineId: "", address: "", note: "", imei: "", version: "", coordinate: ""
    });
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  try {
    await dialogRef.value.validate();
  } catch { return; }

  const payload = { ...dialogForm };
  const res = isEdit.value
    ? await updateGateway(dialogForm.gatewayNo, payload)
    : await addGateway(payload);

  if (res.code === 0) {
    message(isEdit.value ? t("common.updateSuccess") : t("common.addSuccess"), { type: "success" });
    dialogVisible.value = false;
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleDelete(row: any) {
  const res = await deleteGateway(row.gatewayNo);
  if (res.code === 0) {
    message(t("common.deleteSuccess"), { type: "success" });
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto"
    >
      <el-form-item :label="t('common.search') + ':'" prop="keyword">
        <el-input v-model="form.keyword" :placeholder="t('device.gateway.searchPlaceholder')" clearable class="w-52!" />
      </el-form-item>
      <el-form-item :label="t('device.gateway.type') + ':'" prop="gatewayType">
        <el-input v-model="form.gatewayType" :placeholder="t('device.gateway.typePlaceholder')" clearable class="w-36!" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="loading"
          @click="() => { pagination.currentPage = 1; onSearch(); }">
          {{ t("common.search") }}
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">{{ t("common.reset") }}</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar :title="t('device.gateway.management')" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog('add')">
          {{ t("common.add") }}
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table adaptive :adaptiveConfig="{ offsetBottom: 45 }" align-whole="center"
          row-key="gatewayNo" showOverflowTooltip table-layout="auto" :loading="loading"
          :size="size" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, pageSizes: [20, 50, 100] }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
          @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange">
          <template #operation="{ row }">
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(View)" @click="openDialog('view', row)">
              {{ t("common.view") }}
            </el-button>
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(EditPen)" @click="openDialog('edit', row)">
              {{ t("common.edit") }}
            </el-button>
            <el-popconfirm :title="`${t('device.gateway.confirmDelete')}: ${row.gatewayNo}?`" @confirm="handleDelete(row)">
              <template #reference>
                <el-button class="reset-margin" link type="danger" :size="size" :icon="useRenderIcon(Delete)">
                  {{ t("common.delete") }}
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" draggable>
      <el-form ref="dialogRef" :model="dialogForm" :rules="isView ? {} : dialogRules"
        label-width="120px" label-position="right">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('device.gateway.code')" prop="gatewayNo">
              <el-input v-model="dialogForm.gatewayNo" :disabled="isView || isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.gateway.name')" prop="gatewayName">
              <el-input v-model="dialogForm.gatewayName" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.gateway.type')">
              <el-input v-model="dialogForm.gatewayType" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Model ID">
              <el-input v-model="dialogForm.gatewayModelId" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIM">
              <el-input v-model="dialogForm.simCardNo" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IMEI">
              <el-input v-model="dialogForm.imei" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.gateway.version')">
              <el-input v-model="dialogForm.version" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Line ID">
              <el-input v-model="dialogForm.lineId" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="t('common.address')">
              <el-input v-model="dialogForm.address" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="t('device.gateway.coordinate')">
              <el-input v-model="dialogForm.coordinate" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="t('common.note')">
              <el-input v-model="dialogForm.note" type="textarea" :rows="2" :disabled="isView" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ isView ? t("common.close") : t("common.cancel") }}</el-button>
        <el-button v-if="!isView" type="primary" @click="handleSubmit">{{ t("common.save") }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) { margin-bottom: 12px; }
}
</style>
