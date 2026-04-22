<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "@/utils/message";
import { deviceDetection } from "@pureadmin/utils";

defineOptions({ name: "Preferences" });

const { t } = useI18n();

const list = ref([
  {
    key: "password",
    title: () => t("accountSettings.notifyPassword"),
    illustrate: () => t("accountSettings.notifyPasswordDesc"),
    checked: true
  },
  {
    key: "system",
    title: () => t("accountSettings.notifySystem"),
    illustrate: () => t("accountSettings.notifySystemDesc"),
    checked: true
  },
  {
    key: "task",
    title: () => t("accountSettings.notifyTask"),
    illustrate: () => t("accountSettings.notifyTaskDesc"),
    checked: true
  }
]);

function onChange(val: boolean, item: any) {
  message(
    item.title() + " " + (val ? t("status.pureEnable") : t("status.pureDisable")),
    { type: "success" }
  );
}
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">{{ t('accountSettings.preferences') }}</h3>
    <div v-for="(item, index) in list" :key="index">
      <div class="flex items-center">
        <div class="flex-1">
          <p class="font-medium">{{ item.title() }}</p>
          <el-text class="mt-1" type="info">{{ item.illustrate() }}</el-text>
        </div>
        <el-switch
          v-model="item.checked"
          inline-prompt
          :active-text="t('status.pureOn')"
          :inactive-text="t('status.pureOff')"
          @change="(val: boolean) => onChange(val, item)"
        />
      </div>
      <el-divider />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  border-top: 0.1px var(--el-border-color) var(--el-border-style);
}
</style>
