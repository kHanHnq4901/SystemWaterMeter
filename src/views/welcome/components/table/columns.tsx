import { tableData } from "../../data";
import { delay } from "@pureadmin/utils";
import { ref, onMounted, reactive } from "vue";
import type { PaginationProps } from "@pureadmin/table";
import Empty from "./empty.svg?component";

export function useColumns() {
  const dataList = ref([]);
  const loading = ref(true);

  const columns: TableColumnList = [
    {
      label: "Mã Gateway / Trạm",
      prop: "id",
      sortable: true,
      minWidth: 130
    },
    {
      label: "Khu vực",
      prop: "area",
      sortable: true,
      minWidth: 110,
      cellRenderer: ({ row }) => (
        <el-tag size="small" type="info" round>
          {row.area}
        </el-tag>
      )
    },
    {
      label: "Tổng ĐH",
      prop: "meterCount",
      sortable: true,
      minWidth: 90
    },
    {
      label: "Online",
      prop: "online",
      sortable: true,
      minWidth: 80,
      cellRenderer: ({ row }) => (
        <span class="font-semibold text-green-500">{row.online}</span>
      )
    },
    {
      label: "Offline",
      prop: "offline",
      sortable: true,
      minWidth: 80,
      cellRenderer: ({ row }) => (
        <span class={`font-semibold ${row.offline > 0 ? "text-red-400" : "text-gray-400"}`}>
          {row.offline}
        </span>
      )
    },
    {
      label: "Tỷ lệ online",
      prop: "online",
      minWidth: 130,
      cellRenderer: ({ row }) => {
        const rate = Math.round((row.online / row.meterCount) * 100);
        return (
          <el-progress
            percentage={rate}
            stroke-width={10}
            color={rate >= 95 ? "#10b981" : rate >= 80 ? "#f59e0b" : "#ef4444"}
            text-inside={true}
          />
        );
      }
    },
    {
      label: "Trạng thái GW",
      prop: "status",
      sortable: true,
      minWidth: 120,
      cellRenderer: ({ row }) => (
        <el-tag
          type={row.status === "online" ? "success" : "danger"}
          size="small"
          round
        >
          {row.status === "online" ? "● Online" : "○ Offline"}
        </el-tag>
      )
    },
    {
      label: "Pin (%)",
      prop: "power",
      sortable: true,
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <span class={`font-semibold ${row.power >= 80 ? "text-green-500" : row.power >= 30 ? "text-amber-500" : "text-red-500"}`}>
          {row.power > 0 ? `${row.power}%` : "N/A"}
        </span>
      )
    },
    {
      label: "Cập nhật cuối",
      prop: "lastUpdate",
      sortable: true,
      minWidth: 110
    },
    {
      label: "Thao tác",
      fixed: "right",
      minWidth: 110,
      slot: "operation"
    }
  ];

  const pagination = reactive<PaginationProps>({
    pageSize: 8,
    currentPage: 1,
    layout: "prev, pager, next",
    total: 0,
    align: "center"
  });

  function onCurrentChange(_page: number) {
    loading.value = true;
    delay(300).then(() => {
      loading.value = false;
    });
  }

  onMounted(() => {
    dataList.value = tableData as any;
    pagination.total = dataList.value.length;
    loading.value = false;
  });

  return { Empty, loading, columns, dataList, pagination, onCurrentChange };
}
