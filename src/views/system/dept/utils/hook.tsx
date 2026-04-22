import editForm from "../form.vue";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import { useI18n } from "vue-i18n";

import {
  getRegionList,
  addRegion,
  updateRegion,
  deleteRegion
} from "@/api/region";

import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import { reactive, ref, onMounted, h } from "vue";
import type { FormItemProps } from "../utils/types";
import { cloneDeep, isAllEmpty, deviceDetection } from "@pureadmin/utils";

export function useDept() {
  const { t } = useI18n();
  const form = reactive({
    name: "",
    status: null // Tạm giữ nếu sau này bác thêm cột STATUS vào SYS_REGION
  });

  const formRef = ref();
  const dataList = ref([]);
  const loading = ref(true);
  const { tagStyle } = usePublicHooks();

  // SỬA 2: Khớp cột hiển thị với dữ liệu thực tế của bảng SYS_REGION
  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  }

  // SỬA 3: Tìm kiếm gọi trực tiếp API Backend
  async function onSearch() {
    loading.value = true;
    try {
      // Gửi form tìm kiếm lên Backend
      const { code, data } = await getRegionList({ name: form.name });

      if (code === 0 && data) {
        // Backend trả về mảng phẳng, Frontend dùng handleTree cuộn thành cây 5 Level
        dataList.value = handleTree(data.list);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    } finally {
      setTimeout(() => {
        loading.value = false;
      }, 500);
    }
  }

  function formatHigherDeptOptions(treeList) {
    if (!treeList || !treeList.length) return;
    const newTreeList = [];
    for (let i = 0; i < treeList.length; i++) {
      treeList[i].disabled = treeList[i].status === 0 ? true : false;
      formatHigherDeptOptions(treeList[i].children);
      newTreeList.push(treeList[i]);
    }
    return newTreeList;
  }

  // SỬA 4: Mở Form và Xử lý Lưu dữ liệu (Thêm / Sửa)
  function openDialog(title = t("status.pureAdd"), row?: FormItemProps) {
    addDialog({
      title: `${title} ${t("system.dept.deptName")}`,
      props: {
        formInline: {
          id: row?.id ?? "", // Quan trọng: Có ID để biết đang Sửa dòng nào
          higherDeptOptions: formatHigherDeptOptions(cloneDeep(dataList.value)),
          parentId: row?.parentId ?? 0,
          name: row?.name ?? "",
          orderNum: row?.orderNum ?? 0,
          voltageCode: row?.voltageCode ?? "",
          capacity: row?.capacity ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;

        FormRef.validate(async valid => {
          if (valid) {
            try {
              if (title === t("status.pureAdd")) {
                // GỌI API THÊM
                const res = await addRegion(curData);
                if (res.code === 0) {
                  message(`Đã thêm thành công ${curData.name}`, {
                    type: "success"
                  });
                  done();
                  onSearch();
                } else {
                  message(res.message || "Thêm thất bại", { type: "error" });
                }
              } else {
                // GỌI API SỬA
                const res = await updateRegion(curData.id, curData);
                if (res.code === 0) {
                  message(`Đã cập nhật ${curData.name}`, { type: "success" });
                  done();
                  onSearch();
                } else {
                  message(res.message || "Cập nhật thất bại", {
                    type: "error"
                  });
                }
              }
            } catch (error) {
              message("Lỗi kết nối máy chủ", { type: "error" });
            }
          }
        });
      }
    });
  }

  // SỬA 5: Gọi API Xóa dữ liệu
  async function handleDelete(row) {
    try {
      const res = await deleteRegion(row.id);
      if (res.code === 0) {
        message(`Đã xóa ${row.name}`, { type: "success" });
        onSearch(); // Tải lại bảng sau khi xóa thành công
      } else {
        message(res.message || "Không thể xóa", { type: "error" });
      }
    } catch (error) {
      message("Lỗi kết nối khi xóa", { type: "error" });
    }
  }

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    dataList,
    onSearch,
    resetForm,
    openDialog,
    handleDelete
  };
}
