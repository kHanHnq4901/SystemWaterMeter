<script setup lang="ts">
import { watch, computed, onMounted } from "vue";
import { useZoneMeterTree, type TreeSelection } from "@/hooks/useZoneMeterTree";

const props = withDefaults(defineProps<{
  title?: string;
  height?: string;
}>(), {
  title: "Chọn vùng / đồng hồ",
  height: "calc(100vh - 200px)"
});

const emit = defineEmits<{ (e: "select", sel: TreeSelection): void }>();

const {
  treeRef, treeData, treeKeyword, treeLoading,
  selected, loadTree, selectNode, clearSelection, filterNode
} = useZoneMeterTree();

watch(treeKeyword, v => treeRef.value?.filter(v));

function onNodeClick(data: any) {
  selectNode(data);
  emit("select", { ...selected });
}

// Top-level zone IDs to auto-expand (level 1)
const defaultExpandedKeys = computed(() => treeData.value.map((n: any) => n.id));

// Zone depth → color
const ZONE_COLORS = ["#3b82f6","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"];
function zoneColor(level: number) {
  return ZONE_COLORS[(level - 1) % ZONE_COLORS.length] ?? "#3b82f6";
}

// Zone depth → icon
function zoneIcon(level: number) {
  if (level === 1) return "ri:building-2-line";
  if (level === 2) return "ri:map-2-line";
  if (level === 3) return "ri:community-line";
  if (level === 4) return "ri:road-map-line";
  return "ri:git-branch-line";
}

onMounted(() => loadTree());
defineExpose({ loadTree, clearSelection, selected });
</script>

<template>
  <div class="zone-tree-wrap">
    <!-- Optional card header (standalone mode) -->
    <div v-if="title" class="zt-header">
      <IconifyIconOnline icon="ri:node-tree" color="#3b82f6" width="15" />
      <span class="zt-header-title">{{ title }}</span>
    </div>

    <!-- Search -->
    <div class="zt-search">
      <el-input
        v-model="treeKeyword"
        placeholder="Tìm vùng / đồng hồ..."
        clearable
        size="small"
      >
        <template #prefix>
          <span class="i-ri:search-line text-[var(--el-text-color-placeholder)]" style="font-size:13px" />
        </template>
      </el-input>
    </div>

    <!-- Tree -->
    <el-scrollbar :style="{ height }">
      <div v-if="treeLoading" class="zt-loading">
        <span class="i-ri:loader-4-line animate-spin text-2xl text-[var(--el-color-primary)]" />
        <span class="text-xs text-[var(--el-text-color-secondary)] mt-2">Đang tải...</span>
      </div>

      <el-empty
        v-else-if="!treeData.length"
        :image-size="48"
        description="Chưa có dữ liệu"
        class="py-8"
      />

      <el-tree
        v-else
        ref="treeRef"
        :data="treeData"
        :props="{ label: 'label', children: 'children' }"
        :default-expanded-keys="defaultExpandedKeys"
        node-key="id"
        highlight-current
        :filter-node-method="filterNode"
        @node-click="onNodeClick"
      >
        <template #default="{ node, data }">
          <div class="zt-node" :class="`zt-node--${data.type}`">

            <!-- Zone -->
            <template v-if="data.type === 'zone'">
              <span class="zt-node-icon" :style="{ color: zoneColor(node.level) }">
                <IconifyIconOnline :icon="zoneIcon(node.level)" width="13" />
              </span>
              <span class="zt-node-label" :title="data.label">{{ data.label }}</span>
            </template>

            <!-- Meter -->
            <template v-else>
              <span class="zt-node-icon zt-node-icon--meter">
                <IconifyIconOnline icon="ri:drop-line" width="12" />
              </span>
              <span class="zt-node-label zt-node-label--meter" :title="data.label">{{ data.label }}</span>
              <span
                v-if="data.state !== 1"
                class="zt-status-dot"
                :style="{ background: data.state === 2 ? '#ef4444' : '#9ca3af' }"
                :title="data.state === 2 ? 'Hỏng' : 'Ngừng/Chưa lắp'"
              />
            </template>

          </div>
        </template>
      </el-tree>
    </el-scrollbar>
  </div>
</template>

<style lang="scss" scoped>
.zone-tree-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

/* ── Header (standalone mode) ── */
.zt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  color: var(--el-text-color-primary);
}

.zt-header-title { flex: 1; }

/* ── Search ── */
.zt-search {
  padding: 8px 8px 4px;
  flex-shrink: 0;
}

/* ── Loading ── */
.zt-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

/* ── Tree node ── */
.zt-node {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  overflow: hidden;
  padding-right: 4px;
}

.zt-node-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.85;

  &--root { color: var(--el-text-color-secondary); }
  &--meter { color: #41b6ff; }
}

.zt-node-label {
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);

  &--meter {
    color: var(--el-text-color-regular);
    font-size: 11.5px;
  }
}

.zt-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}

/* ── Tree node rows ── */
:deep(.el-tree-node__content) {
  height: 30px;
  border-radius: 5px;
  transition: background 0.12s;

  &:hover { background: var(--el-fill-color); }
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--el-color-primary-light-9);

  .zt-node-label { color: var(--el-color-primary); font-weight: 500; }
  .zt-node-icon  { opacity: 1; }
}

/* Tighten expand arrow */
:deep(.el-tree-node__expand-icon) {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>
