<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import trackasiagl from "trackasia-gl";
import "trackasia-gl/dist/trackasia-gl.css";
import { getMapData } from "@/api/waterMeter";

defineOptions({ name: "MapPage" });

// ══════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════
interface Gateway {
  gatewayNo: string; meterCount: number; lastPing: string | null;
  avgSignal: number; online: boolean; lat: number; lng: number;
}
interface Meter {
  meterNo: string; meterName: string; address: string; customerCode: string;
  state: number; gatewayNo: string | null; signal: number | null;
  remainBattery: number | null; lastDataTime: string | null; online: boolean;
  lat: number; lng: number;
}

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const mapEl     = ref<HTMLDivElement>();
let   map: trackasiagl.Map | null = null;

const loading    = ref(true);
const panelOpen  = ref(true);
const searchKw   = ref("");
const showInfo   = ref(false);
const selected   = ref<{ type: "gateway" | "meter"; data: any } | null>(null);

const gateways   = ref<Gateway[]>([]);
const meters     = ref<Meter[]>([]);
const expandedGw = ref<Set<string>>(new Set());

// Layer visibility
const layers = reactive({ gateways: true, online: true, offline: true, inactive: true });

// ══════════════════════════════════════════════════════════════════
// COMPUTED STATS
// ══════════════════════════════════════════════════════════════════
const stats = computed(() => {
  const gw = gateways.value;
  const ms = meters.value;
  const now = Date.now();
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

// ══════════════════════════════════════════════════════════════════
// FILTERED DEVICE LIST (left panel)
// ══════════════════════════════════════════════════════════════════
const kw = computed(() => searchKw.value.toLowerCase().trim());

const filteredGateways = computed(() =>
  gateways.value.filter(g =>
    !kw.value || g.gatewayNo.toLowerCase().includes(kw.value)
  )
);

function metersOfGw(gwNo: string) {
  return meters.value.filter(m =>
    m.gatewayNo === gwNo &&
    (!kw.value || m.meterNo.toLowerCase().includes(kw.value) ||
     (m.meterName || "").toLowerCase().includes(kw.value))
  );
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function meterStatusColor(m: Meter) {
  if (m.state === 2) return "#ef4444";
  if (m.state === 0 || m.state === 3) return "#9ca3af";
  return m.online ? "#22c55e" : "#f97316";
}
function meterStatusLabel(m: Meter) {
  if (m.state === 2) return "Hỏng";
  if (m.state === 0) return "Chưa lắp";
  if (m.state === 3) return "Tháo ra";
  return m.online ? "Online" : "Offline";
}
function stateTag(m: Meter): "success" | "danger" | "warning" | "info" {
  if (m.state === 2) return "danger";
  if (m.state === 0 || m.state === 3) return "info";
  return m.online ? "success" : "warning";
}
function fmtTime(t: string | null) {
  return t ? new Date(t).toLocaleString("vi-VN") : "Chưa có dữ liệu";
}
function ago(t: string | null) {
  if (!t) return "—";
  const diff = Date.now() - new Date(t).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

// ══════════════════════════════════════════════════════════════════
// MAP FUNCTIONS
// ══════════════════════════════════════════════════════════════════
function buildGeoJSON(items: any[], props: (item: any) => any) {
  return {
    type: "FeatureCollection" as const,
    features: items.map(item => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [item.lng, item.lat] },
      properties: props(item)
    }))
  };
}

function addMapLayers(data: { gateways: Gateway[]; meters: Meter[] }) {
  if (!map) return;

  // ─── METERS source (clustered) ────────────────────────────────
  const meterFeatures = data.meters.map(m => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
    properties: {
      id: m.meterNo, meterNo: m.meterNo, meterName: m.meterName || "",
      address: m.address || "", customerCode: m.customerCode || "",
      gatewayNo: m.gatewayNo || "", state: m.state, online: m.online,
      signal: m.signal, remainBattery: m.remainBattery,
      lastDataTime: m.lastDataTime,
      statusColor: meterStatusColor(m),
      // category for filter
      cat: m.state === 2 ? "broken" : (m.state === 0 || m.state === 3) ? "inactive" : m.online ? "online" : "offline"
    }
  }));

  map.addSource("meters-src", {
    type: "geojson",
    data: { type: "FeatureCollection", features: meterFeatures },
    cluster: true, clusterMaxZoom: 14, clusterRadius: 45
  });

  // Cluster circle
  map.addLayer({
    id: "meter-clusters", type: "circle", source: "meters-src",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#41b6ff", 20, "#67c23a", 100, "#e6a23c"],
      "circle-radius": ["step", ["get", "point_count"], 18, 20, 26, 100, 34],
      "circle-stroke-width": 2, "circle-stroke-color": "#fff", "circle-opacity": 0.88
    }
  });
  map.addLayer({
    id: "meter-cluster-count", type: "symbol", source: "meters-src",
    filter: ["has", "point_count"],
    layout: { "text-field": "{point_count_abbreviated}", "text-size": 12, "text-font": ["Open Sans Bold"] },
    paint: { "text-color": "#fff" }
  });

  // Individual meters
  map.addLayer({
    id: "meters-online", type: "circle", source: "meters-src",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "cat"], "online"]],
    paint: { "circle-radius": 7, "circle-color": "#22c55e", "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
  });
  map.addLayer({
    id: "meters-offline", type: "circle", source: "meters-src",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "cat"], "offline"]],
    paint: { "circle-radius": 7, "circle-color": "#f97316", "circle-stroke-width": 2, "circle-stroke-color": "#fff" }
  });
  map.addLayer({
    id: "meters-broken", type: "circle", source: "meters-src",
    filter: ["all", ["!", ["has", "point_count"]], ["in", ["get", "cat"], ["literal", ["broken", "inactive"]]]],
    paint: { "circle-radius": 6, "circle-color": "#ef4444", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": 0.8 }
  });

  // ─── GATEWAYS source ──────────────────────────────────────────
  map.addSource("gateways-src", {
    type: "geojson",
    data: buildGeoJSON(data.gateways, g => ({
      id: g.gatewayNo, gatewayNo: g.gatewayNo, meterCount: g.meterCount,
      lastPing: g.lastPing, avgSignal: g.avgSignal, online: g.online
    }))
  });

  // Gateway outer ring
  map.addLayer({
    id: "gateways-ring", type: "circle", source: "gateways-src",
    paint: {
      "circle-radius": 16, "circle-opacity": 0.2,
      "circle-color": ["case", ["==", ["get", "online"], true], "#f59e0b", "#9ca3af"]
    }
  });
  // Gateway center
  map.addLayer({
    id: "gateways-dot", type: "circle", source: "gateways-src",
    paint: {
      "circle-radius": 10,
      "circle-color": ["case", ["==", ["get", "online"], true], "#f59e0b", "#6b7280"],
      "circle-stroke-width": 2.5, "circle-stroke-color": "#fff"
    }
  });
  // Gateway label
  map.addLayer({
    id: "gateways-label", type: "symbol", source: "gateways-src",
    layout: {
      "text-field": ["get", "gatewayNo"],
      "text-size": 10, "text-offset": [0, 1.8], "text-anchor": "top"
    },
    paint: { "text-color": "#374151", "text-halo-color": "#fff", "text-halo-width": 1.5 }
  });

  // ─── CLICK HANDLERS ───────────────────────────────────────────
  ["meters-online", "meters-offline", "meters-broken"].forEach(layerId => {
    map!.on("click", layerId, (e: any) => {
      const p = e.features[0].properties;
      const m = data.meters.find(x => x.meterNo === p.meterNo);
      if (m) { selected.value = { type: "meter", data: m }; showInfo.value = true; }
    });
    map!.on("mouseenter", layerId, () => { map!.getCanvas().style.cursor = "pointer"; });
    map!.on("mouseleave", layerId, () => { map!.getCanvas().style.cursor = ""; });
  });

  map.on("click", "gateways-dot", (e: any) => {
    const p = e.features[0].properties;
    const g = data.gateways.find(x => x.gatewayNo === p.gatewayNo);
    if (g) { selected.value = { type: "gateway", data: g }; showInfo.value = true; }
  });
  map.on("mouseenter", "gateways-dot", () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "gateways-dot", () => { map!.getCanvas().style.cursor = ""; });

  // Cluster expand on click
  map.on("click", "meter-clusters", (e: any) => {
    const src = map!.getSource("meters-src") as any;
    src.getClusterExpansionZoom(e.features[0].properties.cluster_id, (_: any, zoom: number) => {
      map!.easeTo({ center: e.features[0].geometry.coordinates, zoom });
    });
  });
  map.on("mouseenter", "meter-clusters", () => { map!.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "meter-clusters", () => { map!.getCanvas().style.cursor = ""; });

  loading.value = false;
}

function flyTo(lng: number, lat: number, zoom = 15) {
  map?.flyTo({ center: [lng, lat], zoom, speed: 1.5 });
}

function flyToGateway(gw: Gateway) {
  flyTo(gw.lng, gw.lat, 14);
  selected.value = { type: "gateway", data: gw };
  showInfo.value = true;
}

function flyToMeter(m: Meter) {
  flyTo(m.lng, m.lat, 16);
  selected.value = { type: "meter", data: m };
  showInfo.value = true;
}

// Layer toggles
watch(() => layers.gateways, v => {
  const vis = v ? "visible" : "none";
  ["gateways-ring", "gateways-dot", "gateways-label"].forEach(id => {
    if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
  });
});
watch(() => layers.online, v => {
  if (map?.getLayer("meters-online")) map.setLayoutProperty("meters-online", "visibility", v ? "visible" : "none");
});
watch(() => layers.offline, v => {
  if (map?.getLayer("meters-offline")) map.setLayoutProperty("meters-offline", "visibility", v ? "visible" : "none");
});
watch(() => layers.inactive, v => {
  if (map?.getLayer("meters-broken")) map.setLayoutProperty("meters-broken", "visibility", v ? "visible" : "none");
});

// ══════════════════════════════════════════════════════════════════
// LOAD DATA + INIT MAP
// ══════════════════════════════════════════════════════════════════
async function init() {
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
    center: [105.8342, 21.0278],
    zoom: 12
  });

  map.addControl(new trackasiagl.NavigationControl(), "top-right");
  map.addControl(new trackasiagl.ScaleControl({ unit: "metric" }), "bottom-right");

  map.on("load", () => addMapLayers(data));
}

