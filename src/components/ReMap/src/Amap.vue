<script setup lang="ts">
import { reactive, onMounted, onUnmounted, ref } from "vue";
import { deviceDetection } from "@pureadmin/utils";
import trackasiagl from "trackasia-gl";
import "trackasia-gl/dist/trackasia-gl.css";
import { mapJson } from "@/api/mock";
import car from "@/assets/car.png";

defineOptions({ name: "TrackAsiaFullFeatures" });

const mapview = ref(null);
let map: trackasiagl.Map | null = null;

const mapSet = reactive({
  loading: true
});

onMounted(() => {
  if (!mapview.value) return;

  // 1. Khởi tạo Map
  map = new trackasiagl.Map({
    container: mapview.value,
    style:
      "https://maps.track-asia.com/styles/v2/streets.json?key=f4a6c08959b47211756357354b1b73ac74",
    center: [105.8342, 21.0278],
    zoom: 12,
    pitch: 45
  });

  // 2. Thêm Controls
  map.addControl(new trackasiagl.NavigationControl(), "top-right");
  map.addControl(new trackasiagl.FullscreenControl(), "top-right");

  map.on("load", async () => {
    if (!map) return;

    try {
      // 3. Load Ảnh Xe (Dùng try-catch để tránh lỗi chết App nếu thiếu file ảnh)
      const image = await map.loadImage(car);
      if (!map.hasImage("car-icon")) map.addImage("car-icon", image.data);

      // 4. Lấy dữ liệu (Xử lý lỗi API)
      const response = await mapJson();
      const vehicleData = response.data || [];

      const geojsonData = {
        type: "FeatureCollection",
        features: vehicleData.map(v => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [v.lng, v.lat] },
          properties: { ...v }
        }))
      };

      // 5. Thêm Source & Layers (Clustering)
      map.addSource("cars-source", {
        type: "geojson",
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Layer cụm xe
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "cars-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            10,
            "#f1f075",
            50,
            "#f28cb1"
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 50, 40]
        }
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "cars-source",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 }
      });

      // Layer từng xe lẻ
      map.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "cars-source",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "car-icon",
          "icon-size": 0.5,
          "icon-rotate": ["get", "orientation"],
          "icon-allow-overlap": true,
          "text-field": ["get", "plateNumber"],
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-size": 10
        },
        paint: {
          "text-color": "#000",
          "text-halo-color": "#fff",
          "text-halo-width": 1
        }
      });

      // 6. Click Popup
      map.on("click", "unclustered-point", (e: any) => {
        const props = e.features[0].properties;
        new trackasiagl.Popup()
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<b>Xe:</b> ${props.plateNumber}<br><b>Tài xế:</b> ${props.driver}`
          )
          .addTo(map!);
      });
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu bản đồ:", err);
    } finally {
      mapSet.loading = false;
    }
  });
});

onUnmounted(() => {
  map?.remove();
});
</script>

<template>
  <div class="main-content" v-loading="mapSet.loading">
    <div ref="mapview" class="map-wrapper" />
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  width: 100%;
  height: calc(100vh - 86px);
}
.map-wrapper {
  width: 100%;
  height: 100%;
}
</style>
