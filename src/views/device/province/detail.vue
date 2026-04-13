<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

defineOptions({ name: "DeviceUnitDetail" });

const route = useRoute();
const router = useRouter();
const loading = ref(false);

const level = computed(() => {
  const path = route.path;
  if (path.includes("/device/province/")) return 1;
  if (path.includes("/device/district/")) return 2;
  if (path.includes("/device/ward/")) return 3;
  if (path.includes("/device/zone/")) return 4;
  if (path.includes("/device/cluster/")) return 5;
  return 1;
});

const id = computed(() => Number(route.params.id));

const data = ref<any>(null);

const levelData: Record<number, Record<number, any>> = {
  1: {
    1: {
      name: "TP. Hồ Chí Minh",
      code: "HCM",
      parent: "",
      area: "2.095 km²",
      population: "9 triệu",
      districts: 22,
      wards: 322,
      clusters: 480,
      gateways: 1250,
      meters: 85000,
      active: 82500,
      status: 1
    },
    2: {
      name: "Tỉnh Đồng Nai",
      code: "DN",
      parent: "",
      area: "5.953 km²",
      population: "3.1 triệu",
      districts: 9,
      wards: 156,
      clusters: 280,
      gateways: 450,
      meters: 32000,
      active: 31000,
      status: 1
    },
    3: {
      name: "Tỉnh Bình Dương",
      code: "BD",
      parent: "",
      area: "2.694 km²",
      population: "2.5 triệu",
      districts: 8,
      wards: 142,
      clusters: 220,
      gateways: 380,
      meters: 28000,
      active: 27000,
      status: 1
    }
  },
  2: {
    1: {
      name: "Quận 1",
      code: "Q1",
      parent: "TP. Hồ Chí Minh",
      area: "7.73 km²",
      population: "42.000",
      wards: 10,
      clusters: 25,
      gateways: 85,
      meters: 5200,
      active: 5100,
      status: 1
    },
    2: {
      name: "Quận 3",
      code: "Q3",
      parent: "TP. Hồ Chí Minh",
      area: "4.19 km²",
      population: "190.000",
      wards: 12,
      clusters: 32,
      gateways: 95,
      meters: 6800,
      active: 6650,
      status: 1
    },
    3: {
      name: "Quận 5",
      code: "Q5",
      parent: "TP. Hồ Chí Minh",
      area: "4.27 km²",
      population: "175.000",
      wards: 14,
      clusters: 38,
      gateways: 110,
      meters: 7500,
      active: 7350,
      status: 1
    }
  },
  3: {
    1: {
      name: "Phường Bến Nghé",
      code: "PN-01",
      parent: "Quận 1",
      area: "0.85 km²",
      population: "8.500",
      zones: 3,
      clusters: 8,
      gateways: 28,
      meters: 1850,
      active: 1800,
      status: 1
    },
    2: {
      name: "Phường Bến Thành",
      code: "PN-02",
      parent: "Quận 1",
      area: "1.1 km²",
      population: "12.000",
      zones: 4,
      clusters: 10,
      gateways: 32,
      meters: 2100,
      active: 2050,
      status: 1
    },
    3: {
      name: "Phường Nguyễn Thái Bình",
      code: "PN-03",
      parent: "Quận 1",
      area: "0.7 km²",
      population: "6.200",
      zones: 2,
      clusters: 7,
      gateways: 25,
      meters: 1250,
      active: 1250,
      status: 1
    }
  },
  4: {
    1: {
      name: "Khu vực Bến Nghé A",
      code: "KV-01A",
      parent: "Phường Bến Nghé",
      clusters: 5,
      gateways: 15,
      meters: 650,
      active: 640,
      status: 1
    },
    2: {
      name: "Khu vực Bến Nghé B",
      code: "KV-01B",
      parent: "Phường Bến Nghé",
      clusters: 4,
      gateways: 12,
      meters: 520,
      active: 510,
      status: 1
    },
    3: {
      name: "Khu vực Chợ Bến Thành",
      code: "KV-02A",
      parent: "Phường Bến Thành",
      clusters: 6,
      gateways: 18,
      meters: 780,
      active: 765,
      status: 1
    }
  },
  5: {
    1: {
      name: "Cụm A1",
      code: "C-A1",
      parent: "Khu vực Bến Nghé A",
      gateways: 3,
      meters: 85,
      active: 83,
      status: 1
    },
    2: {
      name: "Cụm A2",
      code: "C-A2",
      parent: "Khu vực Bến Nghé A",
      gateways: 3,
      meters: 92,
      active: 90,
      status: 1
    },
    3: {
      name: "Cụm B1",
      code: "C-B1",
      parent: "Khu vực Bến Nghé B",
      gateways: 3,
      meters: 78,
      active: 77,
      status: 1
    }
  }
};

const levelLabels = [
  "",
  "Tỉnh/TP",
  "Quận/Huyện",
  "Phường/Xã",
  "Khu vực",
  "Cụm"
];

onMounted(() => {
  loading.value = true;
  setTimeout(() => {
    data.value = levelData[level.value]?.[id.value] || null;
    loading.value = false;
  }, 300);
});

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="p-4">
    <el-button link @click="goBack" class="mb-4">
      <el-icon><el-icon-back /></el-icon> Quay lại
    </el-button>

    <el-card shadow="never" v-if="data">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-medium"
            >Chi tiết {{ levelLabels[level] }} - {{ data.name }}</span
          >
          <div>
            <el-button type="primary" size="small">Sửa</el-button>
            <el-button type="success" size="small">Xuất báo cáo</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="Mã">{{ data.code }}</el-descriptions-item>
        <el-descriptions-item label="Tên">{{ data.name }}</el-descriptions-item>
        <el-descriptions-item v-if="data.parent" label="Thuộc">{{
          data.parent
        }}</el-descriptions-item>
        <el-descriptions-item v-if="data.area" label="Diện tích">{{
          data.area
        }}</el-descriptions-item>
        <el-descriptions-item v-if="data.population" label="Dân số">{{
          data.population
        }}</el-descriptions-item>
        <el-descriptions-item label="Trạng thái">
          <el-tag :type="data.status === 1 ? 'success' : 'danger'" size="small">
            {{ data.status === 1 ? "Hoạt động" : "Ngừng" }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <el-row :gutter="16">
        <el-col :span="6" v-if="data.districts">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Quận/Huyện" :value="data.districts" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.wards">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Phường/Xã" :value="data.wards" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.zones">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Khu vực" :value="data.zones" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.clusters">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Cụm" :value="data.clusters" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.gateways">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Gateway" :value="data.gateways" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.meters">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Tổng ĐH" :value="data.meters" />
          </el-card>
        </el-col>
        <el-col :span="6" v-if="data.active">
          <el-card shadow="never" class="text-center">
            <el-statistic title="Hoạt động" :value="data.active" />
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-empty v-else description="Không tìm thấy dữ liệu" />
  </div>
</template>
