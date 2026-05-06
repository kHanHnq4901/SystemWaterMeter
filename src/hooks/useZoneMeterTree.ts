import { ref, reactive } from "vue";
import { getMeterTree } from "@/api/waterMeter";

export type TreeSelection = {
  type: "zone" | "meter" | "clear";
  regionId: number | null;
  meterNo: string;
  label: string;
  /** All meter nos under the selected zone (recursive) */
  zoneMeterNos: string[];
};

export function useZoneMeterTree() {
  const treeRef     = ref<any>();
  const treeData    = ref<any[]>([]);
  const treeKeyword = ref("");
  const treeLoading = ref(false);

  const selected = reactive<TreeSelection>({
    type:         "clear",
    regionId:     null,
    meterNo:      "",
    label:        "",
    zoneMeterNos: []
  });

  async function loadTree() {
    treeLoading.value = true;
    try {
      const res = await getMeterTree();
      if (res.code === 0 && Array.isArray(res.data)) {
        treeData.value = res.data as any[];
      }
    } finally {
      treeLoading.value = false;
    }
  }

  function collectMeterNos(node: any): string[] {
    if (node.type === "meter") return node.meterNo ? [node.meterNo] : [];
    const nos: string[] = [];
    for (const child of node.children ?? []) nos.push(...collectMeterNos(child));
    return nos;
  }

  function selectNode(data: any) {
    const type = (data.type === "gateway" ? "zone" : data.type) as TreeSelection["type"];
    const zoneMeterNos =
      type === "zone"  ? collectMeterNos(data) :
      type === "meter" ? (data.meterNo ? [data.meterNo] : []) : [];

    Object.assign(selected, {
      type,
      regionId:     data.regionId ?? null,
      meterNo:      data.meterNo  ?? "",
      label:        data.label,
      zoneMeterNos
    });
  }

  function clearSelection() {
    Object.assign(selected, {
      type: "clear", regionId: null, meterNo: "", label: "", zoneMeterNos: []
    });
    treeRef.value?.setCurrentKey(null);
  }

  function filterNode(value: string, data: any) {
    return !value || data.label.toLowerCase().includes(value.toLowerCase());
  }

  return {
    treeRef, treeData, treeKeyword, treeLoading,
    selected, loadTree, selectNode, clearSelection, filterNode
  };
}
