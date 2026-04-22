import editForm from "../form.vue";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import { getMenuList, addMenu, updateMenu, deleteMenu } from "@/api/system";
import { transformI18n } from "@/plugins/i18n";
import { $t } from "@/plugins/i18n";
import { addDialog } from "@/components/ReDialog";
import { useI18n } from "vue-i18n";
import { reactive, ref, onMounted, computed, h } from "vue";
import type { FormItemProps } from "../utils/types";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { cloneDeep, isAllEmpty, deviceDetection } from "@pureadmin/utils";

export function useMenu() {
  const { t } = useI18n();
  const form = reactive({
    title: ""
  });

  const formRef = ref();
  const dataList = ref([]);
  const loading = ref(true);

  const getMenuType = (type, text = false) => {
    switch (type) {
      case 0:
        return text ? "Menu" : "primary";
      case 1:
        return text ? "Iframe" : "warning";
      case 2:
        return text ? "External" : "danger";
      case 3:
        return text ? "Button" : "info";
    }
  };

  const columns = computed<TableColumnList>(() => [
    {
      label: t("system.menu.menuName"),
      prop: "title",
      align: "left",
      cellRenderer: ({ row }) => (
        <>
          <span class="inline-block mr-1">
            {h(useRenderIcon(row.icon), {
              style: { paddingTop: "1px" }
            })}
          </span>
          <span>{transformI18n(row.title)}</span>
        </>
      )
    },
    {
      label: t("menus.pureSystemMenu"),
      prop: "menuType",
      width: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getMenuType(row.menuType) as any}
          effect="plain"
        >
          {getMenuType(row.menuType, true)}
        </el-tag>
      )
    },
    {
      label: "Path",
      prop: "path"
    },
    {
      label: "Component",
      prop: "component",
      formatter: ({ path, component }) =>
        isAllEmpty(component) ? path : component
    },
    {
      label: t("status.pureAuth"),
      prop: "auths"
    },
    {
      label: t("system.menu.rank"),
      prop: "rank",
      width: 100
    },
    {
      label: t("system.menu.hidden"),
      prop: "showLink",
      formatter: ({ showLink }) => (showLink ? t("status.pureNo") : t("status.pureYes")),
      width: 100
    },
    {
      label: t("status.pureOperation"),
      fixed: "right",
      width: 210,
      slot: "operation"
    }
  ]);

  function handleSelectionChange(val) {
    console.log("handleSelectionChange", val);
  }

  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { code, data } = await getMenuList();
      if (code === 0 && Array.isArray(data)) {
        let newData = data as any[];
        if (!isAllEmpty(form.title)) {
          newData = newData.filter(item =>
            (item.title || "").includes(form.title)
          );
        }
        dataList.value = handleTree(newData);
      }
    } finally {
      loading.value = false;
    }
  }

  function formatHigherMenuOptions(treeList) {
    if (!treeList || !treeList.length) return;
    const newTreeList = [];
    for (let i = 0; i < treeList.length; i++) {
      treeList[i].title = transformI18n(treeList[i].title);
      formatHigherMenuOptions(treeList[i].children);
      newTreeList.push(treeList[i]);
    }
    return newTreeList;
  }

  function openDialog(title = t("status.pureAdd"), row?: FormItemProps) {
    addDialog({
      title: `${title} ${t("system.menu.menuName")}`,
      props: {
        formInline: {
          id: (row as any)?.id,
          menuType: row?.menuType ?? 0,
          higherMenuOptions: formatHigherMenuOptions(cloneDeep(dataList.value)),
          parentId: row?.parentId ?? 0,
          title: row?.title ?? "",
          name: row?.name ?? "",
          path: row?.path ?? "",
          component: row?.component ?? "",
          rank: row?.rank ?? 99,
          redirect: row?.redirect ?? "",
          icon: row?.icon ?? "",
          extraIcon: row?.extraIcon ?? "",
          enterTransition: row?.enterTransition ?? "",
          leaveTransition: row?.leaveTransition ?? "",
          activePath: row?.activePath ?? "",
          auths: row?.auths ?? "",
          frameSrc: row?.frameSrc ?? "",
          frameLoading: row?.frameLoading ?? true,
          keepAlive: row?.keepAlive ?? false,
          hiddenTag: row?.hiddenTag ?? false,
          fixedTag: row?.fixedTag ?? false,
          showLink: row?.showLink ?? true,
          showParent: row?.showParent ?? false
        }
      },
      width: "45%",
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
              ? await updateMenu((curData as any).id, curData)
              : await addMenu(curData);
            if (res.code === 0) {
              message(transformI18n($t(res.message as any)) || (isEdit ? "Cập nhật thành công" : "Tạo mới thành công"), {
                type: "success"
              });
              done();
              onSearch();
            } else {
              message(transformI18n($t(res.message as any)) || res.message, {
                type: "error"
              });
            }
          }
        });
      }
    });
  }

  async function handleDelete(row) {
    const res = await deleteMenu(row.id);
    if (res.code === 0) {
      message(transformI18n($t(res.message as any)) || "Xóa thành công", {
        type: "success"
      });
      onSearch();
    } else {
      message(transformI18n($t(res.message as any)) || res.message, {
        type: "error"
      });
    }
  }

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    /** 搜索 */
    onSearch,
    /** 重置 */
    resetForm,
    /** 新增、修改菜单 */
    openDialog,
    /** 删除菜单 */
    handleDelete,
    handleSelectionChange
  };
}
