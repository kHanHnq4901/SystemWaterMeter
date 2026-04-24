<script setup lang="ts">
import { ref, reactive, onMounted, h } from "vue";
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

// ── Regions ──────────────────────────────────────────────────────────────────
const regionList = ref<{ id: number; name: string; parentId: number | null }[]>([]);
async function loadRegions() {
  const res = await getAllRegions();
  regionList.value = (res.data as any) ?? [];
}
function regionLabel(id: number | null) {
  if (!id) return "—";
  return regionList.value.find(r => r.id === id)?.name ?? String(id);
}

// ── Table ─────────────────────────────────────────────────────────────────────
const loading  = ref(false);
const dataList = ref<any[]>([]);
const formRef  = ref();
const dialogRef = ref();
const form = reactive({ keyword: "", state: "", meterType: "", regionId: "" });
const pagination = reactive({ total: 0, pageSize: 20, currentPage: 1, background: true });

const STATE_MAP: Record<number, { label: string; type: string }> = {
  0: { label: "Chưa lắp",  type: "info"    },
  1: { label: "Đang dùng", type: "success" },
  2: { label: "Hỏng",      type: "danger"  },
  3: { label: "Tháo ra",   type: "warning" }
};

const columns: TableColumnList = [
  { type: "index", label: "STT", width: 55, fixed: "left" },
  { label: "Mã ĐH",     prop: "meterNo",      width: 130, fixed: "left" },
  { label: "Tên ĐH",    prop: "meterName",    minWidth: 150 },
  { label: "Vùng",      prop: "regionName",   width: 140,
    cellRenderer: ({ row }) =>
      h("span", { style: row.regionName ? "color:var(--el-color-primary)" : "color:var(--el-text-color-placeholder)" },
        row.regionName ?? "Chưa phân vùng")
  },
  { label: "Mã KH",     prop: "customerCode", width: 110 },
  { label: "SĐT",       prop: "phone",        width: 115 },
  { label: "Địa chỉ",   prop: "address",      minWidth: 175, showOverflowTooltip: true },
  { label: "Size ống",  prop: "pipeSize",     width: 90  },
  { label: "SIM",       prop: "simCardNo",    width: 130 },
  { label: "IMEI",      prop: "imei",         minWidth: 150, showOverflowTooltip: true },
  {
    label: "Trạng thái", prop: "state", width: 110,
    cellRenderer: ({ row }) => {
      const s = STATE_MAP[row.state] ?? { label: `${row.state}`, type: "info" };
      return h(ElTag, { type: s.type as any, size: "small" }, { default: () => s.label });
    }
  },
  {
    label: "Dữ liệu cuối", prop: "lasttimeData", minWidth: 160,
    formatter: ({ lasttimeData }) =>
      lasttimeData ? new Date(lasttimeData).toLocaleString("vi-VN") : "—"
  },
  { label: "Thao tác", fixed: "right", width: 185, slot: "operation" }
];

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

const dialogRules = {
  meterNo:   [{ required: true, message: "Vui lòng nhập mã đồng hồ", trigger: "blur" }],
  meterName: [{ required: true, message: "Vui lòng nhập tên đồng hồ", trigger: "blur" }]
};