onMounted(() => init());
onUnmounted(() => map?.remove());
</script>

<template>
  <div class="map-page">
    <!-- ══ MAP CANVAS ══ -->
    <div ref="mapEl" class="map-canvas" v-loading="loading" />

    <!-- ══ TOP STATS BAR ══ -->
    <div class="stats-bar">
      <div class="stat-item">
        <IconifyIconOnline icon="ri:router-line" color="#f59e0b" width="14" />
        <span>Gateway:</span>
        <b class="text-green-400">{{ stats.gwOnline }} online</b>
        <b class="text-gray-400 ml-1">{{ stats.gwOffline }} offline</b>
      </div>
      <div class="stat-sep">|</div>
      <div class="stat-item">
        <IconifyIconOnline icon="ri:drop-line" color="#41b6ff" width="14" />
        <span>Đồng hồ:</span>
        <b class="text-green-400">{{ stats.mOnline }} online</b>
        <b class="text-orange-400 ml-1">{{ stats.mOffline }} offline</b>
        <b class="text-red-400 ml-1">{{ stats.mBroken }} hỏng</b>
        <b class="text-gray-400 ml-1">{{ stats.mInactive }} không hoạt động</b>
      </div>
      <div class="stat-sep">|</div>
      <span class="text-gray-300 text-xs">Tổng: {{ stats.total }} đồng hồ</span>
    </div>

    <!-- ══ LEFT PANEL ══ -->
    <transition name="slide-left">
      <div v-show="panelOpen" class="left-panel">

        <!-- Header -->
        <div class="panel-header">
          <div class="flex items-center gap-2">
            <IconifyIconOnline icon="ri:map-2-line" color="#41b6ff" width="16" />
            <span class="text-sm font-semibold text-white">Hệ thống Đồng hồ Nước</span>
          </div>
          <el-button link @click="panelOpen = false" class="text-gray-400 hover:text-white">
            <IconifyIconOnline icon="ri:layout-left-line" width="16" />
          </el-button>
        </div>

        <!-- Search -->
        <div class="px-3 py-2">
          <el-input v-model="searchKw" placeholder="Tìm gateway / đồng hồ..." clearable size="small"
            class="panel-search">
            <template #prefix><IconifyIconOnline icon="ri:search-line" width="13" /></template>
          </el-input>
        </div>

        <!-- Layer Toggles -->
        <div class="layer-section">
          <p class="section-title">LỚP BẢN ĐỒ</p>
          <label class="layer-row">
            <el-checkbox v-model="layers.gateways" size="small" />
            <span class="layer-dot" style="background:#f59e0b" />
            <span class="text-xs">Gateway</span>
          </label>
          <label class="layer-row">
            <el-checkbox v-model="layers.online" size="small" />
            <span class="layer-dot" style="background:#22c55e" />
            <span class="text-xs">Đang online</span>
            <span class="layer-count">{{ stats.mOnline }}</span>
          </label>
          <label class="layer-row">
            <el-checkbox v-model="layers.offline" size="small" />
            <span class="layer-dot" style="background:#f97316" />
            <span class="text-xs">Ngoại tuyến</span>
            <span class="layer-count">{{ stats.mOffline }}</span>
          </label>
          <label class="layer-row">
            <el-checkbox v-model="layers.inactive" size="small" />
            <span class="layer-dot" style="background:#ef4444" />
            <span class="text-xs">Hỏng / Không hoạt động</span>
            <span class="layer-count">{{ stats.mBroken + stats.mInactive }}</span>
          </label>
        </div>

        <!-- Device Tree -->
        <div class="tree-section">
          <p class="section-title">THIẾT BỊ ({{ filteredGateways.length }} gateway)</p>
          <el-scrollbar class="device-scroll">
            <div v-if="!filteredGateways.length" class="text-center text-gray-500 text-xs py-4">
              Không tìm thấy thiết bị
            </div>

            <div v-for="gw in filteredGateways" :key="gw.gatewayNo" class="gw-item">
              <!-- Gateway row -->
              <div class="gw-row" @click="() => { expandedGw.has(gw.gatewayNo) ? expandedGw.delete(gw.gatewayNo) : expandedGw.add(gw.gatewayNo); flyToGateway(gw); }">
                <IconifyIconOnline
                  :icon="expandedGw.has(gw.gatewayNo) ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'"
                  width="14" color="#9ca3af"
                />
                <span class="gw-status-dot" :style="{ background: gw.online ? '#22c55e' : '#6b7280' }" />
                <IconifyIconOnline icon="ri:router-line" color="#f59e0b" width="13" />
                <span class="gw-label">{{ gw.gatewayNo }}</span>
                <span class="gw-count">{{ gw.meterCount }}</span>
              </div>

              <!-- Meter rows (expand) -->
              <div v-if="expandedGw.has(gw.gatewayNo)" class="meter-list">
                <div v-for="m in metersOfGw(gw.gatewayNo)" :key="m.meterNo"
                  class="meter-row" @click="flyToMeter(m)">
                  <span class="meter-dot" :style="{ background: meterStatusColor(m) }" />
                  <IconifyIconOnline icon="ri:drop-line" color="#41b6ff" width="12" />
                  <span class="meter-label">{{ m.meterNo }}</span>
                  <span class="meter-name">{{ m.meterName }}</span>
                </div>
                <div v-if="!metersOfGw(gw.gatewayNo).length" class="text-gray-600 text-xs pl-8 py-1">
                  Không có đồng hồ
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </transition>

    <!-- Panel toggle button (when closed) -->
    <button v-if="!panelOpen" class="panel-toggle-btn" @click="panelOpen = true" title="Mở bảng điều khiển">
      <IconifyIconOnline icon="ri:layout-right-line" color="#fff" width="18" />
    </button>

    <!-- ══ INFO DRAWER (right) ══ -->
    <transition name="slide-right">
      <div v-if="showInfo && selected" class="info-drawer">
        <!-- Drawer header -->
        <div class="info-header">
          <div class="flex items-center gap-2">
            <IconifyIconOnline
              :icon="selected.type === 'gateway' ? 'ri:router-line' : 'ri:drop-line'"
              :color="selected.type === 'gateway' ? '#f59e0b' : '#41b6ff'"
              width="18"
            />
            <span class="text-white font-semibold text-sm">
              {{ selected.type === "gateway" ? "Thông tin Gateway" : "Thông tin Đồng hồ" }}
            </span>
          </div>
          <button class="close-btn" @click="showInfo = false">✕</button>
        </div>

        <el-scrollbar class="info-scroll">
          <!-- ── GATEWAY INFO ── -->
          <template v-if="selected.type === 'gateway'">
            <div class="info-body">
              <div class="info-code">{{ selected.data.gatewayNo }}</div>
              <el-tag :type="selected.data.online ? 'success' : 'info'" size="small" class="mb-3">
                {{ selected.data.online ? '● Online' : '○ Offline' }}
              </el-tag>

              <div class="info-grid">
                <div class="info-field">
                  <span class="field-label">Số đồng hồ</span>
                  <span class="field-val">{{ selected.data.meterCount }}</span>
                </div>
                <div class="info-field">
                  <span class="field-label">Tín hiệu TB</span>
                  <span class="field-val">{{ selected.data.avgSignal }}%</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Lần ping cuối</span>
                  <span class="field-val">{{ fmtTime(selected.data.lastPing) }}</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Cách đây</span>
                  <span class="field-val text-orange-400">{{ ago(selected.data.lastPing) }}</span>
                </div>
              </div>

              <!-- Signal bar -->
              <div class="mt-3">
                <div class="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Cường độ tín hiệu</span>
                  <span>{{ selected.data.avgSignal }}%</span>
                </div>
                <el-progress
                  :percentage="selected.data.avgSignal"
                  :color="selected.data.avgSignal > 70 ? '#22c55e' : selected.data.avgSignal > 40 ? '#f97316' : '#ef4444'"
                  :show-text="false" :stroke-width="8"
                />
              </div>

              <!-- Meters of this gateway -->
              <div class="mt-4">
                <p class="text-xs text-gray-400 font-semibold mb-2">
                  ĐỒNG HỒ THUỘC GATEWAY ({{ metersOfGw(selected.data.gatewayNo).length }})
                </p>
                <div v-for="m in metersOfGw(selected.data.gatewayNo).slice(0, 10)" :key="m.meterNo"
                  class="sub-meter-row" @click="flyToMeter(m)">
                  <span class="meter-dot" :style="{ background: meterStatusColor(m) }" />
                  <span class="text-xs text-gray-200 flex-1 truncate">{{ m.meterNo }}</span>
                  <el-tag :type="stateTag(m)" size="small">{{ meterStatusLabel(m) }}</el-tag>
                </div>
                <p v-if="metersOfGw(selected.data.gatewayNo).length > 10" class="text-xs text-gray-500 mt-1 text-center">
                  + {{ metersOfGw(selected.data.gatewayNo).length - 10 }} đồng hồ khác
                </p>
              </div>
            </div>
          </template>

          <!-- ── METER INFO ── -->
          <template v-else-if="selected.type === 'meter'">
            <div class="info-body">
              <div class="info-code">{{ selected.data.meterNo }}</div>
              <div class="text-gray-300 text-xs mb-1">{{ selected.data.meterName || "—" }}</div>
              <el-tag :type="stateTag(selected.data)" size="small" class="mb-3">
                {{ meterStatusLabel(selected.data) }}
              </el-tag>

              <div class="info-grid">
                <div class="info-field full">
                  <span class="field-label">Mã khách hàng</span>
                  <span class="field-val">{{ selected.data.customerCode || "—" }}</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Địa chỉ</span>
                  <span class="field-val text-gray-300">{{ selected.data.address || "—" }}</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Gateway</span>
                  <span class="field-val text-yellow-400">{{ selected.data.gatewayNo || "—" }}</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Dữ liệu lần cuối</span>
                  <span class="field-val">{{ fmtTime(selected.data.lastDataTime) }}</span>
                </div>
                <div class="info-field full">
                  <span class="field-label">Cách đây</span>
                  <span class="field-val" :class="selected.data.online ? 'text-green-400' : 'text-orange-400'">
                    {{ ago(selected.data.lastDataTime) }}
                  </span>
                </div>
              </div>

              <!-- Signal & Battery bars -->
              <div class="metrics-section mt-3" v-if="selected.data.signal != null || selected.data.remainBattery != null">
                <div v-if="selected.data.signal != null" class="metric-row">
                  <div class="flex justify-between text-xs text-gray-400 mb-1">
                    <span><IconifyIconOnline icon="ri:signal-wifi-line" width="12" class="mr-1" />Tín hiệu</span>
                    <span>{{ selected.data.signal }}%</span>
                  </div>
                  <el-progress
                    :percentage="Number(selected.data.signal)"
                    :color="Number(selected.data.signal) > 70 ? '#22c55e' : Number(selected.data.signal) > 40 ? '#f97316' : '#ef4444'"
                    :show-text="false" :stroke-width="8"
                  />
                </div>
                <div v-if="selected.data.remainBattery != null" class="metric-row mt-2">
                  <div class="flex justify-between text-xs text-gray-400 mb-1">
                    <span><IconifyIconOnline icon="ri:battery-2-charge-line" width="12" class="mr-1" />Pin còn lại</span>
                    <span>{{ selected.data.remainBattery }}%</span>
                  </div>
                  <el-progress
                    :percentage="Number(selected.data.remainBattery)"
                    :color="Number(selected.data.remainBattery) > 50 ? '#22c55e' : Number(selected.data.remainBattery) > 20 ? '#f97316' : '#ef4444'"
                    :show-text="false" :stroke-width="8"
                  />
                </div>
              </div>

              <!-- Quick actions -->
              <div class="mt-4 flex gap-2">
                <el-button size="small" type="primary" plain
                  @click="() => $router.push({ path: '/analysis/data', query: { meterNo: selected.data.meterNo } })">
                  <IconifyIconOnline icon="ri:line-chart-line" width="13" class="mr-1" />Xem dữ liệu
                </el-button>
                <el-button size="small" type="success" plain
                  @click="() => $router.push({ path: '/analysis/production', query: { meterNo: selected.data.meterNo } })">
                  <IconifyIconOnline icon="ri:bar-chart-2-line" width="13" class="mr-1" />Sản lượng
                </el-button>
              </div>
            </div>
          </template>
        </el-scrollbar>
      </div>
    </transition>

    <!-- ══ LEGEND (bottom-left) ══ -->
    <div class="legend-box">
      <p class="legend-title">CHÚ THÍCH</p>
      <div class="legend-row"><span class="lg-dot" style="background:#f59e0b;width:14px;height:14px;border-radius:50%" /> Gateway</div>
      <div class="legend-row"><span class="lg-dot" style="background:#22c55e" /> Đồng hồ Online</div>
      <div class="legend-row"><span class="lg-dot" style="background:#f97316" /> Ngoại tuyến &gt; 24h</div>
      <div class="legend-row"><span class="lg-dot" style="background:#ef4444" /> Hỏng</div>
      <div class="legend-row"><span class="lg-dot" style="background:#9ca3af" /> Chưa lắp / Tháo ra</div>
      <div class="legend-row"><span class="lg-dot" style="background:#41b6ff;width:20px;height:20px;border-radius:50%;opacity:0.7" /> Cụm đồng hồ</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* ── Base layout ── */
