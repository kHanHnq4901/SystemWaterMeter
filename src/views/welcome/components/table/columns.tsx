import { tableData } from "../../data";
import { delay } from "@pureadmin/utils";
import { ref, onMounted, reactive } from "vue";
import type { PaginationProps } from "@pureadmin/table";
import ThumbUp from "~icons/ri/thumb-up-line";
import Hearts from "~icons/ri/hearts-line";
import Empty from "./empty.svg?component";

export function useColumns() {
  const dataList = ref([]);
  const loading = ref(true);
  const columns: TableColumnList = [
    {
      sortable: true,
      label: "Mã Gateway / Trạm", // Gốc: 序号 (STT/ID)
      prop: "id"
    },
    {
      sortable: true,
      label: "Sản lượng lượng (m³)", // Gốc: 需求人数 (Số lượng yêu cầu)
      prop: "requiredNumber",
      filterMultiple: false,
      filterClassName: "pure-table-filter",
      filters: [
        { text: "Bất thường (≥16000)", value: "more" }, // Bộ lọc tùy chỉnh
        { text: "Bình thường (<16000)", value: "less" }
      ],
      filterMethod: (value, { requiredNumber }) => {
        return value === "more"
          ? requiredNumber >= 16000
          : requiredNumber < 16000;
      }
    },
    {
      sortable: true,
      label: "Sự cố phát sinh", // Gốc: 提问数量 (Số câu hỏi)
      prop: "questionNumber"
    },
    {
      sortable: true,
      label: "Đã xử lý (Offline -> Online)", // Gốc: 解决数量 (Số lượng đã giải quyết)
      prop: "resolveNumber"
    },
    {
      sortable: true,
      label: "Mức Pin (%)", // Gốc: 用户满意度 (Độ hài lòng người dùng)
      minWidth: 100,
      prop: "satisfaction",
      // Dùng JSX (tsx) để render giao diện tùy chỉnh cho ô hiển thị Pin
      cellRenderer: ({ row }) => (
        <div class="flex justify-center w-full">
          <span class="flex items-center w-15">
            <span class="ml-auto mr-2">{row.satisfaction}%</span>
            {/* Đổi màu icon: Pin > 98% thì màu Xanh lá, thấp hơn thì màu Cam */}
            <iconify-icon-offline
              icon={row.satisfaction > 98 ? Hearts : ThumbUp}
              color={row.satisfaction > 98 ? "#10b981" : "#e85f33"}
            />
          </span>
        </div>
      )
    },
    {
      sortable: true,
      label: "Cập nhật cuối", // Gốc: 统计日期 (Ngày thống kê)
      prop: "date"
    },
    {
      label: "Thao tác", // Gốc: 操作 (Thao tác)
      fixed: "right",
      slot: "operation" // Bắn qua file index.vue cha để render các nút bấm
    }
  ];

  /** Cấu hình phân trang (Pagination) */
  const pagination = reactive<PaginationProps>({
    pageSize: 10,
    currentPage: 1,
    layout: "prev, pager, next",
    total: 0,
    align: "center"
  });

  // Hàm mô phỏng độ trễ khi chuyển trang (Đợi API trả về)
  function onCurrentChange(page: number) {
    console.log("Đang chuyển sang trang: ", page);
    loading.value = true;
    delay(300).then(() => {
      loading.value = false;
    });
  }

  // Khởi tạo data khi Component được nạp lên màn hình
  onMounted(() => {
    dataList.value = tableData;
    pagination.total = dataList.value.length;
    loading.value = false;
  });

  return {
    Empty,
    loading,
    columns,
    dataList,
    pagination,
    onCurrentChange
  };
}
