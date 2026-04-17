import "./reset.css";
import dayjs from "dayjs";
import roleForm from "../form/role.vue";
import editForm from "../form/index.vue";
import { zxcvbn } from "@zxcvbn-ts/core";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import userAvatar from "@/assets/user.jpg";
import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import ReCropperPreview from "@/components/ReCropperPreview";
import type { FormItemProps, RoleFormItemProps } from "../utils/types";
import {
  getKeyList,
  isAllEmpty,
  hideTextAtIndex,
  deviceDetection
} from "@pureadmin/utils";

// SỬA: Import thêm các hàm API Thêm, Sửa, Xóa từ file system.ts
import {
  getRoleIds,
  getDeptList,
  getUserList,
  getAllRoleList,
  addUser,
  updateUser,
  deleteUser,
  batchDeleteUser
} from "@/api/system";

import {
  ElForm,
  ElInput,
  ElFormItem,
  ElProgress,
  ElMessageBox
} from "element-plus";
import {
  type Ref,
  h,
  ref,
  toRaw,
  watch,
  computed,
  reactive,
  onMounted
} from "vue";

export function useUser(tableRef: Ref, treeRef: Ref) {
  const form = reactive({
    roleId: "",
    username: "",
    phone: "",
    status: ""
  });
  const formRef = ref();
  const ruleFormRef = ref();
  const dataList = ref([]);
  const loading = ref(true);
  const avatarInfo = ref();
  const switchLoadMap = ref({});
  const { switchStyle } = usePublicHooks();
  const higherDeptOptions = ref();
  const treeData = ref([]);
  const treeLoading = ref(true);
  const selectedNum = ref(0);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "Chọn",
      type: "selection",
      fixed: "left",
      reserveSelection: true
    },
    {
      label: "ID",
      prop: "id",
      width: 90
    },
    {
      label: "Ảnh đại diện",
      prop: "avatar",
      cellRenderer: ({ row }) => (
        <el-image
          fit="cover"
          preview-teleported={true}
          src={row.avatar || userAvatar}
          preview-src-list={Array.of(row.avatar || userAvatar)}
          class="size-6 rounded-full align-middle"
        />
      ),
      width: 100
    },
    {
      label: "Tên đăng nhập",
      prop: "username",
      minWidth: 130
    },
    {
      label: "Tên hiển thị",
      prop: "nickname",
      minWidth: 130
    },
    {
      label: "Email",
      prop: "email",
      minWidth: 150
    },
    {
      label: "Số điện thoại",
      prop: "phone",
      minWidth: 120,
      formatter: ({ phone }) =>
        phone ? hideTextAtIndex(phone, { start: 3, end: 6 }) : "Chưa cập nhật"
    },
    {
      label: "Trạng thái",
      prop: "status",
      minWidth: 100,
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="Hoạt động"
          inactive-text="Đã khóa"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope as any)}
        />
      )
    },
    {
      label: "Ngày tạo",
      minWidth: 160,
      prop: "createTime",
      formatter: ({ createTime }) =>
        dayjs(createTime).format("DD-MM-YYYY HH:mm:ss")
    },
    {
      label: "Thao tác",
      fixed: "right",
      width: 180,
      slot: "operation"
    }
  ];

  const buttonClass = computed(() => {
    return [
      "h-5!",
      "reset-margin",
      "text-gray-500!",
      "dark:text-white!",
      "dark:hover:text-primary!"
    ];
  });

  const pwdForm = reactive({ newPwd: "" });
  const pwdProgress = [
    { color: "#e74242", text: "Rất yếu" },
    { color: "#EFBD47", text: "Yếu" },
    { color: "#ffa500", text: "Trung bình" },
    { color: "#1bbf1b", text: "Mạnh" },
    { color: "#008000", text: "Rất mạnh" }
  ];
  const curScore = ref();
  const roleOptions = ref([]);

  // SỬA: Cập nhật trạng thái trực tiếp xuống DB
  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `Bạn có chắc chắn muốn <strong>${
        row.status === 0 ? "khóa" : "kích hoạt"
      }</strong> tài khoản <strong style='color:var(--el-color-primary)'>${
        row.username
      }</strong> không?`,
      "Xác nhận hệ thống",
      {
        confirmButtonText: "Đồng ý",
        cancelButtonText: "Hủy",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(async () => {
        switchLoadMap.value[index] = Object.assign(
          {},
          switchLoadMap.value[index],
          { loading: true }
        );

        try {
          // Gọi API cập nhật để đổi trạng thái
          const res = await updateUser(row.id, { ...row, status: row.status });
          if (res.code === 0) {
            message("Cập nhật trạng thái thành công", { type: "success" });
          } else {
            message(res.message || "Có lỗi xảy ra", { type: "error" });
            row.status === 0 ? (row.status = 1) : (row.status = 0); // Đảo lại nếu lỗi
          }
        } catch (error) {
          message("Lỗi kết nối máy chủ", { type: "error" });
          row.status === 0 ? (row.status = 1) : (row.status = 0);
        } finally {
          switchLoadMap.value[index] = Object.assign(
            {},
            switchLoadMap.value[index],
            { loading: false }
          );
        }
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function handleUpdate(row) {
    // Chức năng này của template thường trỏ vào openDialog, đã xử lý bên HTML
    openDialog("Sửa", row);
  }

  // SỬA: Xóa 1 người dùng
  async function handleDelete(row) {
    try {
      const res = await deleteUser(row.id);
      if (res.code === 0) {
        message(`Đã xóa người dùng: ${row.username}`, { type: "success" });
        onSearch(); // Tải lại bảng sau khi xóa
      } else {
        message(res.message || "Xóa thất bại", { type: "error" });
      }
    } catch (error) {
      message("Lỗi kết nối khi xóa", { type: "error" });
    }
  }

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    tableRef.value.setAdaptive();
  }

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  // SỬA: Xóa hàng loạt
  async function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const ids = getKeyList(curSelected, "id");

    if (ids.length === 0)
      return message("Vui lòng chọn dữ liệu", { type: "warning" });

    try {
      const res = await batchDeleteUser({ ids });
      if (res.code === 0) {
        message(`Đã xóa thành công ${ids.length} người dùng`, {
          type: "success"
        });
        tableRef.value.getTableRef().clearSelection();
        onSearch();
      } else {
        message(res.message || "Xóa thất bại", { type: "error" });
      }
    } catch (error) {
      message("Lỗi kết nối khi xóa hàng loạt", { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;
    const queryParams = {
      ...toRaw(form),
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize
    };

    try {
      const { code, data } = await getUserList(queryParams);
      if (code === 0 && data) {
        dataList.value = data.list;
        pagination.total = data.total;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        loading.value = false;
      }, 500);
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.roleId = "";
    treeRef.value.onTreeReset();
    onSearch();
  };

  function onTreeSelect({ id, selected }) {
    form.roleId = selected ? id : "";
    pagination.currentPage = 1;
    onSearch();
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

  // SỬA: Xử lý Thêm mới / Cập nhật
  function openDialog(title = "Thêm mới", row?: FormItemProps) {
    addDialog({
      title: `${title} người dùng`,
      props: {
        formInline: {
          title,
          id: row?.id ?? "", // CHÚ Ý: Bắt buộc truyền ID vào form để biết Update ai
          higherDeptOptions: formatHigherDeptOptions(higherDeptOptions.value),
          parentId: row?.dept?.id ?? 0,
          nickname: row?.nickname ?? "",
          username: row?.username ?? "",
          password: row?.password ?? "",
          phone: row?.phone ?? "",
          email: row?.email ?? "",
          status: row?.status ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "46%",
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
              if (title === "Thêm mới") {
                // Gọi API Thêm
                const res = await addUser(curData);
                if (res.code === 0) {
                  message(`Đã thêm thành công ${curData.username}`, {
                    type: "success"
                  });
                  done();
                  onSearch();
                } else {
                  message(res.message || "Thêm thất bại", { type: "error" });
                }
              } else {
                // Gọi API Sửa
                const res = await updateUser(curData.id, curData);
                if (res.code === 0) {
                  message(`Đã cập nhật ${curData.username}`, {
                    type: "success"
                  });
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

  const cropRef = ref();
  function handleUpload(row) {
    addDialog({
      title: "Cắt và tải ảnh lên",
      width: "40%",
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      contentRenderer: () =>
        h(ReCropperPreview, {
          ref: cropRef,
          imgSrc: row.avatar || userAvatar,
          onCropper: info => (avatarInfo.value = info)
        }),
      beforeSure: done => {
        done();
        onSearch();
      },
      closeCallBack: () => cropRef.value.hidePopover()
    });
  }

  watch(
    pwdForm,
    ({ newPwd }) =>
      (curScore.value = isAllEmpty(newPwd) ? -1 : zxcvbn(newPwd).score)
  );

  function handleReset(row) {
    addDialog({
      title: `Đặt lại mật khẩu cho ${row.username}`,
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      contentRenderer: () => (
        <>
          <ElForm ref={ruleFormRef} model={pwdForm}>
            <ElFormItem
              prop="newPwd"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập mật khẩu mới",
                  trigger: "blur"
                }
              ]}
            >
              <ElInput
                clearable
                show-password
                type="password"
                v-model={pwdForm.newPwd}
                placeholder="Nhập mật khẩu mới"
              />
            </ElFormItem>
          </ElForm>
          <div class="my-4 flex">
            {pwdProgress.map(({ color, text }, idx) => (
              <div
                class="w-[19vw]"
                style={{ marginLeft: idx !== 0 ? "4px" : 0 }}
              >
                <ElProgress
                  striped
                  striped-flow
                  duration={curScore.value === idx ? 6 : 0}
                  percentage={curScore.value >= idx ? 100 : 0}
                  color={color}
                  stroke-width={10}
                  show-text={false}
                />
                <p
                  class="text-center"
                  style={{ color: curScore.value === idx ? color : "" }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </>
      ),
      closeCallBack: () => (pwdForm.newPwd = ""),
      beforeSure: done => {
        ruleFormRef.value.validate(valid => {
          if (valid) {
            // Tương lai bạn viết thêm API Reset Mật khẩu rồi gọi vào đây nhé
            message(`Đã đặt lại mật khẩu cho ${row.username}`, {
              type: "success"
            });
            done();
            onSearch();
          }
        });
      }
    });
  }

  async function handleRole(row) {
    const ids = (await getRoleIds({ userId: row.id })).data ?? [];
    addDialog({
      title: `Phân quyền cho ${row.username}`,
      props: {
        formInline: {
          username: row?.username ?? "",
          nickname: row?.nickname ?? "",
          roleOptions: roleOptions.value ?? [],
          ids
        }
      },
      width: "400px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(roleForm),
      beforeSure: (done, { options }) => {
        done();
      }
    });
  }

  onMounted(async () => {
    treeLoading.value = true;
    onSearch();

    const { code, data } = await getDeptList();
    if (code === 0 && data) {
      higherDeptOptions.value = handleTree(data);
      treeData.value = handleTree(data);
    }

    treeLoading.value = false;

    const rolesRes = await getAllRoleList();
    if (rolesRes.code === 0) {
      roleOptions.value = rolesRes.data ?? [];
    }
  });

  return {
    form,
    loading,
    columns,
    dataList,
    treeData,
    treeLoading,
    selectedNum,
    pagination,
    buttonClass,
    deviceDetection,
    onSearch,
    resetForm,
    onbatchDel,
    openDialog,
    onTreeSelect,
    handleUpdate,
    handleDelete,
    handleUpload,
    handleReset,
    handleRole,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
