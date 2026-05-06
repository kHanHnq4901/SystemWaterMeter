<script setup lang="ts">
import { message } from "@/utils/message";
import { useI18n } from "vue-i18n";
import { onMounted, reactive, ref } from "vue";
import { getMine, updateMine, uploadAvatar, type UserInfo } from "@/api/user";
import { emitter } from "@/utils/mitt";
import { useUserStoreHook } from "@/store/modules/user";
import { storageLocal } from "@pureadmin/utils";
import { userKey } from "@/utils/auth";
import type { FormInstance, FormRules } from "element-plus";
import ReCropperPreview from "@/components/ReCropperPreview";
import { deviceDetection } from "@pureadmin/utils";
import uploadLine from "~icons/ri/upload-line";

defineOptions({ name: "Profile" });

const { t } = useI18n();

const imgSrc      = ref("");
const cropperBlob = ref();
const cropRef     = ref();
const uploadRef   = ref();
const isShow      = ref(false);
const saving      = ref(false);
const formRef     = ref<FormInstance>();

const userInfos = reactive<UserInfo>({
  avatar: "", username: "", nickname: "", email: "", phone: "", description: ""
});

const rules = reactive<FormRules>({
  nickname: [{ required: true, message: () => t("accountSettings.nicknameRequired"), trigger: "blur" }]
});

function queryEmail(q: string, cb: (v: any[]) => void) {
  const domains = ["@gmail.com", "@yahoo.com", "@outlook.com", "@163.com"];
  const base    = q.split("@")[0];
  cb(q ? domains.map(d => ({ value: base + d })).filter(i => i.value.startsWith(q)) : domains.map(d => ({ value: base + d })));
}

const onChange = (uploadFile: any) => {
  const reader = new FileReader();
  reader.onload = e => { imgSrc.value = e.target!.result as string; isShow.value = true; };
  reader.readAsDataURL(uploadFile.raw);
};

const handleClose = () => {
  cropRef.value?.hidePopover();
  uploadRef.value?.clearFiles();
  isShow.value = false;
};

const onCropper = ({ blob }: any) => (cropperBlob.value = blob);

const avatarUploading = ref(false);

const handleSubmitImage = async () => {
  if (!cropperBlob.value) return;
  avatarUploading.value = true;
  try {
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(cropperBlob.value);
    });
    const res = await uploadAvatar({ avatar: base64 });
    if (res.code === 0) {
      const avatarPath = res.data.avatar; // "/uploads/avatars/6.png"
      const busted = `${avatarPath}?t=${Date.now()}`;
      userInfos.avatar = busted;
      useUserStoreHook().SET_AVATAR(busted);
      const stored = storageLocal().getItem<any>(userKey) ?? {};
      storageLocal().setItem(userKey, { ...stored, avatar: busted });
      emitter.emit("avatarChange", busted);
      message(t("accountSettings.updateAvatar") + " " + t("common.success"), { type: "success" });
      handleClose();
    } else {
      message(res.message, { type: "error" });
    }
  } catch {
    message(t("common.serverError"), { type: "error" });
  } finally {
    avatarUploading.value = false;
  }
};

const onSubmit = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async valid => {
    if (!valid) return;
    saving.value = true;
    try {
      const res = await updateMine({
        nickname:    userInfos.nickname,
        email:       userInfos.email,
        phone:       userInfos.phone,
        description: userInfos.description
      });
      if (res.code === 0) message(t("accountSettings.updateInfo") + " " + t("common.success"), { type: "success" });
      else message(res.message, { type: "error" });
    } finally {
      saving.value = false;
    }
  });
};

onMounted(async () => {
  const { code, data } = await getMine();
  if (code === 0) {
    // Dùng avatar đã lưu trong store (đã có ?t=...) thay vì path sạch từ DB
    // để tránh browser cache hiển thị ảnh cũ
    const storedAvatar = useUserStoreHook().avatar;
    Object.assign(userInfos, data);
    if (storedAvatar) userInfos.avatar = storedAvatar;
  }
});
</script>

<template>
  <div :class="['min-w-45', deviceDetection() ? 'max-w-full' : 'max-w-[70%]']">
    <h3 class="my-8!">{{ t('accountSettings.profile') }}</h3>

    <el-form ref="formRef" label-position="top" :rules="rules" :model="userInfos">

      <el-form-item :label="t('accountSettings.avatar')">
        <el-avatar :size="80" :src="userInfos.avatar" />
        <el-upload ref="uploadRef" accept="image/*" action="#" :limit="1"
          :auto-upload="false" :show-file-list="false" :on-change="onChange">
          <el-button plain class="ml-4!">
            <IconifyIconOffline :icon="uploadLine" />
            <span class="ml-2">{{ t('accountSettings.updateAvatar') }}</span>
          </el-button>
        </el-upload>
      </el-form-item>

      <el-form-item :label="t('accountSettings.nickname')" prop="nickname">
        <el-input v-model="userInfos.nickname" :placeholder="t('accountSettings.nicknamePlaceholder')" />
      </el-form-item>

      <el-form-item :label="t('accountSettings.email')" prop="email">
        <el-autocomplete v-model="userInfos.email" :fetch-suggestions="queryEmail"
          :trigger-on-focus="false" :placeholder="t('accountSettings.emailPlaceholder')"
          clearable class="w-full" />
      </el-form-item>

      <el-form-item :label="t('accountSettings.phone')">
        <el-input v-model="userInfos.phone" :placeholder="t('accountSettings.phonePlaceholder')" clearable />
      </el-form-item>

      <el-form-item :label="t('accountSettings.description')">
        <el-input v-model="userInfos.description" type="textarea"
          :placeholder="t('accountSettings.descriptionPlaceholder')"
          :autosize="{ minRows: 4, maxRows: 8 }" maxlength="200" show-word-limit />
      </el-form-item>

      <el-button type="primary" :loading="saving" @click="onSubmit(formRef)">
        {{ t('accountSettings.updateInfo') }}
      </el-button>
    </el-form>

    <!-- Crop avatar dialog -->
    <el-dialog v-model="isShow" :title="t('accountSettings.editAvatar')" width="40%"
      destroy-on-close :closeOnClickModal="false" :before-close="handleClose"
      :fullscreen="deviceDetection()">
      <ReCropperPreview ref="cropRef" :imgSrc="imgSrc" @cropper="onCropper" />
      <template #footer>
        <el-button bg text @click="handleClose">{{ t('status.pureCancel') }}</el-button>
        <el-button bg text type="primary" :loading="avatarUploading" @click="handleSubmitImage">{{ t('status.pureConfirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
