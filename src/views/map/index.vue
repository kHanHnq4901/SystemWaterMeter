<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import trackasiagl from "trackasia-gl";
import "trackasia-gl/dist/trackasia-gl.css";
import { getMapData } from "@/api/waterMeter";

defineOptions({ name: "MapPage" });

interface Gateway {
  gatewayNo: string; meterCount: number; lastPing: string | null;
  avgSignal: number; online: boolean; lat: number; lng: number;
}
interface Meter {
  meterNo: string; meterName: string; address: string; customerCode: string;
  state: number; gatewayNo: string | null; signal: number | null;
  remainBattery: number | null; lastDataTime: string | null; online: boolean;
  lat: number; lng: number; regionId: number | null; regionName: string | null;
}
interface Region { id: number; name: string; parentId: number | null; }

// ─── State ────────────────────────────────────────────────────────────────────
const mapEl      = ref<HTMLDivElement>();
let   map: trackasiagl.Map | null = null;

const loading       = ref(true);
const panelOpen     = ref(true);
const searchKw      = ref("");
const showInfo      = ref(false);
const selected      = ref<{ type: "gateway" | "meter"; data: any } | null>(null);
const gateways      = ref<Gateway[]>([]);
const meters        = ref<Meter[]>([]);
const regions       = ref<Region[]>([]);
const regionTree    = ref<any[]>([]);
const expandedReg   = ref<Set<number>>(new Set());
const selectedRegId = ref<number | null>(null);
const layers        = reactive({ online: true, offline: true, inactive: true });

// ─── Zone colors ──────────────────────────────────────────────────────────────
const PALETTE = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#ec4899","#6366f1","#0ea5e9","#84cc16","#a855f7"];
const zoneColor = (id: number | null) => id ? PALETTE[id % PALETTE.length] : "#64748b";

