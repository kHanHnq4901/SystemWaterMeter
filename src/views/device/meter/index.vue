<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from "vue";
import { useI18n } from "vue-i18n";
import { ElTag } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { getWaterMeterList, addWaterMeter, updateWaterMeter, deleteWaterMeter } from "@/api/waterMeter";
import { getAllRegions } from "@/api/region";
import Refresh  from "~icons/ep/refresh";
import Delete   from "~icons/ep/delete";
import EditPen  from "~icons/ep/edit-pen";
import AddFill  from "~icons/ri/add-circle-line";
import View     from "~icons/ep/view";

defineOptions({ name: "DeviceMeter" });

const { t } = useI18n();

// ── Regions ──────────────────────────────────────────────────────────────────
const regionList = ref<{ id: number; name: string; parentId: number | null }[]>([]);
async function loadRegions() {
  const res = await getAllRegions();
  regionList.value = (res.data as any) ?? [];
}

// ── Table ─────────────────────────────────────────────────────────────────────
const loading  = ref(false);
const dataList = ref<any[]>([]);
const formRef  = ref();
const dialogRef = ref();
const form = reactive({ keyword: "", state: "", meterType: "", regionId: "" });
const pagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const stateMap = computed<Record<number, { label: string; type: string }>>(() => ({
  0: { label: t("device.meter.stateNotInstalled"), type: "info"    },
  1: { label: t("device.meter.stateInUse"),        type: "success" },
  2: { label: t("device.meter.stateBroken"),       type: "danger"  },
  3: { label: t("device.meter.stateRemoved"),      type: "warning" }
}));

