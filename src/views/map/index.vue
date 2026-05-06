<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import Close from "~icons/ep/close";
import Refresh from "~icons/ep/refresh";
import trackasiagl from "trackasia-gl";
import "trackasia-gl/dist/trackasia-gl.css";
import { getMapData } from "@/api/waterMeter";
import ZoneMeterTree from "@/components/ZoneMeterTree/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";

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

// ─── State ────────────────────────────────────────────────────────────────────
const mapEl  = ref<HTMLDivElement>();
let   map: trackasiagl.Map | null = null;

const loading    = ref(true);
const refreshing = ref(false);
const panelOpen  = ref(true);
const treeComp   = ref<InstanceType<typeof ZoneMeterTree>>();

const iconClass = computed(() => [
  "size-5.5", "flex-c", "outline-hidden", "rounded-sm",
  "cursor-pointer", "transition-colors",
  "hover:bg-[#0000000f]", "dark:hover:bg-[#ffffff1f]", "dark:hover:text-[#ffffffd9]"
]);
const showInfo = ref(false);
const infoSel  = ref<{ type: "gateway" | "meter"; data: any } | null>(null);
const gateways = ref<Gateway[]>([]);
const meters   = ref<Meter[]>([]);
const layers   = reactive({ online: true, offline: true, inactive: true, gateway: true });

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const gw = gateways.value, ms = meters.value;
  const mOnline  = ms.filter(m => m.state === 1 && m.online).length;
  const mOffline = ms.filter(m => m.state === 1 && !m.online).length;
  const mBroken  = ms.filter(m => m.state === 2).length;
  const mInactive = ms.filter(m => m.state === 0 || m.state === 3).length;
  const total = ms.length;
  return {
    total, mOnline, mOffline, mBroken, mInactive,
    onlinePct: total ? Math.round(mOnline / total * 100) : 0,
    gwOnline:  gw.filter(g => g.online).length,
    gwTotal:   gw.length
  };
});

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
  infoSel.value = { type: "meter", data: m };
  showInfo.value = true;
}
function fitAll() {
  if (!meters.value.length) return;
  const lngs = meters.value.map(m => m.lng), lats = meters.value.map(m => m.lat);
  map?.fitBounds([[Math.min(...lngs)-0.01, Math.min(...lats)-0.01],[Math.max(...lngs)+0.01, Math.max(...lats)+0.01]], { padding: 60, maxZoom: 15 });
}

// ─── Zone → filter map ────────────────────────────────────────────────────────
function updateMapSource(list: Meter[]) {
  const src = map?.getSource("meters-src") as any;
  if (!src) return;
  src.setData({ type: "FeatureCollection", features: buildMeterFeatures(list) });
  if (list.length > 0) {
    const lngs = list.map(m => m.lng), lats = list.map(m => m.lat);
    map?.fitBounds([[Math.min(...lngs)-0.003, Math.min(...lats)-0.003],[Math.max(...lngs)+0.003, Math.max(...lats)+0.003]], { padding: 60, maxZoom: 16 });
  }
}
function onZoneSelect(sel: TreeSelection) {
  if (sel.type === "root") {
    const src = map?.getSource("meters-src") as any;
    src?.setData({ type: "FeatureCollection", features: buildMeterFeatures(meters.value) });
  } else if (sel.type === "zone") {
    const list = sel.zoneMeterNos.length
      ? meters.value.filter(m => sel.zoneMeterNos.includes(m.meterNo))
      : meters.value.filter(m => m.regionId === sel.regionId);
    updateMapSource(list);
  } else if (sel.type === "meter") {
    const m = meters.value.find(x => x.meterNo === sel.meterNo);
    if (m) flyToMeter(m);
  }
}

// ─── Map layers ───────────────────────────────────────────────────────────────
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

