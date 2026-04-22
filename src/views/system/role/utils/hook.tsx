import dayjs from "dayjs";
import editForm from "../form.vue";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "../../hooks";
import { transformI18n } from "@/plugins/i18n";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import type { PaginationProps } from "@pureadmin/table";
import { getKeyList, deviceDetection } from "@pureadmin/utils";
import { getRoleList, getRoleMenu, getRoleMenuIds, addRole, updateRole, deleteRole, saveRoleMenus } from "@/api/system";
import { useI18n } from "vue-i18n";
import { type Ref, reactive, ref, onMounted, computed, h, toRaw, watch } from "vue";

export function useRole(treeRef: Ref) {
  const { t } = useI18n();
  const form = reactive({
    name: "",
    code: "",
    status: ""
  });
  const curRow = ref();
  const formRef = ref();
  const dataList = ref([]);
  const treeIds = ref([]);
  const treeData = ref([]);
  const isShow = ref(false);
  const loading = ref(true);
  const isLinkage = ref(false);
  const treeSearchValue = ref();
  const switchLoadMap = ref({});
  const isExpandAll = ref(false);
  const isSelectAll = ref(false);
  const { switchStyle } = usePublicHooks();
  const treeProps = {
    value: "id",
    label: "title",
    children: "children"
  };
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns = computed<TableColumnList>(() => [
    {
      label: t("system.role.roleId"),
      prop: "id"
    },
    {
      label: t("system.role.roleName"),
      prop: "name"
    },
    {
      label: t("system.role.roleCode"),
      prop: "code"
    },
    {
      label: t("system.role.status"),
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          model-value={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="Hoạt động"
          inactive-text="Tắt"
          inline-prompt
          style={switchStyle.value}
          onChange={(val: number) => onChange(scope as any, val)}
        />
      ),
      minWidth: 90
    },
    {
      label: t("system.role.remark"),
      prop: "remark",
      minWidth: 160
    },
    {
      label: t("system.role.createTime"),
      prop: "createTime",
      minWidth: 160,
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: t("status.pureOperation"),
      fixed: "right",
      width: 210,
      slot: "operation"
    }
  ]);
  // const buttonClass = computed(() => {
  //   return [
  //     "h-5!",
  //     "reset-margin",
  //     "text-gray-500!",
  //     "dark:text-white!",
  //     "dark:hover:text-primary!"
  //   ];
  // });

  function onChange({ row, index }, newVal: number) {
    const action = newVal === 1 ? "Kích hoạt" : "Tắt";
    ElMessageBox.confirm(
      `Xác nhận <strong>${action}</strong> vai trò <strong style='color:var(--el-color-primary)'>${row.name}</strong>?`,
      "Cảnh báo",
      {
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(async () => {
        switchLoadMap.value[index] = Object.assign({}, switchLoadMap.value[index], { loading: true });
        row.status = newVal;
        await updateRole(row.id, { status: newVal });
        switchLoadMap.value[index] = Object.assign({}, switchLoadMap.value[index], { loading: false });
        message(`${action} "${row.name}" thành công`, { type: "success" });
      })
      .catch(() => {
        // user cancelled — row.status stays unchanged because we use model-value (one-way)
      });
  }

  async function handleDelete(row) {
    const res = await deleteRole(row.id);
    if (res.code === 0) {
      message(`${t("status.pureDeleteSuccess")}: ${row.name}`, { type: "success" });
      onSearch();
    } else {
      message(res.message, { type: "error" });
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
    console.log("handleSelectionChange", val);
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getRoleList({
        ...toRaw(form),
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      if (code === 0) {
        dataList.value = data.list;
        pagination.total = data.total;
        pagination.pageSize = data.pageSize;
        pagination.currentPage = data.currentPage;
      }
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  function openDialog(title = t("status.pureAdd"), row?: FormItemProps) {
    addDialog({
      title: `${title} ${t("system.role.roleName")}`,
      props: {
        formInline: {
          id: (row as any)?.id,
          name: row?.name ?? "",
          code: row?.code ?? "",
          remark: row?.remark ?? ""
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
            const isEdit = !!(curData as any).id;
            const res = isEdit
              ? await updateRole((curData as any).id, curData)
              : await addRole(curData);
            if (res.code === 0) {
              message(`${title} ${t("system.role.roleName")}: ${curData.name}`, { type: "success" });
              done();
              onSearch();
            } else {
              message(res.message, { type: "error" });
            }
          }
        });
      }
    });
  }

  /** 菜单权限 */
  async function handleMenu(row?: any) {
    const { id } = row;
    if (id) {
      curRow.value = row;
      isShow.value = true;
      const { code, data } = await getRoleMenuIds({ id });
      if (code === 0) {
        treeRef.value.setCheckedKeys(data);
      }
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  /** 高亮当前权限选中行 */
  function rowStyle({ row: { id } }) {
    return {
      cursor: "pointer",
      background: id === curRow.value?.id ? "var(--el-fill-color-light)" : ""
    };
  }

  async function handleSave() {
    const { id, name } = curRow.value;
    const menuIds = treeRef.value.getCheckedKeys();
    const res = await saveRoleMenus({ id, menuIds });
    if (res.code === 0) {
      message(`${t("system.role.saveMenuPerm")}: ${name}`, { type: "success" });
    } else {
      message(res.message, { type: "error" });
    }
  }

  /** 数据权限 可自行开发 */
  // function handleDatabase() {}

  const onQueryChanged = (query: string) => {
    treeRef.value!.filter(query);
  };

  const filterMethod = (query: string, node) => {
    return transformI18n(node.title)!.includes(query);
  };

  onMounted(async () => {
    onSearch();
    const { code, data } = await getRoleMenu();
    if (code === 0) {
      treeIds.value = getKeyList(data, "id");
      treeData.value = handleTree(data);
    }
  });

  watch(isExpandAll, val => {
    val
      ? treeRef.value.setExpandedKeys(treeIds.value)
      : treeRef.value.setExpandedKeys([]);
  });

  watch(isSelectAll, val => {
    val
      ? treeRef.value.setCheckedKeys(treeIds.value)
      : treeRef.value.setCheckedKeys([]);
  });

  return {
    form,
    isShow,
    curRow,
    loading,
    columns,
    rowStyle,
    dataList,
    treeData,
    treeProps,
    isLinkage,
    pagination,
    isExpandAll,
    isSelectAll,
    treeSearchValue,
    // buttonClass,
    onSearch,
    resetForm,
    openDialog,
    handleMenu,
    handleSave,
    handleDelete,
    filterMethod,
    transformI18n,
    onQueryChanged,
    // handleDatabase,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