const columns = computed<TableColumnList>(() => [
  { type: "index", label: t("common.stt"), width: 55, fixed: "left" },
  { label: t("device.meter.codeShort"),     prop: "meterNo",      width: 130, fixed: "left" },
  { label: t("device.meter.nameShort"),     prop: "meterName",    minWidth: 150 },
  { label: t("device.meter.zone"),          prop: "regionName",   width: 140,
    cellRenderer: ({ row }) =>
      h("span", { style: row.regionName ? "color:var(--el-color-primary)" : "color:var(--el-text-color-placeholder)" },
        row.regionName ?? t("device.meter.unzoned"))
  },
  { label: t("device.meter.customerCode"), prop: "customerCode", width: 110 },
  { label: t("device.meter.phone"),        prop: "phone",        width: 115 },
  { label: t("device.meter.address"),      prop: "address",      minWidth: 175, showOverflowTooltip: true },
  { label: t("device.meter.pipeSizeShort"), prop: "pipeSize",    width: 90  },
  { label: "SIM",                          prop: "simCardNo",    width: 130 },
  { label: "IMEI",                         prop: "imei",         minWidth: 150, showOverflowTooltip: true },
  {
    label: t("common.status"), prop: "state", width: 110,
    cellRenderer: ({ row }) => {
      const s = stateMap.value[row.state] ?? { label: `${row.state}`, type: "info" };
      return h(ElTag, { type: s.type as any, size: "small" }, { default: () => s.label });
    }
  },
  {
    label: t("device.meter.lastData"), prop: "lasttimeData", minWidth: 160,
    formatter: ({ lasttimeData }) =>
      lasttimeData ? new Date(lasttimeData).toLocaleString("vi-VN") : "—"
  },
  { label: t("common.action"), fixed: "right", width: 185, slot: "operation" }
]);

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getWaterMeterList({
      keyword:   form.keyword   || undefined,
      state:     form.state     !== "" ? form.state     : undefined,
      meterType: form.meterType !== "" ? form.meterType : undefined,
      lineId:    form.regionId  !== "" ? form.regionId  : undefined,
      currentPage: pagination.currentPage,
      pageSize:    pagination.pageSize
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

// ── Dialog ────────────────────────────────────────────────────────────────────
const dialogVisible = ref(false);
const dialogTitle   = ref("");
const isView = ref(false);
const isEdit = ref(false);

const EMPTY_FORM = () => ({
  meterNo: "", meterName: "", meterModelId: "", meterType: 0,
  customerCode: "", phone: "", address: "", pipeSize: "",
  state: 0, simCardNo: "", imei: "", moduleNo: "",
  regionId: null as number | null,
  groupId: null as number | null,
  note: "", warranty: null as number | null
});
const dialogForm = reactive(EMPTY_FORM());

const dialogRules = computed(() => ({
  meterNo:   [{ required: true, message: t("device.meter.codeRequired"), trigger: "blur" }],
  meterName: [{ required: true, message: t("device.meter.nameRequired"), trigger: "blur" }]
}));

function openDialog(mode: "add" | "edit" | "view", row?: any) {
  isView.value = mode === "view";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? t("device.meter.addTitle") : mode === "edit" ? t("device.meter.editTitle") : t("device.meter.detailTitle");

  if (row) {
    Object.assign(dialogForm, {
      meterNo:      row.meterNo      ?? "",
      meterName:    row.meterName    ?? "",
      meterModelId: row.meterModelId ?? "",
      meterType:    row.meterType    ?? 0,
      customerCode: row.customerCode ?? "",
      phone:        row.phone        ?? "",
      address:      row.address      ?? "",
      pipeSize:     row.pipeSize     ?? "",
      state:        row.state        ?? 0,
      simCardNo:    row.simCardNo    ?? "",
      imei:         row.imei         ?? "",
      moduleNo:     row.moduleNo     ?? "",
      regionId:     row.regionId     ?? null,
      groupId:      row.groupId      ?? null,
      note:         row.note         ?? "",
      warranty:     row.warranty     ?? null
    });
  } else {
    Object.assign(dialogForm, EMPTY_FORM());
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  try { await dialogRef.value.validate(); } catch { return; }
  const payload = { ...dialogForm };
  const res = isEdit.value
    ? await updateWaterMeter(dialogForm.meterNo, payload)
    : await addWaterMeter(payload);
  if (res.code === 0) {
    message(isEdit.value ? t("common.updateSuccess") : t("common.addSuccess"), { type: "success" });
    dialogVisible.value = false;
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleDelete(row: any) {
  const res = await deleteWaterMeter(row.meterNo);
  if (res.code === 0) {
    message(t("common.deleteSuccess"), { type: "success" });
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

function handleSizeChange(val: number)    { pagination.pageSize    = val; onSearch(); }
function handleCurrentChange(val: number) { pagination.currentPage = val; onSearch(); }

onMounted(() => { loadRegions(); onSearch(); });
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item :label="t('common.search')" prop="keyword">
        <el-input v-model="form.keyword" :placeholder="t('device.meter.searchPlaceholder')" clearable class="!w-52" />
      </el-form-item>
      <el-form-item :label="t('device.meter.zone')" prop="regionId">
        <el-select v-model="form.regionId" :placeholder="t('device.meter.allZones')" clearable class="!w-44">
          <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('common.status')" prop="state">
        <el-select v-model="form.state" :placeholder="t('common.all')" clearable class="!w-36">
          <el-option :label="t('device.meter.stateNotInstalled')" :value="0" />
          <el-option :label="t('device.meter.stateInUse')"        :value="1" />
          <el-option :label="t('device.meter.stateBroken')"       :value="2" />
          <el-option :label="t('device.meter.stateRemoved')"      :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="loading"
          @click="() => { pagination.currentPage = 1; onSearch(); }">
          {{ t("common.search") }}
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">{{ t("common.reset") }}</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar :title="t('device.meter.management')" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog('add')">
          {{ t("common.add") }}
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table adaptive :adaptiveConfig="{ offsetBottom: 45 }" align-whole="center"
          row-key="meterNo" showOverflowTooltip table-layout="auto" :loading="loading"
          :size="size" :data="dataList" :columns="dynamicColumns"
          :pagination="{ ...pagination, pageSizes: [20, 50, 100] }"
          :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"
          @page-size-change="handleSizeChange" @page-current-change="handleCurrentChange">
          <template #operation="{ row }">
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(View)" @click="openDialog('view', row)">{{ t("common.view") }}</el-button>
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(EditPen)" @click="openDialog('edit', row)">{{ t("common.edit") }}</el-button>
            <el-popconfirm :title="`${t('device.meter.confirmDelete')}: ${row.meterNo}?`" @confirm="handleDelete(row)">
              <template #reference>
                <el-button class="reset-margin" link type="danger" :size="size"
                  :icon="useRenderIcon(Delete)">{{ t("common.delete") }}</el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" draggable>
      <el-form ref="dialogRef" :model="dialogForm" :rules="isView ? {} : dialogRules"
        label-width="130px" label-position="right">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('device.meter.code')" prop="meterNo">
              <el-input v-model="dialogForm.meterNo" :disabled="isView || isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.name')" prop="meterName">
              <el-input v-model="dialogForm.meterName" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.zone')">
              <el-select v-model="dialogForm.regionId" :placeholder="t('device.meter.zone')" clearable :disabled="isView" class="!w-full">
                <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('common.status')">
              <el-select v-model="dialogForm.state" :disabled="isView" class="!w-full">
                <el-option :label="t('device.meter.stateNotInstalled')" :value="0" />
                <el-option :label="t('device.meter.stateInUse')"        :value="1" />
                <el-option :label="t('device.meter.stateBroken')"       :value="2" />
                <el-option :label="t('device.meter.stateRemoved')"      :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.customerCodeFull')">
              <el-input v-model="dialogForm.customerCode" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.phone')">
              <el-input v-model="dialogForm.phone" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="t('device.meter.address')">
              <el-input v-model="dialogForm.address" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.meterType')">
              <el-input v-model="dialogForm.meterType" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.pipeSize')">
              <el-input v-model="dialogForm.pipeSize" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Model">
              <el-input v-model="dialogForm.meterModelId" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('device.meter.warranty')">
              <el-input-number v-model="dialogForm.warranty" :disabled="isView" :min="0" class="!w-full" />
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
            <el-form-item :label="t('device.meter.moduleNo')">
              <el-input v-model="dialogForm.moduleNo" :disabled="isView" />
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
