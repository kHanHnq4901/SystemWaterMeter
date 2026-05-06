import dayjs from "dayjs";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, ref, reactive, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  getSystemLogsList,
  clearSystemLogs,
  batchDeleteSystemLogs
} from "@/api/system";

export function useRole(tableRef: Ref) {
  const { t } = useI18n();

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
    { type: "index", label: t("common.stt"), width: 60 },
    { label: t("logs.system.operation"), prop: "operation", minWidth: 140 },
    { label: t("logs.system.operation"), prop: "username",  minWidth: 120 },
    { label: "Method",                   prop: "method",    minWidth: 200, showOverflowTooltip: true },
    { label: t("logs.system.operation"), prop: "params",    minWidth: 180, showOverflowTooltip: true },
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
    { label: t("logs.login.ip"), prop: "ip", width: 140 },
    {
      label: t("logs.login.loginTime"),
      prop: "createTime",
      minWidth: 165,
      formatter: ({ createTime }) =>
        createTime ? dayjs(createTime).format("DD/MM/YYYY HH:mm:ss") : ""
    },
    { label: t("common.action"), fixed: "right", width: 90, slot: "operation" }
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

  function handleSizeChange(val: number) { pagination.pageSize = val; onSearch(); }
  function handleCurrentChange(val: number) { pagination.currentPage = val; onSearch(); }

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
      message(t("common.success"), { type: "success" });
    }
  }

  function onDetail(row: any) {
    ElMessageBox.alert(
      `<div style="line-height:1.8">
        <p><b>${t("logs.operation.user")}:</b> ${row.username ?? ""}</p>
        <p><b>${t("logs.system.operation")}:</b> ${row.operation ?? ""}</p>
        <p><b>Method:</b> ${row.method ?? ""}</p>
        <p><b>Params:</b> <span style="word-break:break-all">${row.params ?? ""}</span></p>
        <p><b>TG (ms):</b> ${row.time ?? ""}</p>
        <p><b>${t("logs.login.ip")}:</b> ${row.ip ?? ""}</p>
        <p><b>${t("logs.login.loginTime")}:</b> ${row.createTime ? dayjs(row.createTime).format("DD/MM/YYYY HH:mm:ss") : ""}</p>
      </div>`,
      t("logs.system.detail"),
      { dangerouslyUseHTMLString: true, draggable: true, confirmButtonText: t("common.close") }
    );
  }

  async function clearAll() {
    const res = await clearSystemLogs();
    if (res.code === 0) {
      message(t("common.deleteSuccess"), { type: "success" });
      onSearch();
    } else {
      message(res.message, { type: "error" });
    }
  }

  async function onbatchDel() {
    if (!selectedIds.value.length) return;
    const res = await batchDeleteSystemLogs({ ids: selectedIds.value });
    if (res.code === 0) {
      message(t("common.deleteSuccess"), { type: "success" });
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