.map-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 86px);
  margin: 0 !important;
  overflow: hidden;
  background: #1a1a2e;
}
.map-canvas {
  position: absolute;
  inset: 0;
  :deep(.el-loading-mask) { background: rgba(0,0,0,0.6); }
}

/* ── Stats bar (top overlay) ── */
.stats-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  padding: 6px 18px;
  font-size: 0.75rem;
  color: #e2e8f0;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.stat-item { display: flex; align-items: center; gap: 5px; }
.stat-sep  { color: rgba(255,255,255,0.2); }

/* ── Left panel ── */
.left-panel {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 268px;
  z-index: 20;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 12px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
:deep(.panel-search) {
  .el-input__wrapper { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
  .el-input__inner   { color: #e2e8f0; font-size: 0.8rem; }
  .el-input__prefix-inner { color: #9ca3af; }
}

.layer-section {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.section-title {
  font-size: 0.65rem;
  color: #6b7280;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}
.layer-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 0.75rem;
}
.layer-dot  { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.layer-count { margin-left: auto; font-size: 0.7rem; color: #6b7280; }

.tree-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
  .section-title { padding: 0 12px; }
}
.device-scroll { flex: 1; }

.gw-item { margin-bottom: 2px; }
.gw-row {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; cursor: pointer; border-radius: 5px;
  &:hover { background: rgba(255,255,255,0.06); }
}
.gw-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.gw-label { font-size: 0.78rem; color: #e2e8f0; font-weight: 500; flex: 1; }
.gw-count { font-size: 0.68rem; color: #6b7280; background: rgba(255,255,255,0.07); border-radius: 8px; padding: 1px 6px; }

.meter-list { padding-left: 24px; }
.meter-row {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 8px; cursor: pointer; border-radius: 4px;
  &:hover { background: rgba(255,255,255,0.05); }
}
.meter-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.meter-label { font-size: 0.73rem; color: #cbd5e1; white-space: nowrap; }
.meter-name  { font-size: 0.68rem; color: #6b7280; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* Panel toggle button */
.panel-toggle-btn {
  position: absolute; top: 50%; left: 8px; transform: translateY(-50%);
  z-index: 21; width: 32px; height: 32px; border-radius: 8px;
  background: rgba(15,23,42,0.9); border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { background: rgba(65,182,255,0.2); }
}

/* ── Info drawer (right) ── */
.info-drawer {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 300px;
  z-index: 20;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,0.4);
}

.info-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.close-btn {
  color: #6b7280; background: none; border: none; cursor: pointer; font-size: 14px;
  width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center;
  &:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }
}
.info-scroll { flex: 1; }
.info-body { padding: 14px; }
.info-code { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
.info-field { display: flex; flex-direction: column; gap: 2px; }
.info-field.full { grid-column: 1 / -1; }
.field-label { font-size: 0.67rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
.field-val   { font-size: 0.82rem; color: #e2e8f0; }

.sub-meter-row {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 8px; border-radius: 6px; cursor: pointer;
  background: rgba(255,255,255,0.04); margin-bottom: 4px;
  &:hover { background: rgba(65,182,255,0.1); }
}

/* ── Legend ── */
.legend-box {
  position: absolute; bottom: 28px; left: 280px; z-index: 10;
  background: rgba(15,23,42,0.88); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.legend-title { font-size: 0.63rem; color: #6b7280; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 7px; }
.legend-row  { display: flex; align-items: center; gap: 7px; font-size: 0.73rem; color: #cbd5e1; margin-bottom: 5px; }
.lg-dot      { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; display: inline-block; }

/* ── Transitions ── */
.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }

/* TrackAsia overrides */
:deep(.maplibregl-ctrl-top-right),
:deep(.maplibregl-ctrl-bottom-right) { right: 308px !important; }
:deep(.maplibregl-ctrl-bottom-left) { display: none; }
</style>
