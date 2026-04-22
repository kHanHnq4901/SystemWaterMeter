<script setup lang="ts">
import { ref, reactive, onMounted, h } from "vue";
import { ElTag } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { getWaterMeterList, addWaterMeter, updateWaterMeter, deleteWaterMeter } from "@/api/waterMeter";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";
import View from "~icons/ep/view";

defineOptions({ name: "DeviceMeter" });

const loading = ref(false);
const dataList = ref<any[]>([]);
const formRef = ref();
const dialogRef = ref();

const form = reactive({ keyword: "", state: "", meterType: "" });

const pagination = reactive({
  total: 0, pageSize: 20, currentPage: 1, background: true
});

const STATE_MAP: Record<number, { label: string; type: string }> = {
  0: { label: "Chưa lắp",  type: "info"    },
  1: { label: "Đang dùng", type: "success" },
  2: { label: "Hỏng",      type: "danger"  },
  3: { label: "Tháo ra",   type: "warning" }
};

// Dialog state
const dialogVisible = ref(false);
const dialogTitle = ref("");
const isView = ref(false);
const isEdit = ref(false);
const dialogForm = reactive({
  meterNo: "", meterName: "", meterModelId: "", meterType: "",
  customerCode: "", phone: "", address: "", pipeSize: "",
  state: 0, simCardNo: "", imei: "", moduleNo: "",
  lineId: "", groupId: "", note: "", warranty: ""
});
const dialogRules = {
  meterNo:   [{ required: true, message: "Vui lòng nhập mã đồng hồ", trigger: "blur" }],
  meterName: [{ required: true, message: "Vui lòng nhập tên đồng hồ", trigger: "blur" }]
};

const columns: TableColumnList = [
  { type: "index", label: "STT", width: 60 },
  { label: "Mã ĐH",     prop: "meterNo",      width: 130, fixed: "left" },
  { label: "Tên ĐH",    prop: "meterName",    minWidth: 150 },
  { label: "Mã KH",     prop: "customerCode", width: 110 },
  { label: "SĐT",       prop: "phone",        width: 120 },
  { label: "Địa chỉ",   prop: "address",      minWidth: 180, showOverflowTooltip: true },
  { label: "Kích thước",prop: "pipeSize",      width: 100 },
  { label: "Loại",      prop: "meterType",    width: 80 },
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
    label: "Dữ liệu lần cuối", prop: "lasttimeData", minWidth: 165,
    formatter: ({ lasttimeData }) =>
      lasttimeData ? new Date(lasttimeData).toLocaleString("vi-VN") : "—"
  },
  { label: "Thao tác", fixed: "right", width: 190, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { code, data } = await getWaterMeterList({
      keyword:   form.keyword   || undefined,
      state:     form.state     !== "" ? form.state     : undefined,
      meterType: form.meterType !== "" ? form.meterType : undefined,
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

function handleSizeChange(val: number) { pagination.pageSize = val; onSearch(); }
function handleCurrentChange(val: number) { pagination.currentPage = val; onSearch(); }

function openDialog(mode: "add" | "edit" | "view", row?: any) {
  isView.value = mode === "view";
  isEdit.value = mode === "edit";
  dialogTitle.value = mode === "add" ? "Thêm đồng hồ" : mode === "edit" ? "Sửa đồng hồ" : "Chi tiết đồng hồ";

  if (row) {
    Object.assign(dialogForm, {
      meterNo: row.meterNo ?? "", meterName: row.meterName ?? "",
      meterModelId: row.meterModelId ?? "", meterType: row.meterType ?? "",
      customerCode: row.customerCode ?? "", phone: row.phone ?? "",
      address: row.address ?? "", pipeSize: row.pipeSize ?? "",
      state: row.state ?? 0, simCardNo: row.simCardNo ?? "",
      imei: row.imei ?? "", moduleNo: row.moduleNo ?? "",
      lineId: row.lineId ?? "", groupId: row.groupId ?? "",
      note: row.note ?? "", warranty: row.warranty ?? ""
    });
  } else {
    Object.assign(dialogForm, {
      meterNo: "", meterName: "", meterModelId: "", meterType: "",
      customerCode: "", phone: "", address: "", pipeSize: "",
      state: 0, simCardNo: "", imei: "", moduleNo: "",
      lineId: "", groupId: "", note: "", warranty: ""
    });
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  try { await dialogRef.value.validate(); } catch { return; }

  const res = isEdit.value
    ? await updateWaterMeter(dialogForm.meterNo, { ...dialogForm })
    : await addWaterMeter({ ...dialogForm });

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
    message(`Đã xóa đồng hồ: ${row.meterNo}`, { type: "success" });
    onSearch();
  } else {
    message(res.message, { type: "error" });
  }
}

onMounted(() => onSearch());
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto">
      <el-form-item label="Tìm kiếm:" prop="keyword">
        <el-input v-model="form.keyword" placeholder="Mã ĐH / Tên / Mã KH" clearable class="w-52!" />
      </el-form-item>
      <el-form-item label="Trạng thái:" prop="state">
        <el-select v-model="form.state" placeholder="Tất cả" clearable class="w-36!">
          <el-option label="Chưa lắp"  :value="0" />
          <el-option label="Đang dùng" :value="1" />
          <el-option label="Hỏng"      :value="2" />
          <el-option label="Tháo ra"   :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item label="Loại:" prop="meterType">
        <el-input v-model="form.meterType" placeholder="Loại đồng hồ" clearable class="w-36!" />
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
              :icon="useRenderIcon(View)" @click="openDialog('view', row)">
              Xem
            </el-button>
            <el-button class="reset-margin" link type="primary" :size="size"
              :icon="useRenderIcon(EditPen)" @click="openDialog('edit', row)">
              Sửa
            </el-button>
            <el-popconfirm :title="`Xác nhận xóa đồng hồ: ${row.meterNo}?`" @confirm="handleDelete(row)">
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

    <!-- Dialog Thêm/Sửa/Xem -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="680px" draggable>
      <el-form ref="dialogRef" :model="dialogForm" :rules="isView ? {} : dialogRules"
        label-width="110px" label-position="right">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Mã ĐH" prop="meterNo">
              <el-input v-model="dialogForm.meterNo" :disabled="isView || isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Tên ĐH" prop="meterName">
              <el-input v-model="dialogForm.meterName" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Mã KH">
              <el-input v-model="dialogForm.customerCode" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SĐT">
              <el-input v-model="dialogForm.phone" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Loại">
              <el-input v-model="dialogForm.meterType" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Kích thước ống">
              <el-input v-model="dialogForm.pipeSize" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Trạng thái">
              <el-select v-model="dialogForm.state" :disabled="isView" class="w-full!">
                <el-option label="Chưa lắp"  :value="0" />
                <el-option label="Đang dùng" :value="1" />
                <el-option label="Hỏng"      :value="2" />
                <el-option label="Tháo ra"   :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Model ID">
              <el-input v-model="dialogForm.meterModelId" :disabled="isView" />
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
            <el-form-item label="Module No">
              <el-input v-model="dialogForm.moduleNo" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Bảo hành (tháng)">
              <el-input v-model="dialogForm.warranty" :disabled="isView" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Địa chỉ">
              <el-input v-model="dialogForm.address" :disabled="isView" />
            </el-form-item>
          </el-col>
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
