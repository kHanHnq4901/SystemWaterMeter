<script setup lang="ts">
import { ref, onMounted } from "vue";
import { AMapLoader } from "@amap/amap-jsapi-loader";

defineOptions({ name: "MapIndex" });

const mapContainer = ref<HTMLElement | null>(null);
const mapInstance = ref<any>(null);
const activeTab = ref<"all" | "gateway" | "meter">("all");

const markers = ref<any[]>([]);

const mockData = {
  gateways: [
    {
      id: 1,
      code: "GW-001",
      lat: 10.7769,
      lng: 106.6989,
      status: "online",
      meterCount: 45
    },
    {
      id: 2,
      code: "GW-002",
      lat: 10.7829,
      lng: 106.7039,
      status: "online",
      meterCount: 52
    },
    {
      id: 3,
      code: "GW-003",
      lat: 10.7799,
      lng: 106.6929,
      status: "offline",
      meterCount: 38
    },
    {
      id: 4,
      code: "GW-004",
      lat: 10.7759,
      lng: 106.7089,
      status: "online",
      meterCount: 42
    }
  ],
  meters: [
    {
      id: 1,
      code: "MTR-001",
      lat: 10.7769,
      lng: 106.6989,
      status: "active",
      reading: 1250
    },
    {
      id: 2,
      code: "MTR-002",
      lat: 10.7775,
      lng: 106.6995,
      status: "active",
      reading: 890
    },
    {
      id: 3,
      code: "MTR-003",
      lat: 10.7781,
      lng: 106.7001,
      status: "inactive",
      reading: 2105
    },
    {
      id: 4,
      code: "MTR-004",
      lat: 10.7765,
      lng: 106.6985,
      status: "active",
      reading: 456
    },
    {
      id: 5,
      code: "MTR-005",
      lat: 10.7835,
      lng: 106.7045,
      status: "active",
      reading: 789
    }
  ]
};

const initMap = async () => {
  const AMap = await AMapLoader.load({
    version: "2.0",
    key: "ea6b3574f2b0c8b1a3c5e8d9f4b2a1c6",
    plugins: ["AMap.Scale", "AMap.ToolBar", "AMap.Geolocation"]
  });

  mapInstance.value = new AMap.Map(mapContainer.value, {
    zoom: 14,
    center: [106.6989, 10.7769],
    mapStyle: "amap://styles/normal",
    viewMode: "2D"
  });

  addMarkers();
};

const addMarkers = () => {
  if (!mapInstance.value) return;

  mapInstance.value.clearMarkers();

  let dataToShow: any[] = [];
  if (activeTab.value === "all") {
    dataToShow = [...mockData.gateways, ...mockData.meters];
  } else if (activeTab.value === "gateway") {
    dataToShow = mockData.gateways;
  } else {
    dataToShow = mockData.meters;
  }

  dataToShow.forEach(item => {
    const isGateway = item.hasOwnProperty("meterCount");
    const marker = new (window as any).AMap.Marker({
      position: [item.lng, item.lat],
      title: item.code,
      content: `<div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${isGateway ? (item.status === "online" ? "#22c55e" : "#ef4444") : "#3b82f6"};
        border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
        ${isGateway ? "GW" : "M"}
      </div>`
    });
    mapInstance.value.add(marker);
  });
};

const changeTab = (tab: "all" | "gateway" | "meter") => {
  activeTab.value = tab;
  addMarkers();
};

onMounted(() => {
  initMap();
});
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-4 bg-white border-b">
      <div class="flex gap-2">
        <el-button
          :type="activeTab === 'all' ? 'primary' : 'default'"
          @click="changeTab('all')"
        >
          Tất cả
        </el-button>
        <el-button
          :type="activeTab === 'gateway' ? 'primary' : 'default'"
          @click="changeTab('gateway')"
        >
          Gateway
        </el-button>
        <el-button
          :type="activeTab === 'meter' ? 'primary' : 'default'"
          @click="changeTab('meter')"
        >
          Đồng hồ
        </el-button>
      </div>
    </div>
    <div ref="mapContainer" class="flex-1 w-full"></div>
  </div>
</template>

<style scoped>
:deep(.amap-scale-line) {
  left: 20px;
  bottom: 20px;
}
:deep(.amap-toolbar) {
  right: 20px !important;
  bottom: 20px !important;
}
</style>
