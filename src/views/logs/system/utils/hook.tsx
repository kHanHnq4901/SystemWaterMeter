import dayjs from "dayjs";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, ref, reactive, computed, onMounted } from "vue";
import {
  getSystemLogsList,
  clearSystemLogs,
  batchDeleteSystemLogs
} from "@/api/system";

export function useRole(tableRef: Ref) {
  const form = reactive({
    module: "",
    requestTime: [] as Date[]
  });

  const loading = ref(true);
  const dataList = ref([]);
  const selectedNum = ref(0);
  const selectedIds = ref<number[]>([]);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns = computed<TableColumnList>(() => [
    { type: "selection", width: 55, reserveSelection: true },
    { type: "index", label: "STT", width: 60 },
    { label: "Người dùng", prop: "username", minWidth: 120 },
    { label: "Thao tác", prop: "operation", minWidth: 140 },
    { label: "Phương thức", prop: "method", minWidth: 200, showOverflowTooltip: true },
    { label: "Tham số", prop: "params", minWidth: 180, showOverflowTooltip: true },
    {
      label: "TG (ms)",
      prop: "time",
      width: 110,
      cellRenderer: ({ row }) => {
        const ms = Number(row.time);
        const type = ms < 500 ? "success" : ms < 1000 ? "warning" : "danger";
        return <el-tag type={type} size="small" effect="light">{row.time} ms</el-tag>;
      }
    },
    { label: "Địa chỉ IP", prop: "ip", width: 140 },
    {
      label: "Thời gian",
      prop: "createTime",
      minWidth: 165,
      formatter: ({ createTime }) =>
        createTime ? dayjs(createTime).format("DD/MM/YYYY HH:mm:ss") : ""
    },
    { label: "Thao tác", fixed: "right", width: 90, slot: "operation" }
  ]);

  async function onSearch() {
    loading.value = true;
    try {
      const [startTime, endTime] = form.requestTime ?? [];
      const { code, data } = await getSystemLogsList({
        module: form.module || undefined,
        startTime: startTime
          ? dayjs(startTime).format("YYYY-MM-DD HH:mm:ss")
          : undefined,
        endTime: endTime
          ? dayjs(endTime).format("YYYY-MM-DD HH:mm:ss")
          : undefined,
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      if (code === 0 && data) {
        dataList.value = data.list ?? [];
        pagination.total = data.total ?? 0;
        pagination.pageSize = data.pageSize ?? 10;
        pagination.currentPage = data.currentPage ?? 1;
      }
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    pagination.currentPage = 1;
    onSearch();
  }

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange(selection: any[]) {
    selectedNum.value = selection.length;
    selectedIds.value = selection.map(s => s.id);
  }

  function onSelectionCancel() {
    selectedNum.value = 0;
    selectedIds.value = [];
    tableRef.value?.clearSelection?.();
  }

  function handleCellDblclick(row: any, column: any) {
    const val = row[column.property];
    if (val !== undefined && val !== null) {
      navigator.clipboard?.writeText(String(val));
      message("Đã sao chép nội dung ô", { type: "success" });
    }
  }

  function onDetail(row: any) {
    ElMessageBox.alert(
      `<div style="line-height:1.8">
        <p><b>Người dùng:</b> ${row.username ?? ""}</p>
        <p><b>Thao tác:</b> ${row.operation ?? ""}</p>
        <p><b>Phương thức:</b> ${row.method ?? ""}</p>
        <p><b>Tham số:</b> <span style="word-break:break-all">${row.params ?? ""}</span></p>
        <p><b>Thời gian (ms):</b> ${row.time ?? ""}</p>
        <p><b>Địa chỉ IP:</b> ${row.ip ?? ""}</p>
        <p><b>Thời gian tạo:</b> ${row.createTime ? dayjs(row.createTime).format("DD/MM/YYYY HH:mm:ss") : ""}</p>
      </div>`,
      "Chi tiết nhật ký hệ thống",
      { dangerouslyUseHTMLString: true, draggable: true, confirmButtonText: "Đóng" }
    );
  }

  async function clearAll() {
    const res = await clearSystemLogs();
    if (res.code === 0) {
      message("Đã xóa tất cả nhật ký hệ thống", { type: "success" });
      onSearch();
    } else {
      message(res.message, { type: "error" });
    }
  }

  async function onbatchDel() {
    if (!selectedIds.value.length) return;
    const res = await batchDeleteSystemLogs({ ids: selectedIds.value });
    if (res.code === 0) {
      message(`Đã xóa ${selectedIds.value.length} bản ghi`, { type: "success" });
      onSelectionCancel();
      onSearch();
    } else {
      message(res.message, { type: "error" });
    }
  }

  onMounted(() => onSearch());

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    selectedNum,
    onSearch,
    onDetail,
    clearAll,
    resetForm,
    onbatchDel,
    handleSizeChange,
    onSelectionCancel,
    handleCellDblclick,
    handleCurrentChange,
    handleSelectionChange
  };
}
