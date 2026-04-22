<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { useI18n } from "vue-i18n";
import { getMine, changePassword } from "@/api/user";
import { deviceDetection } from "@pureadmin/utils";
import type { FormInstance } from "element-plus";

defineOptions({ name: "AccountManagement" });

const { t } = useI18n();

const userPhone = ref("");
const userEmail = ref("");

onMounted(async () => {
  const { code, data } = await getMine();
  if (code === 0) { userPhone.value = data.phone; userEmail.value = data.email; }
});

// ── Change password dialog ──────────────────────────────────
const pwdVisible = ref(false);
const pwdLoading = ref(false);
const pwdFormRef = ref<FormInstance>();
const pwdForm    = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });

const pwdRules = {
  oldPassword:     [{ required: true, message: () => t("accountSettings.oldPasswordRequired"),     trigger: "blur" }],
  newPassword:     [{ required: true, message: () => t("accountSettings.newPasswordRequired"),     trigger: "blur" },
                    { min: 6, message: "Tối thiểu 6 ký tự", trigger: "blur" }],
  confirmPassword: [
    { required: true, message: () => t("accountSettings.confirmPasswordRequired"), trigger: "blur" },
    {
      validator: (_: any, value: string, cb: (e?: Error) => void) => {
        if (value !== pwdForm.newPassword) cb(new Error(t("accountSettings.passwordNotMatch")));
        else cb();
      },
      trigger: "blur"
    }
  ]
};

function openPwdDialog() {
  Object.assign(pwdForm, { oldPassword: "", newPassword: "", confirmPassword: "" });
  pwdVisible.value = true;
}

async function submitPassword() {
  try { await pwdFormRef.value!.validate(); } catch { return; }
  pwdLoading.value = true;
  try {
    const res = await changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
    if (res.code === 0) {
      message(t("common.updateSuccess"), { type: "success" });
      pwdVisible.value = false;
    } else {
      message(res.message, { type: "error" });
    }
  } finally {
    pwdLoading.value = false;
  }
}
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">{{ t('accountSettings.accountManagement') }}</h3>

    <!-- Đổi mật khẩu -->
    <div class="flex items-center">
      <div class="flex-1">
        <p class="font-medium">{{ t('accountSettings.changePassword') }}</p>
      </div>
      <el-button type="primary" text @click="openPwdDialog">{{ t('accountSettings.modify') }}</el-button>
    </div>
    <el-divider />

    <!-- Điện thoại bảo mật -->
    <div class="flex items-center">
      <div class="flex-1">
        <p class="font-medium">{{ t('accountSettings.securityPhone') }}</p>
        <el-text type="info">
          <template v-if="userPhone">{{ t('accountSettings.securityPhoneDesc') }}{{ userPhone }}</template>
          <template v-else>{{ t('accountSettings.notBound') }}</template>
        </el-text>
      </div>
      <el-button type="primary" text @click="message('Tính năng đang phát triển', { type: 'info' })">
        {{ t('accountSettings.modify') }}
      </el-button>
    </div>
    <el-divider />

    <!-- Email dự phòng -->
    <div class="flex items-center">
      <div class="flex-1">
        <p class="font-medium">{{ t('accountSettings.backupEmail') }}</p>
        <el-text type="info">
          <template v-if="userEmail">{{ t('accountSettings.backupEmailDesc') }}{{ userEmail }}</template>
          <template v-else>{{ t('accountSettings.notBound') }}</template>
        </el-text>
      </div>
      <el-button type="primary" text @click="message('Tính năng đang phát triển', { type: 'info' })">
        {{ t('accountSettings.modify') }}
      </el-button>
    </div>
    <el-divider />

    <!-- Dialog đổi mật khẩu -->
    <el-dialog v-model="pwdVisible" :title="t('accountSettings.changePassword')"
      width="420px" draggable destroy-on-close>
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-position="top">
        <el-form-item :label="t('accountSettings.oldPassword')" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password
            :placeholder="t('accountSettings.oldPassword')" />
        </el-form-item>
        <el-form-item :label="t('accountSettings.newPassword')" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password
            :placeholder="t('accountSettings.newPassword')" />
        </el-form-item>
        <el-form-item :label="t('accountSettings.confirmPassword')" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password
            :placeholder="t('accountSettings.confirmPassword')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">{{ t('status.pureCancel') }}</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="submitPassword">
          {{ t('status.pureConfirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.el-divider--horizontal {
  border-top: 0.1px var(--el-border-color) var(--el-border-style);
}
</style>