// ─── Meter helpers ────────────────────────────────────────────────────────────
function meterStatusColor(m: Meter) {
  if (m.state === 2) return "#ef4444";
  if (m.state === 0 || m.state === 3) return "#6b7280";
  return m.online ? "#22c55e" : "#f97316";
}
function meterStatusLabel(m: Meter) {
  if (m.state === 2) return "Hỏng";
  if (m.state === 0) return "Chưa lắp";
  if (m.state === 3) return "Tháo ra";
  return m.online ? "Online" : "Offline";
}
function stateTag(m: Meter): "success"|"danger"|"warning"|"info" {
  if (m.state === 2) return "danger";
  if (m.state === 0 || m.state === 3) return "info";
  return m.online ? "success" : "warning";
}
function metersOfGw(gwNo: string) { return meters.value.filter(m => m.gatewayNo === gwNo); }
function fmtTime(t: string | null) { return t ? new Date(t).toLocaleString("vi-VN") : "Chưa có dữ liệu"; }
function ago(t: string | null) {
  if (!t) return "—";
  const d = Date.now() - new Date(t).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return `${Math.floor(d / 60_000)} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
function flyToMeter(m: Meter) {
  map?.flyTo({ center: [m.lng, m.lat], zoom: 16, speed: 1.5 });
  selected.value = { type: "meter", data: m };
  showInfo.value = true;
}

// ─── Region tree ──────────────────────────────────────────────────────────────
function buildRegionTree(list: Region[]): any[] {
  const mp = new Map(list.map(r => [r.id, { ...r, children: [] as any[] }]));
  const roots: any[] = [];
  mp.forEach(n => { if (n.parentId && mp.has(n.parentId)) mp.get(n.parentId)!.children.push(n); else roots.push(n); });
  return roots;
}
function getDescendantIds(node: any): number[] {
  return [node.id, ...(node.children || []).flatMap(getDescendantIds)];
}

// Meters grouped by regionId (direct children only)
const metersByRegion = computed(() => {
  const m: Record<number, Meter[]> = {};
  meters.value.forEach(meter => {
    if (meter.regionId != null) {
      (m[meter.regionId] ??= []).push(meter);
    }
  });
  return m;
});

const meterCountByRegion = computed(() => {
  const c: Record<number, number> = {};
  meters.value.forEach(m => { if (m.regionId) c[m.regionId] = (c[m.regionId] || 0) + 1; });
  return c;
});
function nodeCount(node: any): number {
  return getDescendantIds(node).reduce((s, id) => s + (meterCountByRegion.value[id] || 0), 0);
}

const kw = computed(() => searchKw.value.toLowerCase().trim());
function nodeMatchesSearch(node: any): boolean {
  if (!kw.value) return true;
  if (node.name.toLowerCase().includes(kw.value)) return true;
  return (node.children || []).some(nodeMatchesSearch);
}

// ─── Zone selection → filter map ──────────────────────────────────────────────
function selectZone(node: any | null) {
  if (node && node.id === selectedRegId.value) { selectedRegId.value = null; filterMapByZone(null); return; }
  selectedRegId.value = node?.id ?? null;
  filterMapByZone(node ? getDescendantIds(node) : null);
}

function buildMeterFeatures(list: Meter[]) {
  return list.map(m => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
    properties: {
      meterNo: m.meterNo, meterName: m.meterName || "", address: m.address || "",
      customerCode: m.customerCode || "", gatewayNo: m.gatewayNo || "",
      state: m.state, online: m.online, signal: m.signal,
      remainBattery: m.remainBattery, lastDataTime: m.lastDataTime,
      cat: m.state === 2 ? "broken" : (m.state === 0 || m.state === 3) ? "inactive" : m.online ? "online" : "offline"
    }
  }));
}

function filterMapByZone(regionIds: number[] | null) {
  const src = map?.getSource("meters-src") as any;
  if (!src) return;
  const list = regionIds ? meters.value.filter(m => m.regionId != null && regionIds.includes(m.regionId)) : meters.value;
  src.setData({ type: "FeatureCollection", features: buildMeterFeatures(list) });
  if (regionIds && list.length > 0) {
    const lngs = list.map(m => m.lng), lats = list.map(m => m.lat);
    map?.fitBounds([[Math.min(...lngs) - 0.003, Math.min(...lats) - 0.003],[Math.max(...lngs) + 0.003, Math.max(...lats) + 0.003]], { padding: 60, maxZoom: 16 });
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const gw = gateways.value, ms = meters.value;
  return {
    gwOnline:  gw.filter(g => g.online).length,
    gwOffline: gw.filter(g => !g.online).length,
    mOnline:   ms.filter(m => m.online).length,
    mOffline:  ms.filter(m => m.state === 1 && !m.online).length,
    mBroken:   ms.filter(m => m.state === 2).length,
    mInactive: ms.filter(m => m.state === 0 || m.state === 3).length,
    total:     ms.length
  };
});

// ─── Map layers ───────────────────────────────────────────────────────────────
function addMapLayers(data: { gateways: Gateway[]; meters: Meter[] }) {
  if (!map) return;

  map.addSource("meters-src", {
    type: "geojson",
    data: { type: "FeatureCollection", features: buildMeterFeatures(data.meters) },
    cluster: true, clusterMaxZoom: 14, clusterRadius: 45
  });
  map.addLayer({ id: "meter-clusters", type: "circle", source: "meters-src", filter: ["has", "point_count"],
    paint: { "circle-color": ["step",["get","point_count"],"#41b6ff",20,"#67c23a",100,"#e6a23c"], "circle-radius": ["step",["get","point_count"],18,20,26,100,34], "circle-stroke-width": 2, "circle-stroke-color": "#fff", "circle-opacity": 0.9 }
  });
  map.addLayer({ id: "meter-cluster-count", type: "symbol", source: "meters-src", filter: ["has", "point_count"],
    layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 }, paint: { "text-color": "#fff" }
  });
  map.addLayer({ id: "meters-online",  type: "circle", source: "meters-src", filter: ["all",["!",["has","point_count"]],["==",["get","cat"],"online"]],
    paint: { "circle-radius": 7, "circle-color": "#22c55e", "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
  });
  map.addLayer({ id: "meters-offline", type: "circle", source: "meters-src", filter: ["all",["!",["has","point_count"]],["==",["get","cat"],"offline"]],
    paint: { "circle-radius": 7, "circle-color": "#f97316", "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
  });
  map.addLayer({ id: "meters-broken",  type: "circle", source: "meters-src", filter: ["all",["!",["has","point_count"]],["in",["get","cat"],["literal",["broken","inactive"]]]],
    paint: { "circle-radius": 6, "circle-color": "#ef4444", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": 0.85 }
  });

  map.addSource("gateways-src", {
    type: "geojson",
    data: { type: "FeatureCollection", features: data.gateways.map(g => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [g.lng, g.lat] }, properties: { ...g } })) }
  });
  map.addLayer({ id: "gateways-ring", type: "circle", source: "gateways-src", paint: { "circle-radius": 16, "circle-opacity": 0.15, "circle-color": ["case",["==",["get","online"],true],"#f59e0b","#9ca3af"] } });
  map.addLayer({ id: "gateways-dot",  type: "circle", source: "gateways-src", paint: { "circle-radius": 10, "circle-color": ["case",["==",["get","online"],true],"#f59e0b","#6b7280"], "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });
  map.addLayer({ id: "gateways-label",type: "symbol", source: "gateways-src", layout: { "text-field": ["get","gatewayNo"], "text-size": 10, "text-offset": [0,1.8], "text-anchor": "top" }, paint: { "text-color": "#374151", "text-halo-color": "#fff", "text-halo-width": 1.5 } });

  ["meters-online","meters-offline","meters-broken"].forEach(id => {
    map!.on("click", id, (e: any) => {
      const m = data.meters.find(x => x.meterNo === e.features[0].properties.meterNo);
      if (m) { selected.value = { type: "meter", data: m }; showInfo.value = true; }
    });
    map!.on("mouseenter", id, () => { map!.getCanvas().style.cursor = "pointer"; });
    map!.on("mouseleave", id, () => { map!.getCanvas().style.cursor = ""; });
  });
  map.on("click", "gateways-dot", (e: any) => {
    const g = data.gateways.find(x => x.gatewayNo === e.features[0].properties.gatewayNo);
    if (g) { selected.value = { type: "gateway", data: g }; showInfo.value = true; }
  });
  map.on("mouseenter","gateways-dot", () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave","gateways-dot", () => { map!.getCanvas().style.cursor = ""; });
  map.on("click","meter-clusters", (e: any) => {
    (map!.getSource("meters-src") as any).getClusterExpansionZoom(e.features[0].properties.cluster_id, (_: any, z: number) => map!.easeTo({ center: e.features[0].geometry.coordinates, zoom: z }));
  });
  map.on("mouseenter","meter-clusters", () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave","meter-clusters", () => { map!.getCanvas().style.cursor = ""; });

  loading.value = false;
}

watch(() => layers.online,   v => map?.getLayer("meters-online")  && map.setLayoutProperty("meters-online",  "visibility", v ? "visible" : "none"));
watch(() => layers.offline,  v => map?.getLayer("meters-offline") && map.setLayoutProperty("meters-offline", "visibility", v ? "visible" : "none"));
watch(() => layers.inactive, v => map?.getLayer("meters-broken")  && map.setLayoutProperty("meters-broken",  "visibility", v ? "visible" : "none"));

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const res = await getMapData();
  if (res.code !== 0 || !res.data) { loading.value = false; return; }
  const data = res.data as { gateways: Gateway[]; meters: Meter[]; regions: Region[] };
  gateways.value   = data.gateways;
  meters.value     = data.meters;
  regions.value    = data.regions ?? [];
  regionTree.value = buildRegionTree(regions.value);
  regionTree.value.forEach(n => expandedReg.value.add(n.id));
  await nextTick();
  if (!mapEl.value) return;
  map = new trackasiagl.Map({ container: mapEl.value, style: "https://maps.track-asia.com/styles/v2/streets.json?key=f4a6c08959b47211756357354b1b73ac74", center: [105.8342, 21.0278], zoom: 12 });
  map.addControl(new trackasiagl.NavigationControl(), "top-right");
  map.addControl(new trackasiagl.ScaleControl({ unit: "metric" }), "bottom-right");
  map.on("load", () => addMapLayers(data));
}

onMounted(() => init());
onUnmounted(() => map?.remove());
</script>

<template>
  <div class="map-page">
    <div ref="mapEl" class="map-canvas" v-loading="loading" />

    <!-- STATS BAR -->
    <div class="stats-bar">
      <span class="si"><span class="sd online" />{{ stats.mOnline }} online</span>
      <span class="sdv" />
      <span class="si"><span class="sd offline" />{{ stats.mOffline }} offline</span>
      <span class="sdv" />
      <span class="si"><span class="sd broken" />{{ stats.mBroken }} hỏng</span>
      <span class="sdv" />
      <span class="si-total">Tổng <b>{{ stats.total }}</b> đồng hồ</span>
    </div>

    <!-- LEFT PANEL -->
    <transition name="slide-left">
      <div v-show="panelOpen" class="left-panel">

        <div class="panel-hd">
          <div class="panel-hd-left">
            <span class="panel-icon">💧</span>
            <span class="panel-title">Vùng Đồng hồ</span>
          </div>
          <button class="hd-btn" @click="panelOpen = false">
            <IconifyIconOnline icon="ri:layout-left-line" width="14" />
          </button>
        </div>

        <div class="panel-search">
          <el-input v-model="searchKw" placeholder="Tìm tên vùng..." clearable size="small">
            <template #prefix><IconifyIconOnline icon="ri:search-line" width="13" color="#475569" /></template>
          </el-input>
        </div>

        <!-- Layer toggles -->
        <div class="layer-bar">
          <label class="lyr"><el-checkbox v-model="layers.online"   size="small" /><span class="lyd" style="background:#22c55e"/>Online<span class="lyc">{{ stats.mOnline }}</span></label>
          <label class="lyr"><el-checkbox v-model="layers.offline"  size="small" /><span class="lyd" style="background:#f97316"/>Offline<span class="lyc">{{ stats.mOffline }}</span></label>
          <label class="lyr"><el-checkbox v-model="layers.inactive" size="small" /><span class="lyd" style="background:#ef4444"/>Hỏng<span class="lyc">{{ stats.mBroken + stats.mInactive }}</span></label>
        </div>

        <!-- Zone tree -->
        <div class="tree-area">
          <el-scrollbar class="tree-scroll">
            <!-- Tất cả -->
            <div :class="['zone-row','root-row', selectedRegId === null && 'is-active']" @click="selectZone(null)">
              <IconifyIconOnline icon="ri:earth-line" width="13" class="earth-icon" />
              <span class="zone-name">Tất cả khu vực</span>
              <span class="zone-cnt">{{ meters.length }}</span>
            </div>

            <template v-for="node in regionTree" :key="node.id">
              <ZoneNode
                v-if="nodeMatchesSearch(node)"
                :node="node" :depth="0"
                :expanded="expandedReg"
                :selected-id="selectedRegId"
                :node-count="nodeCount"
                :zone-color="zoneColor"
                :meters-by-region="metersByRegion"
                :meter-status-color="meterStatusColor"
                @select="selectZone"
                @select-meter="flyToMeter"
                @toggle="(id: number) => expandedReg.has(id) ? expandedReg.delete(id) : expandedReg.add(id)"
              />
            </template>
          </el-scrollbar>
        </div>

      </div>
    </transition>

    <button v-if="!panelOpen" class="reopen-btn" @click="panelOpen = true">
      <IconifyIconOnline icon="ri:layout-right-line" color="#fff" width="17" />
    </button>

    <!-- INFO DRAWER -->
    <transition name="slide-right">
      <div v-if="showInfo && selected" class="info-drawer">
        <div class="info-hd">
          <div class="flex items-center gap-2">
            <IconifyIconOnline :icon="selected.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'" :color="selected.type === 'gateway' ? '#f59e0b' : '#41b6ff'" width="17" />
            <span class="info-hd-title">{{ selected.type === "gateway" ? "Thông tin Gateway" : "Thông tin Đồng hồ" }}</span>
          </div>
          <button class="close-btn" @click="showInfo = false">✕</button>
        </div>

        <el-scrollbar class="info-scroll">
          <template v-if="selected.type === 'gateway'">
            <div class="info-body">
              <div class="icode">{{ selected.data.gatewayNo }}</div>
              <el-tag :type="selected.data.online ? 'success' : 'info'" size="small" class="mb-3">{{ selected.data.online ? '● Online' : '○ Offline' }}</el-tag>
              <div class="igrid">
                <div class="ifield"><span class="il">Số ĐH</span><span class="iv">{{ selected.data.meterCount }}</span></div>
                <div class="ifield"><span class="il">Tín hiệu</span><span class="iv">{{ selected.data.avgSignal }}%</span></div>
                <div class="ifield full"><span class="il">Ping cuối</span><span class="iv">{{ fmtTime(selected.data.lastPing) }}</span></div>
                <div class="ifield full"><span class="il">Cách đây</span><span class="iv" style="color:#f97316">{{ ago(selected.data.lastPing) }}</span></div>
              </div>
              <div class="mt-3">
                <div class="progress-label"><span>Tín hiệu</span><span>{{ selected.data.avgSignal }}%</span></div>
                <el-progress :percentage="selected.data.avgSignal" :color="selected.data.avgSignal > 70 ? '#22c55e' : selected.data.avgSignal > 40 ? '#f97316' : '#ef4444'" :show-text="false" :stroke-width="6" />
              </div>
              <div class="mt-4">
                <p class="sub-label">ĐỒNG HỒ THUỘC GATEWAY</p>
                <div v-for="m in metersOfGw(selected.data.gatewayNo).slice(0,10)" :key="m.meterNo" class="sub-meter-row" @click="flyToMeter(m)">
                  <span class="s-dot" :style="{background: meterStatusColor(m)}" />
                  <span class="s-no">{{ m.meterNo }}</span>
                  <el-tag :type="stateTag(m)" size="small">{{ meterStatusLabel(m) }}</el-tag>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="selected.type === 'meter'">
            <div class="info-body">
              <div class="icode">{{ selected.data.meterNo }}</div>
              <div class="iname">{{ selected.data.meterName || "—" }}</div>
              <el-tag :type="stateTag(selected.data)" size="small" class="mb-3">{{ meterStatusLabel(selected.data) }}</el-tag>
              <div class="igrid">
                <div class="ifield full">
                  <span class="il">Vùng</span>
                  <span class="iv" :style="{color: zoneColor(selected.data.regionId)}">{{ selected.data.regionName || "Chưa phân vùng" }}</span>
                </div>
                <div class="ifield full"><span class="il">Khách hàng</span><span class="iv">{{ selected.data.customerCode || "—" }}</span></div>
                <div class="ifield full"><span class="il">Địa chỉ</span><span class="iv" style="color:#94a3b8">{{ selected.data.address || "—" }}</span></div>
                <div class="ifield full"><span class="il">Dữ liệu cuối</span><span class="iv">{{ fmtTime(selected.data.lastDataTime) }}</span></div>
                <div class="ifield full"><span class="il">Cách đây</span><span class="iv" :class="selected.data.online ? 'text-green-400' : 'text-orange-400'">{{ ago(selected.data.lastDataTime) }}</span></div>
              </div>
              <div class="mt-3" v-if="selected.data.signal != null || selected.data.remainBattery != null">
                <div v-if="selected.data.signal != null">
                  <div class="progress-label"><span>Tín hiệu</span><span>{{ selected.data.signal }}%</span></div>
                  <el-progress :percentage="Number(selected.data.signal)" :color="Number(selected.data.signal)>70?'#22c55e':Number(selected.data.signal)>40?'#f97316':'#ef4444'" :show-text="false" :stroke-width="6" />
                </div>
                <div v-if="selected.data.remainBattery != null" class="mt-2">
                  <div class="progress-label"><span>Pin</span><span>{{ selected.data.remainBattery }}%</span></div>
                  <el-progress :percentage="Number(selected.data.remainBattery)" :color="Number(selected.data.remainBattery)>50?'#22c55e':Number(selected.data.remainBattery)>20?'#f97316':'#ef4444'" :show-text="false" :stroke-width="6" />
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                <el-button size="small" type="primary" plain @click="() => $router.push({ path: '/analysis/data', query: { meterNo: selected!.data.meterNo } })">
                  <IconifyIconOnline icon="ri:line-chart-line" width="13" class="mr-1" />Xem dữ liệu
                </el-button>
              </div>
            </div>
          </template>
        </el-scrollbar>
      </div>
    </transition>

    <!-- LEGEND -->
    <div class="legend-box">
      <div class="leg-row"><span class="lg" style="background:#22c55e"/>Online</div>
      <div class="leg-row"><span class="lg" style="background:#f97316"/>Offline</div>
      <div class="leg-row"><span class="lg" style="background:#ef4444"/>Hỏng</div>
      <div class="leg-row"><span class="lg" style="background:#f59e0b;width:14px;height:14px"/>Gateway</div>
      <div class="leg-row"><span class="lg" style="background:#41b6ff;width:20px;height:20px;opacity:.75"/>Cụm</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.map-page { position:relative; width:100%; height:calc(100vh - 86px); overflow:hidden; background:#0f172a; }
.map-canvas { position:absolute; inset:0; :deep(.el-loading-mask){background:rgba(0,0,0,.55)} }

/* Stats bar */
.stats-bar {
  position:absolute; top:12px; left:50%; transform:translateX(-50%);
  z-index:10; display:flex; align-items:center; gap:12px;
  background:rgba(10,17,32,.92); backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.08); border-radius:20px;
  padding:7px 20px; font-size:.73rem; color:#94a3b8; white-space:nowrap;
  box-shadow:0 4px 20px rgba(0,0,0,.5);
}
.si { display:flex; align-items:center; gap:5px; }
.si-total { color:#64748b; b { color:#cbd5e1; } }
.sd { width:8px; height:8px; border-radius:50%; flex-shrink:0;
  &.online { background:#22c55e; } &.offline { background:#f97316; } &.broken { background:#ef4444; } }
.sdv { width:1px; height:12px; background:rgba(255,255,255,.1); }

/* Left panel */
.left-panel {
  position:absolute; top:0; left:0; bottom:0; width:272px; z-index:20;
  background:#0d1521; border-right:1px solid rgba(255,255,255,.06);
  display:flex; flex-direction:column;
  box-shadow:6px 0 32px rgba(0,0,0,.6);
}

.panel-hd {
  display:flex; align-items:center; justify-content:space-between;
  padding:15px 14px 13px;
  border-bottom:1px solid rgba(255,255,255,.05);
  flex-shrink:0;
}
.panel-hd-left { display:flex; align-items:center; gap:8px; }
.panel-icon { font-size:16px; line-height:1; }
.panel-title { font-size:.84rem; font-weight:700; color:#e2e8f0; letter-spacing:.01em; }
.hd-btn {
  width:28px; height:28px; border-radius:6px; border:none; cursor:pointer;
  background:rgba(255,255,255,.04); color:#475569; display:flex; align-items:center; justify-content:center;
  &:hover { background:rgba(255,255,255,.09); color:#94a3b8; }
}

.panel-search {
  padding:10px 12px 8px; border-bottom:1px solid rgba(255,255,255,.04); flex-shrink:0;
  :deep(.el-input__wrapper) { background:rgba(255,255,255,.05); border-color:rgba(255,255,255,.08); border-radius:8px; }
  :deep(.el-input__inner) { color:#e2e8f0; font-size:.77rem; }
}

.layer-bar {
  padding:8px 14px 10px; border-bottom:1px solid rgba(255,255,255,.04); flex-shrink:0;
}
.lyr {
  display:flex; align-items:center; gap:7px; padding:3px 0;
  font-size:.73rem; color:#64748b; cursor:default;
  .lyc { margin-left:auto; font-size:.65rem; color:#334155;
    background:rgba(255,255,255,.04); border-radius:8px; padding:1px 6px; }
}
.lyd { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

/* Zone tree */
.tree-area { flex:1; overflow:hidden; display:flex; flex-direction:column; padding-top:6px; }
.tree-scroll { flex:1; }

.zone-row {
  display:flex; align-items:center; gap:0; height:36px;
  padding-right:12px; cursor:pointer; user-select:none;
  border-left:3px solid transparent;
  transition:background .12s, border-color .12s;
  &:hover { background:rgba(255,255,255,.03); }
  &.is-active {
    background:rgba(65,182,255,.08);
    border-left-color:#41b6ff;
    .zone-name { color:#7dd3fc; font-weight:600; }
    .zone-cnt { color:#3b82f6; background:rgba(59,130,246,.15); }
  }
  &.root-row {
    height:38px; border-bottom:1px solid rgba(255,255,255,.04); margin-bottom:4px;
    .earth-icon { margin-left:13px; margin-right:8px; color:#475569; }
    .zone-name { font-weight:600; font-size:.78rem; }
  }
}
.zone-name { flex:1; font-size:.75rem; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.zone-cnt  { font-size:.64rem; color:#475569; background:rgba(255,255,255,.05); border-radius:9px; padding:1px 7px; flex-shrink:0; }

/* Meter rows in tree */
.meter-row {
  display:flex; align-items:center; gap:6px; height:30px;
  padding-right:12px; cursor:pointer;
  border-left:3px solid transparent;
  transition:background .1s;
  &:hover { background:rgba(255,255,255,.04); }
  .m-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .m-no  { font-size:.71rem; color:#64748b; white-space:nowrap; flex-shrink:0; }
  .m-name{ font-size:.69rem; color:#475569; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
}

/* Reopen button */
.reopen-btn {
  position:absolute; top:50%; left:8px; transform:translateY(-50%);
  z-index:21; width:32px; height:32px; border-radius:8px;
  background:rgba(10,17,32,.9); border:1px solid rgba(255,255,255,.1);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  &:hover { background:rgba(65,182,255,.2); }
}

/* Info drawer */
.info-drawer {
  position:absolute; top:0; right:0; bottom:0; width:296px; z-index:20;
  background:#0d1521; border-left:1px solid rgba(255,255,255,.06);
  display:flex; flex-direction:column; box-shadow:-6px 0 28px rgba(0,0,0,.5);
}
.info-hd { display:flex; align-items:center; justify-content:space-between; padding:14px 14px 12px; border-bottom:1px solid rgba(255,255,255,.06); flex-shrink:0; }
.info-hd-title { font-size:.82rem; font-weight:600; color:#f1f5f9; }
.close-btn { color:#475569; background:none; border:none; cursor:pointer; font-size:13px; width:26px; height:26px; border-radius:5px; display:flex; align-items:center; justify-content:center; &:hover{color:#e2e8f0;background:rgba(255,255,255,.07)} }
.info-scroll { flex:1; }
.info-body { padding:16px; }
.icode  { font-size:1.05rem; font-weight:700; color:#f1f5f9; margin-bottom:3px; }
.iname  { font-size:.75rem; color:#475569; margin-bottom:10px; }
.igrid  { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
.ifield { display:flex; flex-direction:column; gap:3px; &.full{grid-column:1/-1} }
.il { font-size:.61rem; color:#334155; text-transform:uppercase; letter-spacing:.07em; }
.iv { font-size:.78rem; color:#e2e8f0; }
.progress-label { display:flex; justify-content:space-between; font-size:.7rem; color:#475569; margin-bottom:4px; }
.sub-label { font-size:.62rem; color:#334155; font-weight:700; letter-spacing:.07em; margin-bottom:8px; }
.sub-meter-row { display:flex; align-items:center; gap:7px; padding:6px 8px; border-radius:6px; cursor:pointer; background:rgba(255,255,255,.03); margin-bottom:4px; &:hover{background:rgba(65,182,255,.08)} }
.s-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.s-no  { font-size:.72rem; color:#94a3b8; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Legend */
.legend-box { position:absolute; bottom:30px; left:284px; z-index:10; background:rgba(10,17,32,.88); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.07); border-radius:9px; padding:10px 13px; box-shadow:0 4px 16px rgba(0,0,0,.4); }
.leg-row { display:flex; align-items:center; gap:7px; font-size:.71rem; color:#64748b; margin-bottom:5px; &:last-child{margin-bottom:0} }
.lg { width:10px; height:10px; border-radius:50%; flex-shrink:0; display:inline-block; }

/* Transitions */
.slide-left-enter-active,.slide-left-leave-active   { transition:transform .22s ease; }
.slide-left-enter-from,.slide-left-leave-to         { transform:translateX(-100%); }
.slide-right-enter-active,.slide-right-leave-active { transition:transform .22s ease; }
.slide-right-enter-from,.slide-right-leave-to       { transform:translateX(100%); }

:deep(.maplibregl-ctrl-top-right),
:deep(.maplibregl-ctrl-bottom-right) { right:308px !important; }
:deep(.maplibregl-ctrl-bottom-left)  { display:none; }
</style>

<!-- ─── ZoneNode component ─────────────────────────────────────────────────── -->
<script lang="ts">
import { defineComponent, h } from "vue";

const ZoneNode = defineComponent({
  name: "ZoneNode",
  props: {
    node:             { type: Object,   required: true },
    depth:            { type: Number,   default: 0 },
    expanded:         { type: Object,   required: true },
    selectedId:       { type: Number,   default: null },
    nodeCount:        { type: Function, required: true },
    zoneColor:        { type: Function, required: true },
    metersByRegion:   { type: Object,   required: true },
    meterStatusColor: { type: Function, required: true }
  },
  emits: ["select", "toggle", "select-meter"],
  setup(props, { emit }) {
    return () => {
      const directMeters: any[] = (props.metersByRegion as any)[props.node.id] ?? [];
      const hasChildren = (props.node.children || []).length > 0;
      const hasContent  = hasChildren || directMeters.length > 0;
      const isOpen      = (props.expanded as Set<number>).has(props.node.id);
      const isActive    = props.selectedId === props.node.id;
      const count       = props.nodeCount(props.node);
      const color       = props.zoneColor(props.node.id) as string;
      const baseIndent  = 14 + props.depth * 16;

      // Arrow / bullet
      const arrow = hasContent
        ? h("span", {
            style: `width:18px;flex-shrink:0;text-align:center;font-size:10px;color:#334155;cursor:pointer;padding-left:${baseIndent}px`,
            onClick: (e: Event) => { e.stopPropagation(); emit("toggle", props.node.id); }
          }, isOpen ? "▾" : "▸")
        : h("span", { style: `width:${baseIndent + 18}px;flex-shrink:0` });

      // Color dot
      const dot = h("span", {
        style: `width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;margin-right:7px;box-shadow:0 0 0 2px ${color}22`
      });

      // Zone row
      const row = h("div", {
        class: ["zone-row", isActive ? "is-active" : ""],
        style: { borderLeftColor: isActive ? color : "transparent" },
        onClick: () => emit("select", props.node)
      }, [
        arrow, dot,
        h("span", { class: "zone-name" }, props.node.name),
        count > 0 ? h("span", { class: "zone-cnt" }, count) : null
      ]);

      // Child zone nodes
      const childNodes = isOpen && hasChildren
        ? (props.node.children || []).map((child: any) =>
            h(ZoneNode, {
              node: child, depth: props.depth + 1,
              expanded: props.expanded, selectedId: props.selectedId,
              nodeCount: props.nodeCount, zoneColor: props.zoneColor,
              metersByRegion: props.metersByRegion,
              meterStatusColor: props.meterStatusColor,
              onSelect: (n: any) => emit("select", n),
              onToggle: (id: number) => emit("toggle", id),
              "onSelect-meter": (m: any) => emit("select-meter", m)
            })
          )
        : [];

      // Direct meter rows
      const meterIndent = baseIndent + 36;
      const meterRows = isOpen && directMeters.length > 0
        ? directMeters.map((m: any) =>
            h("div", {
              class: "meter-row",
              style: { paddingLeft: `${meterIndent}px` },
              onClick: () => emit("select-meter", m)
            }, [
              h("span", { class: "m-dot", style: { background: (props.meterStatusColor as any)(m) } }),
              h("span", { class: "m-no" }, m.meterNo),
              m.meterName ? h("span", { class: "m-name" }, m.meterName) : null
            ])
          )
        : [];

      return h("div", {}, [row, ...childNodes, ...meterRows]);
    };
  }
});

export { ZoneNode };
</script>
