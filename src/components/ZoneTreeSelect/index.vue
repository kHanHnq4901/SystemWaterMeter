<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getMeterTree } from "@/api/waterMeter";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";

const props = withDefaults(defineProps<{
  placeholder?: string;
  width?: string;
  popperWidth?: string;
}>(), {
  placeholder: "Chọn vùng / đồng hồ...",
  width: "260px",
  popperWidth: "320px"
});

const emit = defineEmits<{ (e: "select", sel: TreeSelection): void }>();

const treeData = ref<any[]>([]);
const selected = ref<string | null>(null);
const loading  = ref(false);
const nodeMap  = new Map<string, any>();

function buildMap(nodes: any[]) {
  for (const n of nodes) {
    nodeMap.set(n.id, n);
    if (n.children?.length) buildMap(n.children);
  }
}

async function load() {
  loading.value = true;
  try {
    const res = await getMeterTree();
    if (res.code === 0 && Array.isArray(res.data)) {
      treeData.value = res.data;
      nodeMap.clear();
      buildMap(res.data);
    }
  } finally { loading.value = false; }
}

function collectMeterNos(node: any): string[] {
  if (node.type === "meter") return node.meterNo ? [node.meterNo] : [];
  const nos: string[] = [];
  for (const c of node.children ?? []) nos.push(...collectMeterNos(c));
  return nos;
}

function onChange(val: string | null) {
  if (!val) {
    emit("select", { type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: [] });
    return;
  }
  const node = nodeMap.get(val);
  if (!node) return;
  emit("select", {
    type:         node.type === "meter" ? "meter" : "zone",
    regionId:     node.regionId ?? null,
    meterNo:      node.meterNo  ?? "",
    label:        node.label,
    zoneMeterNos: node.type === "meter"
      ? (node.meterNo ? [node.meterNo] : [])
      : collectMeterNos(node)
  });
}

function clear() {
  selected.value = null;
  emit("select", { type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: [] });
}

onMounted(() => load());
defineExpose({ load, clear });
</script>

<template>
  <el-tree-select
    v-model="selected"
    :data="treeData"
    :props="{ label: 'label', children: 'children' }"
    node-key="id"
    clearable
    filterable
    :loading="loading"
    :placeholder="placeholder"
    :style="{ width }"
    popper-class="zt-popper"
    check-strictly
    highlight-current
    @change="onChange"
  >
    <template #default="{ data }">
      <span class="zt-sel-node">
        <span v-if="data.type === 'zone'" class="zt-sel-icon zone">
          <IconifyIconOnline icon="ri:map-2-line" width="13" />
        </span>
        <span v-else class="zt-sel-icon meter">
          <IconifyIconOnline icon="ri:drop-line" width="12" />
        </span>
        <span class="zt-sel-label">{{ data.label }}</span>
        <span
          v-if="data.type === 'meter' && data.state !== 1"
          class="zt-sel-dot"
          :style="{ background: data.state === 2 ? '#ef4444' : '#9ca3af' }"
        />
      </span>
    </template>
  </el-tree-select>
</template>

<style lang="scss">
/* Dropdown popper — không scoped vì teleport ra ngoài component */
.zt-popper {
  min-width: 360px !important;

  /* Override El-Plus tree node: bỏ cắt chữ, cho phép wrap */
  .el-tree-node__content {
    height: auto !important;
    min-height: 26px;
    align-items: flex-start;
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .el-tree-node__label {
    white-space: normal !important;
    word-break: break-word;
    line-height: 1.4;
  }
}
</style>

<style lang="scss" scoped>
.zt-sel-node {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  width: 100%;
}

.zt-sel-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-top: 2px;

  &.zone  { color: #3b82f6; opacity: 0.85; }
  &.meter { color: #41b6ff; }
}

.zt-sel-label {
  font-size: 12px;
  flex: 1;
  word-break: break-word;
  line-height: 1.4;
}

.zt-sel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
  margin-left: 4px;
}
</style>
