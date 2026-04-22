<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useDept } from "./utils/hook";
import ElTreeLine from "@/components/ReTreeLine";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import AddFill from "~icons/ri/add-circle-line";
import FolderIcon from "~icons/ri/folder-3-fill";
import MapPinIcon from "~icons/ri/map-pin-2-fill";

defineOptions({ name: "SystemDept" });

const { t } = useI18n();
const formRef = ref();
const treeRef = ref();

const { form, loading, dataList, onSearch, openDialog, handleDelete } =
  useDept();

function filterNode(value: string, data: any) {
  if (!value) return true;
  return data.name?.toLowerCase().includes(value.toLowerCase());
}

function handleSearch() {
  treeRef.value?.filter(form.name);
}

function resetForm(formEl: any) {
  if (!formEl) return;
  formEl.resetFields();
  treeRef.value?.filter("");
  onSearch();
}
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-3 overflow-auto"
    >
      <el-form-item :label="t('system.dept.deptName') + '：'" prop="name">
        <el-input
          v-model="form.name"
          :placeholder="t('system.dept.deptName')"
          clearable
          class="w-45!"
          @input="handleSearch"
          @clear="handleSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="handleSearch"
        >
          {{ t('status.pureSearch') }}
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          {{ t('status.pureReset') }}
        </el-button>
      </el-form-item>
    </el-form>

    <div class="m-4 p-4 bg-bg_color rounded-lg">
      <div class="flex items-center justify-between mb-4">
        <span class="font-semibold text-sm">{{ t('system.dept.deptManagement') }}</span>
        <el-button
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          {{ t('system.dept.addDept') }}
        </el-button>
      </div>

      <div v-loading="loading" class="min-h-40">
        <el-tree
          ref="treeRef"
          :data="dataList"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          default-expand-all
          :indent="24"
          :filter-node-method="filterNode"
          highlight-current
        >
          <template #default="{ node, data }">
            <el-tree-line :node="node" :showLabelLine="true" :indent="24">
              <template #node-label>
                <span class="flex items-center gap-1.5">
                  <component
                    :is="FolderIcon"
                    v-if="data.children?.length"
                    class="text-warning text-base flex-shrink-0"
                  />
                  <component
                    :is="MapPinIcon"
                    v-else
                    class="text-primary text-base flex-shrink-0"
                  />
                  <span class="text-sm">{{ data.name }}</span>
                </span>
              </template>
              <template #after-node-label>
                <span class="node-actions flex items-center gap-0.5 ml-2">
                  <el-button
                    class="reset-margin"
                    link
                    type="primary"
                    size="small"
                    :icon="useRenderIcon(EditPen)"
                    @click.stop="openDialog(t('status.pureEdit'), data)"
                  >{{ t('status.pureEdit') }}</el-button>
                  <el-button
                    class="reset-margin"
                    link
                    type="primary"
                    size="small"
                    :icon="useRenderIcon(AddFill)"
                    @click.stop="openDialog(t('status.pureAdd'), { parentId: data.id } as any)"
                  >{{ t('status.pureAdd') }}</el-button>
                  <el-popconfirm
                    :title="`${t('status.pureDelete')} ${data.name}?`"
                    @confirm="handleDelete(data)"
                  >
                    <template #reference>
                      <el-button
                        class="reset-margin"
                        link
                        type="danger"
                        size="small"
                        :icon="useRenderIcon(Delete)"
                        @click.stop
                      >{{ t('status.pureDelete') }}</el-button>
                    </template>
                  </el-popconfirm>
                </span>
              </template>
            </el-tree-line>
          </template>
        </el-tree>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

:deep(.el-tree) {
  background: transparent;

  .el-tree-node__content {
    height: 36px;
    border-radius: 4px;

  }

  .element-tree-node-label-wrapper {
    width: 100%;
  }
}

.node-actions {
  flex-shrink: 0;
}
</style>
