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
  getUserList,
  getAllRoleList,
  getRoleUserTree,
  addUser,
  updateUser,
  deleteUser,
  batchDeleteUser,
  saveUserRoles,
  getUserZones,
  updateUserZones,
  getAllRegions
} from "@/api/system";

import {
  ElForm,
  ElInput,
  ElFormItem,
  ElProgress,
  ElMessageBox,
  ElTree
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
    treeRef.value?.onTreeReset?.();
    onSearch();
  };

  function onTreeSelect({ type, id, selected }) {
    // Chỉ lọc khi click vào node role, bỏ qua node user
    if (type === "user") return;
    form.roleId = selected ? id : "";
    pagination.currentPage = 1;
    onSearch();
  }

  // Mở dialog Thêm mới / Cập nhật
  async function openDialog(title = "Thêm mới", row?: FormItemProps) {
    const [roleIdsRes, zonesRes, regionsRes] = await Promise.all([
      row?.id ? getRoleIds({ userId: row.id }) : Promise.resolve({ data: [] }),
      row?.id ? getUserZones(row.id) : Promise.resolve({ data: [] }),
      getAllRegions()
    ]);

    const existingRoleIds: number[] = (roleIdsRes as any).data ?? [];
    const existingZoneIds: number[] = (zonesRes as any).data ?? [];
    const zoneTree = handleTree((regionsRes as any).data ?? []);

    const formData = reactive<FormItemProps>({
      title,
      id: row?.id ?? "",
      roleOptions: roleOptions.value ?? [],
      roleId: existingRoleIds[0] ?? "",
      zoneOptions: zoneTree,
      zoneIds: existingZoneIds,
      nickname: row?.nickname ?? "",
      username: row?.username ?? "",
      password: "",
      phone: row?.phone ?? "",
      email: row?.email ?? "",
      sex: "",
      status: row?.status ?? 1,
      remark: row?.remark ?? ""
    });

    addDialog({
      title: `${title} người dùng`,
      width: "46%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: formData }),
      beforeSure: done => {
        const FormRef = formRef.value.getRef();
        FormRef.validate(async valid => {
          if (valid) {
            try {
              const roleIds = formData.roleId ? [Number(formData.roleId)] : [];
              const userId = formData.id as number;
              if (title === "Thêm mới") {
                const res = await addUser(formData);
                if (res.code === 0) {
                  const newId = (res as any).data?.id;
                  if (newId) {
                    if (roleIds.length > 0) await saveUserRoles(newId, { roleIds });
                    const zr = await updateUserZones(newId, { zoneIds: formData.zoneIds });
                    if ((zr as any).code !== 0) {
                      message((zr as any).message || "Lưu phân vùng thất bại", { type: "error" });
                      return;
                    }
                  }
                  message(`Đã thêm thành công ${formData.username}`, { type: "success" });
                  done();
                  onSearch();
                  loadRoleUserTree();
                } else {
                  message(res.message || "Thêm thất bại", { type: "error" });
                }
              } else {
                const res = await updateUser(userId, formData);
                if (res.code === 0) {
                  await saveUserRoles(userId, { roleIds });
                  const zr = await updateUserZones(userId, { zoneIds: formData.zoneIds });
                  if ((zr as any).code !== 0) {
                    message((zr as any).message || "Lưu phân vùng thất bại", { type: "error" });
                    return;
                  }
                  message(`Đã cập nhật ${formData.username}`, { type: "success" });
                  done();
                  onSearch();
                  loadRoleUserTree();
                } else {
                  message(res.message || "Cập nhật thất bại", { type: "error" });
                }
              }
            } catch (err: any) {
              console.error("Lỗi lưu người dùng:", err);
              message(err?.message || "Lỗi kết nối máy chủ", { type: "error" });
            }
          }
        });
      }
    });
  }

  const zoneTreeRef = ref();

  async function handleZone(row) {
    const [regionsRes, zonesRes] = await Promise.all([
      getAllRegions(),
      getUserZones(row.id)
    ]);

    const treeNodes = handleTree(regionsRes.data ?? []);
    const currentZoneIds: number[] = zonesRes.data ?? [];

    addDialog({
      title: `Phân quyền vùng cho ${row.username}`,
      width: "420px",
      draggable: true,
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      contentRenderer: () =>
        h(ElTree, {
          ref: zoneTreeRef,
          data: treeNodes,
          showCheckbox: true,
          nodeKey: "id",
          defaultCheckedKeys: currentZoneIds,
          props: { label: "name", children: "children" },
          checkStrictly: false,
          style: "max-height:400px;overflow-y:auto;padding:8px 0"
        }),
      beforeSure: async done => {
        const checkedKeys: number[] = zoneTreeRef.value.getCheckedKeys(true);
        try {
          const res = await updateUserZones(row.id, { zoneIds: checkedKeys });
          if (res.code === 0) {
            message("Cập nhật phân quyền vùng thành công", { type: "success" });
            done();
          } else {
            message(res.message || "Cập nhật thất bại", { type: "error" });
          }
        } catch {
          message("Lỗi kết nối máy chủ", { type: "error" });
        }
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
    const existingIds: number[] = (await getRoleIds({ userId: row.id })).data ?? [];

    const roleData = reactive({
      username: row?.username ?? "",
      nickname: row?.nickname ?? "",
      roleOptions: roleOptions.value ?? [],
      ids: existingIds[0] ?? "" as number | ""
    });

    addDialog({
      title: `Phân vai trò cho ${row.username}`,
      width: "400px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(roleForm, { formInline: roleData }),
      beforeSure: async done => {
        if (!roleData.ids && roleData.ids !== 0) {
          message("Vui lòng chọn vai trò", { type: "warning" });
          return;
        }
        try {
          const roleIds = [Number(roleData.ids)];
          const res = await saveUserRoles(row.id, { roleIds });
          if (res.code === 0) {
            message("Cập nhật vai trò thành công", { type: "success" });
            done();
            loadRoleUserTree();
          } else {
            message(res.message || "Cập nhật thất bại", { type: "error" });
          }
        } catch {
          message("Lỗi kết nối máy chủ", { type: "error" });
        }
      }
    });
  }

  async function loadRoleUserTree() {
    treeLoading.value = true;
    const treeRes = await getRoleUserTree();
    if (treeRes.code === 0) treeData.value = treeRes.data ?? [];
    treeLoading.value = false;
  }

  onMounted(async () => {
    onSearch();
    const [rolesRes, treeRes] = await Promise.all([
      getAllRoleList(),
      getRoleUserTree()
    ]);
    if (rolesRes.code === 0) roleOptions.value = rolesRes.data ?? [];
    if (treeRes.code === 0) treeData.value = treeRes.data ?? [];
    treeLoading.value = false;
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
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