function openDialog(mode: "add" | "edit" | "view", row?: any) {
  isView.value = mode === "view";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm đồng hồ" : mode === "edit" ? "Sửa đồng hồ" : "Chi tiết đồng hồ";

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
    message(isEdit.value ? "Cập nhật thành công" : "Thêm mới thành công", { type: "success" });
    dialogVisible.value = false;
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

async function handleDelete(row: any) {
  const res = await deleteWaterMeter(row.meterNo);
  if (res.code === 0) {
    message(`Đã xóa: ${row.meterNo}`, { type: "success" });
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
    <!-- Search bar -->
    <el-form ref="formRef" :inline="true" :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="Tìm kiếm" prop="keyword">
        <el-input v-model="form.keyword" placeholder="Mã ĐH / Tên / Mã KH" clearable class="!w-52" />
      </el-form-item>
      <el-form-item label="Vùng" prop="regionId">
        <el-select v-model="form.regionId" placeholder="Tất cả vùng" clearable class="!w-44">
          <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Trạng thái" prop="state">
        <el-select v-model="form.state" placeholder="Tất cả" clearable class="!w-36">
          <el-option label="Chưa lắp"  :value="0" />
          <el-option label="Đang dùng" :value="1" />
          <el-option label="Hỏng"      :value="2" />
          <el-option label="Tháo ra"   :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="useRenderIcon('ri/search-line')" :loading="loading"
          @click="() => { pagination.currentPage = 1; onSearch(); }">
          Tìm kiếm
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">Đặt lại</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="Quản lý Đồng hồ" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" :icon="useRenderIcon(AddFill)" @click="openDialog('add')">
          Thêm mới
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
              :icon="useRenderIcon(View)" @click="openDialog('view', row)">Xem</el-button>
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(EditPen)" @click="openDialog('edit', row)">Sửa</el-button>
            <el-popconfirm :title="`Xác nhận xóa đồng hồ: ${row.meterNo}?`" @confirm="handleDelete(row)">
              <template #reference>
                <el-button class="reset-margin" link type="danger" :size="size"
                  :icon="useRenderIcon(Delete)">Xóa</el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- Dialog thêm / sửa / xem -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" draggable>
      <el-form ref="dialogRef" :model="dialogForm" :rules="isView ? {} : dialogRules"
        label-width="120px" label-position="right">
        <el-row :gutter="16">

          <!-- Mã + Tên -->
          <el-col :span="12">
            <el-form-item label="Mã đồng hồ" prop="meterNo">
              <el-input v-model="dialogForm.meterNo" :disabled="isView || isEdit" placeholder="VD: DH001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Tên đồng hồ" prop="meterName">
              <el-input v-model="dialogForm.meterName" :disabled="isView" />
            </el-form-item>
          </el-col>

          <!-- Vùng -->
          <el-col :span="12">
            <el-form-item label="Vùng">
              <el-select v-model="dialogForm.regionId" placeholder="Chọn vùng" clearable :disabled="isView" class="!w-full">
                <el-option v-for="r in regionList" :key="r.id" :label="r.name" :value="r.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Trạng thái">
              <el-select v-model="dialogForm.state" :disabled="isView" class="!w-full">
                <el-option label="Chưa lắp"  :value="0" />
                <el-option label="Đang dùng" :value="1" />
                <el-option label="Hỏng"      :value="2" />
                <el-option label="Tháo ra"   :value="3" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- Khách hàng -->
          <el-col :span="12">
            <el-form-item label="Mã khách hàng">
              <el-input v-model="dialogForm.customerCode" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Số điện thoại">
              <el-input v-model="dialogForm.phone" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Địa chỉ">
              <el-input v-model="dialogForm.address" :disabled="isView" />
            </el-form-item>
          </el-col>

          <!-- Thiết bị -->
          <el-col :span="12">
            <el-form-item label="Loại ĐH">
              <el-input v-model="dialogForm.meterType" :disabled="isView" placeholder="VD: 1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Kích thước ống">
              <el-input v-model="dialogForm.pipeSize" :disabled="isView" placeholder="VD: DN20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Model">
              <el-input v-model="dialogForm.meterModelId" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Bảo hành (tháng)">
              <el-input-number v-model="dialogForm.warranty" :disabled="isView" :min="0" class="!w-full" />
            </el-form-item>
          </el-col>

          <!-- Module / SIM -->
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
            <el-form-item label="Module No">
              <el-input v-model="dialogForm.moduleNo" :disabled="isView" />
            </el-form-item>
          </el-col>

          <!-- Ghi chú -->
          <el-col :span="24">
            <el-form-item label="Ghi chú">
              <el-input v-model="dialogForm.note" type="textarea" :rows="2" :disabled="isView" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ isView ? "Đóng" : "Hủy" }}</el-button>
        <el-button v-if="!isView" type="primary" @click="handleSubmit">Lưu</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) { margin-bottom: 12px; }
}
</style>
