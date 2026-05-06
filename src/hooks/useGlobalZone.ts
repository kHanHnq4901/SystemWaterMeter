import { reactive, readonly } from "vue";
import type { TreeSelection } from "./useZoneMeterTree";

const state = reactive<TreeSelection & { hasFilter: boolean }>({
  type: "clear",
  regionId: null,
  meterNo: "",
  label: "",
  zoneMeterNos: [],
  hasFilter: false
});

export function useGlobalZone() {
  function setZone(sel: TreeSelection) {
    Object.assign(state, sel);
    state.hasFilter = sel.type !== "clear";
  }

  function clearZone() {
    Object.assign(state, {
      type: "clear",
      regionId: null,
      meterNo: "",
      label: "",
      zoneMeterNos: [],
      hasFilter: false
    });
  }

  return {
    zone: readonly(state),
    setZone,
    clearZone
  };
}