function addMapLayers(data: { gateways: Gateway[]; meters: Meter[] }) {
  if (!map) return;
  map.addSource("meters-src", {
    type: "geojson",
    data: { type: "FeatureCollection", features: buildMeterFeatures(data.meters) },
    cluster: true, clusterMaxZoom: 14, clusterRadius: 45
  });
  map.addLayer({ id: "meter-clusters", type: "circle", source: "meters-src", filter: ["has","point_count"],
    paint: { "circle-color": ["step",["get","point_count"],"#41b6ff",20,"#67c23a",100,"#e6a23c"], "circle-radius": ["step",["get","point_count"],18,20,26,100,34], "circle-stroke-width": 2, "circle-stroke-color": "#fff", "circle-opacity": 0.9 }
  });
  map.addLayer({ id: "meter-cluster-count", type: "symbol", source: "meters-src", filter: ["has","point_count"],
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
  map.addLayer({ id: "gateways-ring",  type: "circle", source: "gateways-src", paint: { "circle-radius": 16, "circle-opacity": 0.15, "circle-color": ["case",["==",["get","online"],true],"#f59e0b","#9ca3af"] } });
  map.addLayer({ id: "gateways-dot",   type: "circle", source: "gateways-src", paint: { "circle-radius": 10, "circle-color": ["case",["==",["get","online"],true],"#f59e0b","#6b7280"], "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });
  map.addLayer({ id: "gateways-label", type: "symbol", source: "gateways-src", layout: { "text-field": ["get","gatewayNo"], "text-size": 10, "text-offset": [0,1.8], "text-anchor": "top" }, paint: { "text-color": "#374151", "text-halo-color": "#fff", "text-halo-width": 1.5 } });

  ["meters-online","meters-offline","meters-broken"].forEach(id => {
    map!.on("click", id, (e: any) => {
      const m = data.meters.find(x => x.meterNo === e.features[0].properties.meterNo);
      if (m) { infoSel.value = { type: "meter", data: m }; showInfo.value = true; }
    });
    map!.on("mouseenter", id, () => { map!.getCanvas().style.cursor = "pointer"; });
    map!.on("mouseleave", id, () => { map!.getCanvas().style.cursor = ""; });
  });
  map.on("click", "gateways-dot", (e: any) => {
    const g = data.gateways.find(x => x.gatewayNo === e.features[0].properties.gatewayNo);
    if (g) { infoSel.value = { type: "gateway", data: g }; showInfo.value = true; }
  });
  map.on("mouseenter","gateways-dot",  () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave","gateways-dot",  () => { map!.getCanvas().style.cursor = ""; });
  map.on("click","meter-clusters", (e: any) => {
    (map!.getSource("meters-src") as any).getClusterExpansionZoom(e.features[0].properties.cluster_id, (_: any, z: number) => map!.easeTo({ center: e.features[0].geometry.coordinates, zoom: z }));
  });
  map.on("mouseenter","meter-clusters", () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave","meter-clusters", () => { map!.getCanvas().style.cursor = ""; });

  loading.value = false;
}

watch(() => layers.online,   v => map?.getLayer("meters-online")  && map.setLayoutProperty("meters-online",  "visibility", v ? "visible":"none"));
watch(() => layers.offline,  v => map?.getLayer("meters-offline") && map.setLayoutProperty("meters-offline", "visibility", v ? "visible":"none"));
watch(() => layers.inactive, v => map?.getLayer("meters-broken")  && map.setLayoutProperty("meters-broken",  "visibility", v ? "visible":"none"));
watch(() => layers.gateway,  v => {
  ["gateways-ring","gateways-dot","gateways-label"].forEach(id => map?.getLayer(id) && map.setLayoutProperty(id, "visibility", v ? "visible":"none"));
});

// ─── Init / Refresh ───────────────────────────────────────────────────────────
async function init() {
  loading.value = true;
  const res = await getMapData();
  if (res.code !== 0 || !res.data) { loading.value = false; return; }
  const data = res.data as { gateways: Gateway[]; meters: Meter[] };
  gateways.value = data.gateways;
  meters.value   = data.meters;
  await nextTick();
  if (!mapEl.value) return;
  map = new trackasiagl.Map({
    container: mapEl.value,
    style: "https://maps.track-asia.com/styles/v2/streets.json?key=f4a6c08959b47211756357354b1b73ac74",
    center: [105.8342, 21.0278], zoom: 12
  });
  map.addControl(new trackasiagl.NavigationControl(), "top-right");
  map.addControl(new trackasiagl.ScaleControl({ unit: "metric" }), "bottom-right");
  map.on("load", () => addMapLayers(data));
}

async function handleRefresh() {
  refreshing.value = true;
  const res = await getMapData();
  if (res.code === 0 && res.data) {
    const data = res.data as { gateways: Gateway[]; meters: Meter[] };
    gateways.value = data.gateways;
    meters.value   = data.meters;
    const mSrc = map?.getSource("meters-src") as any;
    const gSrc = map?.getSource("gateways-src") as any;
    mSrc?.setData({ type: "FeatureCollection", features: buildMeterFeatures(data.meters) });
    gSrc?.setData({ type: "FeatureCollection", features: data.gateways.map(g => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [g.lng, g.lat] }, properties: { ...g } })) });
    treeComp.value?.loadTree();
  }
  refreshing.value = false;
}

onMounted(() => init());
onUnmounted(() => map?.remove());
</script>

<template>
  <div class="main">

    <!-- ── STATS BAR ──────────────────────────────────────────────────── -->
    <div class="stats-bar bg-bg_color">
      <!-- Tổng -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#eff6ff">
          <IconifyIconOnline icon="ri:drop-fill" color="#3b82f6" width="14" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Tổng đồng hồ</span>
          <span class="kpi-val">{{ stats.total }}</span>
        </div>
      </div>
      <div class="stat-sep" />
      <!-- Online -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#f0fdf4">
          <span class="kpi-dot" style="background:#22c55e" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Online</span>
          <span class="kpi-val text-green-500">{{ stats.mOnline }} <em>{{ stats.onlinePct }}%</em></span>
        </div>
      </div>
      <!-- Offline -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#fff7ed">
          <span class="kpi-dot" style="background:#f97316" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Offline</span>
          <span class="kpi-val text-orange-400">{{ stats.mOffline }}</span>
        </div>
      </div>
      <!-- Hỏng -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#fef2f2">
          <span class="kpi-dot" style="background:#ef4444" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Hỏng</span>
          <span class="kpi-val text-red-500">{{ stats.mBroken }}</span>
        </div>
      </div>
      <!-- Không HĐ -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#f9fafb">
          <span class="kpi-dot" style="background:#9ca3af" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Không HĐ</span>
          <span class="kpi-val text-gray-400">{{ stats.mInactive }}</span>
        </div>
      </div>
      <div class="stat-sep" />
      <!-- Gateway -->
      <div class="kpi-card">
        <span class="kpi-icon" style="background:#fffbeb">
          <IconifyIconOnline icon="ri:router-line" color="#f59e0b" width="14" />
        </span>
        <div class="kpi-body">
          <span class="kpi-label">Gateway online</span>
          <span class="kpi-val">
            <span class="text-amber-500">{{ stats.gwOnline }}</span>
            <span class="kpi-total">/{{ stats.gwTotal }}</span>
          </span>
        </div>
      </div>
      <div class="stat-sep" />
      <!-- Progress -->
      <div class="kpi-card" style="gap:8px">
        <div class="kpi-body">
          <span class="kpi-label">Tỉ lệ online</span>
          <div class="flex items-center gap-2 mt-1">
            <el-progress
              :percentage="stats.onlinePct"
              :color="stats.onlinePct>=80?'#22c55e':stats.onlinePct>=50?'#f97316':'#ef4444'"
              :show-text="false" :stroke-width="5" style="width:72px;flex-shrink:0"
            />
            <span class="text-xs font-semibold"
              :class="stats.onlinePct>=80?'text-green-500':stats.onlinePct>=50?'text-orange-400':'text-red-500'">
              {{ stats.onlinePct }}%
            </span>
          </div>
        </div>
      </div>
      <!-- Actions -->
      <div class="ml-auto flex items-center gap-1.5 pr-1">
        <el-tooltip content="Zoom toàn bộ" placement="bottom">
          <el-button size="small" circle @click="fitAll">
            <IconifyIconOnline icon="ri:fullscreen-line" width="13" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="Làm mới" placement="bottom">
          <el-button size="small" circle :loading="refreshing" @click="handleRefresh">
            <IconifyIconOffline v-if="!refreshing" :icon="Refresh" width="13" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- ── MAIN ROW: MAP + PANEL ──────────────────────────────────────── -->
    <div class="flex">

      <!-- MAP AREA -->
      <div
        class="map-wrap flex-1"
        style="transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <div ref="mapEl" class="map-canvas" v-loading="loading" />

        <!-- Nút mở panel -->
        <button v-if="!panelOpen" class="open-panel-btn" @click="panelOpen = true">
          <IconifyIconOnline icon="ri:layout-right-line" color="#41b6ff" width="14" class="mr-1" />
          Vùng / ĐH
        </button>

        <!-- Layer toggles overlay -->
        <div class="layer-bar">
          <label :class="['ly-pill', layers.online  && 'ly-pill--on']" @click="layers.online  = !layers.online">
            <span class="ly-dot" style="background:#22c55e" />Online
            <span class="ly-cnt">{{ stats.mOnline }}</span>
          </label>
          <label :class="['ly-pill', layers.offline && 'ly-pill--on']" @click="layers.offline = !layers.offline">
            <span class="ly-dot" style="background:#f97316" />Offline
            <span class="ly-cnt">{{ stats.mOffline }}</span>
          </label>
          <label :class="['ly-pill', layers.inactive && 'ly-pill--on']" @click="layers.inactive = !layers.inactive">
            <span class="ly-dot" style="background:#ef4444" />Hỏng
            <span class="ly-cnt">{{ stats.mBroken }}</span>
          </label>
          <label :class="['ly-pill', layers.gateway && 'ly-pill--on']" @click="layers.gateway = !layers.gateway">
            <span class="ly-dot" style="background:#f59e0b" />Gateway
            <span class="ly-cnt">{{ stats.gwTotal }}</span>
          </label>
        </div>

        <!-- Legend -->
        <div class="legend-box">
          <div class="leg-row"><span class="lg" style="background:#22c55e" />Online</div>
          <div class="leg-row"><span class="lg" style="background:#f97316" />Offline</div>
          <div class="leg-row"><span class="lg" style="background:#ef4444" />Hỏng/Không HĐ</div>
          <div class="leg-row"><span class="lg" style="background:#f59e0b;width:12px;height:12px" />Gateway</div>
          <div class="leg-row"><span class="lg" style="background:#41b6ff;width:17px;height:17px;opacity:.85" />Cụm ĐH</div>
        </div>

        <!-- Info float -->
        <transition name="info-fade">
          <div v-if="showInfo && infoSel" class="info-float">
            <div class="info-float-hd">
              <div class="flex items-center gap-2">
                <span class="info-icon-badge" :style="infoSel.type==='gateway' ? 'background:#fffbeb' : 'background:#eff6ff'">
                  <IconifyIconOnline
                    :icon="infoSel.type==='gateway'?'ri:router-line':'ri:drop-line'"
                    :color="infoSel.type==='gateway'?'#f59e0b':'#3b82f6'" width="14" />
                </span>
                <div>
                  <p class="text-xs font-semibold leading-tight">{{ infoSel.type==="gateway" ? "Gateway" : "Đồng hồ nước" }}</p>
                  <p class="text-[10px] text-[var(--el-text-color-placeholder)] leading-tight">
                    {{ infoSel.type==="gateway" ? "Thiết bị thu phát" : "Đồng hồ đo nước" }}
                  </p>
                </div>
              </div>
              <span :class="iconClass">
                <IconifyIconOffline :icon="Close" width="14" height="14" @click="showInfo=false" />
              </span>
            </div>
            <el-scrollbar max-height="400px">
              <div class="px-3 pb-3">

                <!-- Gateway info -->
                <template v-if="infoSel.type==='gateway'">
                  <div class="icode">{{ infoSel.data.gatewayNo }}</div>
                  <el-tag :type="infoSel.data.online?'success':'info'" size="small" class="mb-3">
                    {{ infoSel.data.online ? "● Online" : "○ Offline" }}
                  </el-tag>
                  <div class="igrid">
                    <div class="ifield"><span class="il">Đồng hồ</span><span class="iv">{{ infoSel.data.meterCount }}</span></div>
                    <div class="ifield"><span class="il">Tín hiệu TB</span><span class="iv">{{ infoSel.data.avgSignal }}%</span></div>
                    <div class="ifield full"><span class="il">Ping cuối</span><span class="iv">{{ fmtTime(infoSel.data.lastPing) }}</span></div>
                    <div class="ifield full"><span class="il">Cách đây</span><span class="iv text-orange-500">{{ ago(infoSel.data.lastPing) }}</span></div>
                  </div>
                  <div class="mt-3">
                    <div class="progress-label"><span>Cường độ tín hiệu</span><span>{{ infoSel.data.avgSignal }}%</span></div>
                    <el-progress :percentage="infoSel.data.avgSignal" :color="infoSel.data.avgSignal>70?'#22c55e':infoSel.data.avgSignal>40?'#f97316':'#ef4444'" :show-text="false" :stroke-width="5" />
                  </div>
                  <div v-if="metersOfGw(infoSel.data.gatewayNo).length" class="mt-3">
                    <p class="sub-label">Đồng hồ thuộc gateway</p>
                    <div v-for="m in metersOfGw(infoSel.data.gatewayNo).slice(0,8)" :key="m.meterNo" class="sub-meter-row" @click="flyToMeter(m)">
                      <span class="s-dot" :style="{background: meterStatusColor(m)}" />
                      <span class="s-no">{{ m.meterNo }}</span>
                      <el-tag :type="stateTag(m)" size="small">{{ meterStatusLabel(m) }}</el-tag>
                    </div>
                    <p v-if="metersOfGw(infoSel.data.gatewayNo).length>8" class="text-[10px] text-[var(--el-text-color-placeholder)] mt-1 text-right">
                      +{{ metersOfGw(infoSel.data.gatewayNo).length-8 }} đồng hồ khác
                    </p>
                  </div>
                </template>

                <!-- Meter info -->
                <template v-else-if="infoSel.type==='meter'">
                  <div class="icode">{{ infoSel.data.meterNo }}</div>
                  <div class="iname">{{ infoSel.data.meterName || "—" }}</div>
                  <el-tag :type="stateTag(infoSel.data)" size="small" class="mb-3">{{ meterStatusLabel(infoSel.data) }}</el-tag>
                  <div class="igrid">
                    <div class="ifield full"><span class="il">Vùng</span><span class="iv">{{ infoSel.data.regionName || "Chưa phân vùng" }}</span></div>
                    <div class="ifield full"><span class="il">Mã khách hàng</span><span class="iv">{{ infoSel.data.customerCode || "—" }}</span></div>
                    <div class="ifield full"><span class="il">Địa chỉ</span><span class="iv" style="color:var(--el-text-color-secondary)">{{ infoSel.data.address || "—" }}</span></div>
                    <div class="ifield full"><span class="il">Dữ liệu cuối</span><span class="iv">{{ fmtTime(infoSel.data.lastDataTime) }}</span></div>
                    <div class="ifield full"><span class="il">Cách đây</span>
                      <span class="iv" :class="infoSel.data.online?'text-green-500':'text-orange-500'">{{ ago(infoSel.data.lastDataTime) }}</span>
                    </div>
                  </div>
                  <template v-if="infoSel.data.signal!=null||infoSel.data.remainBattery!=null">
                    <div v-if="infoSel.data.signal!=null" class="mt-2">
                      <div class="progress-label"><span>Tín hiệu</span><span>{{ infoSel.data.signal }}%</span></div>
                      <el-progress :percentage="Number(infoSel.data.signal)" :color="Number(infoSel.data.signal)>70?'#22c55e':Number(infoSel.data.signal)>40?'#f97316':'#ef4444'" :show-text="false" :stroke-width="5" />
                    </div>
                    <div v-if="infoSel.data.remainBattery!=null" class="mt-2">
                      <div class="progress-label"><span>Pin</span><span>{{ infoSel.data.remainBattery }}%</span></div>
                      <el-progress :percentage="Number(infoSel.data.remainBattery)" :color="Number(infoSel.data.remainBattery)>50?'#22c55e':Number(infoSel.data.remainBattery)>20?'#f97316':'#ef4444'" :show-text="false" :stroke-width="5" />
                    </div>
                  </template>
                  <div class="mt-3 flex gap-2">
                    <el-button size="small" type="primary" plain
                      @click="() => $router.push({ path:'/analysis/data', query:{ meterNo: infoSel!.data.meterNo } })">
                      <IconifyIconOnline icon="ri:line-chart-line" width="13" class="mr-1" />Xem dữ liệu
                    </el-button>
                    <el-button size="small" plain @click="showInfo=false">Đóng</el-button>
                  </div>
                </template>

              </div>
            </el-scrollbar>
          </div>
        </transition>
      </div>

      <!-- ZONE PANEL -->
      <div
        v-if="panelOpen"
        class="w-[280px]! flex-shrink-0 mt-2 px-2 pb-2 bg-bg_color ml-2 overflow-auto"
      >
        <div class="flex justify-between w-full px-3 pt-5 pb-3">
          <div class="flex">
            <span :class="iconClass">
              <IconifyIconOffline class="dark:text-white" width="18px" height="18px" :icon="Close" @click="panelOpen=false" />
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <IconifyIconOnline icon="ri:map-2-line" color="#41b6ff" width="14" />
            <p class="font-bold text-sm truncate">Vùng / Đồng hồ</p>
            <span class="panel-badge">{{ stats.total }}</span>
          </div>
        </div>
        <div class="panel-divider" />

        <ZoneMeterTree
          ref="treeComp"
          title="Chọn vùng / đồng hồ"
          height="calc(100vh - 220px)"
          @select="onZoneSelect"
        />
      </div>

    </div>
  </div>
</template>

<style lang="scss" scoped>
/* ── Stats bar ── */
.stats-bar {
  display: flex; align-items: center; flex-wrap: wrap;
  padding: 0 8px;
  height: 52px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}
.kpi-card {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 100%;
  border-radius: 6px; transition: background .12s;
  &:hover { background: var(--el-fill-color-light); }
}
.kpi-icon {
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-dot  { width: 9px; height: 9px; border-radius: 50%; }
.kpi-body { display: flex; flex-direction: column; gap: 1px; }
.kpi-label { font-size: .63rem; color: var(--el-text-color-secondary); white-space: nowrap; }
.kpi-val   { font-size: .82rem; font-weight: 700; color: var(--el-text-color-primary); line-height: 1;
  em { font-size: .65rem; font-style: normal; font-weight: 500; color: var(--el-text-color-placeholder); margin-left: 3px; } }
.kpi-total { font-size: .72rem; font-weight: 400; color: var(--el-text-color-placeholder); }
.stat-sep  { width: 1px; height: 28px; background: var(--el-border-color-light); flex-shrink: 0; }

/* ── Map area ── */
.map-wrap {
  position: relative;
  height: calc(100vh - 150px);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
}
.map-canvas { position: absolute; inset: 0; }

/* Open panel button */
.open-panel-btn {
  position: absolute; top: 12px; left: 12px; z-index: 10;
  display: flex; align-items: center;
  background: var(--el-bg-color); border: 1px solid var(--el-border-color);
  border-radius: 20px; padding: 5px 12px;
  font-size: .72rem; color: var(--el-text-color-regular);
  cursor: pointer; box-shadow: var(--el-box-shadow-light);
  &:hover { background: var(--el-fill-color); }
}

/* Layer pill toggles (top-center of map) */
.layer-bar {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 10;
  display: flex; align-items: center; gap: 4px;
  background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter);
  border-radius: 20px; padding: 4px 6px; box-shadow: var(--el-box-shadow-light);
}
.ly-pill {
  display: flex; align-items: center; gap: 5px;
  font-size: .69rem; color: var(--el-text-color-placeholder);
  cursor: pointer; padding: 3px 9px; border-radius: 14px;
  border: 1px solid transparent; transition: all .15s;
  opacity: .55;
  &:hover { background: var(--el-fill-color); opacity: .8; }
  &--on { background: var(--el-fill-color); border-color: var(--el-border-color); color: var(--el-text-color-regular); opacity: 1; }
}
.ly-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ly-cnt { font-size: .63rem; background: var(--el-fill-color-darker); border-radius: 8px; padding: 0 5px; color: var(--el-text-color-secondary); }
.ly-pill--on .ly-cnt { background: var(--el-fill-color-extra-light); }

/* Legend */
.legend-box {
  position: absolute; bottom: 24px; left: 12px; z-index: 10;
  background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px; padding: 8px 12px; box-shadow: var(--el-box-shadow-light);
}
.leg-row { display: flex; align-items: center; gap: 6px; font-size: .69rem; color: var(--el-text-color-secondary); margin-bottom: 4px; &:last-child { margin-bottom: 0; } }
.lg { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

/* Floating info panel */
.info-float {
  position: absolute; top: 12px; right: 12px; z-index: 20;
  width: 292px; max-height: calc(100% - 24px);
  background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12);
  display: flex; flex-direction: column; overflow: hidden;
}
.info-float-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  flex-shrink: 0;
}
.info-icon-badge {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.icode  { font-size: .95rem; font-weight: 700; color: var(--el-text-color-primary); margin: 10px 0 2px; }
.iname  { font-size: .72rem; color: var(--el-text-color-secondary); margin-bottom: 8px; }
.igrid  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.ifield { display: flex; flex-direction: column; gap: 2px; &.full { grid-column: 1 / -1; } }
.il { font-size: .58rem; color: var(--el-text-color-placeholder); text-transform: uppercase; letter-spacing: .05em; }
.iv { font-size: .78rem; color: var(--el-text-color-primary); }
.progress-label { display: flex; justify-content: space-between; font-size: .69rem; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.sub-label { font-size: .58rem; color: var(--el-text-color-placeholder); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; margin-top: 14px; }
.sub-meter-row { display: flex; align-items: center; gap: 7px; padding: 5px 8px; border-radius: 7px; cursor: pointer; background: var(--el-fill-color-light); margin-bottom: 3px; transition: background .1s; &:hover { background: var(--el-color-primary-light-9); } }
.s-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.s-no  { font-size: .71rem; color: var(--el-text-color-regular); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Zone panel */
.panel-badge {
  font-size: .62rem; font-weight: 600; padding: 1px 7px; border-radius: 10px;
  background: var(--el-color-primary-light-9); color: var(--el-color-primary);
}
.panel-divider {
  height: 1px; background: var(--el-border-color-extra-light); margin: 0 12px 8px;
}

/* Transitions */
.info-fade-enter-active, .info-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.info-fade-enter-from, .info-fade-leave-to { opacity: 0; transform: translateY(-8px) scale(.98); }

:deep(.maplibregl-ctrl-top-right)    { top: 12px; right: 12px; }
:deep(.maplibregl-ctrl-bottom-right) { bottom: 24px; right: 12px; }
:deep(.maplibregl-ctrl-bottom-left)  { display: none; }
</style>
