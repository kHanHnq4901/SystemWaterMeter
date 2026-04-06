<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import TypeIt from "@/components/ReTypeit";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { $t, transformI18n } from "@/plugins/i18n";
import { useLayout } from "@/layout/hooks/useLayout";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import {
  bg,
  avatar,
  illustration,
  illustration1,
  illustration2
} from "./utils/static";
import { ref, toRaw, reactive, watch } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useTranslationLang } from "@/layout/hooks/useTranslationLang";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import { setToken } from "@/utils/auth"; // Dùng để lưu token sau khi API trả về

import axios from "axios"; // Thêm axios để gọi API trực tiếp
import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import globalization from "@/assets/svg/globalization.svg?component";
import Lock from "~icons/ri/lock-fill";
import Check from "~icons/ep/check";
import User from "~icons/ri/user-3-fill";
import Info from "~icons/ri/information-line";

defineOptions({
  name: "Login"
});

const loginDay = ref(7);
const router = useRouter();
const loading = ref(false);
const checked = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

const { t } = useI18n();
const { initStorage } = useLayout();
initStorage();
const { dataTheme, themeMode, dataThemeChange } = useDataThemeChange();
dataThemeChange(themeMode.value);
const { title, getDropdownItemStyle, getDropdownItemClass } = useNav();
const { locale, translationVi, translationEn } = useTranslationLang();

const ruleForm = reactive({
  username: "",
  password: ""
});

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async valid => {
    if (valid) {
      loading.value = true;
      disabled.value = true;

      try {
        // 1. Gọi đến Backend Express của bạn (nhớ mở cổng 3000)
        // Với cấu trúc mới: /api/auth/login
        const response = await axios.post(
          "http://localhost:3000/api/auth/login",
          {
            username: ruleForm.username,
            password: ruleForm.password
          }
        );

        const result = response.data;

        // 2. Kiểm tra cờ "success" mà API của bạn trả về
        if (result.success) {
          const userData = result.data; // Dữ liệu từ IAUDIT_USER

          // 3. TẠO TOKEN GIẢ CHO VUE-PURE-ADMIN
          // Do API hiện tại chưa sinh ra JWT Token, ta dùng dữ liệu này để bypass bảo vệ router
          const tokenData = {
            accessToken: "token-tam-thoi-cua-" + userData.username, // Token giả định
            expires: new Date(
              new Date().getTime() + 24 * 60 * 60 * 1000
            ).getTime(), // Hết hạn sau 24h
            roles: [userData.roleId] // Truyền role từ Database vào (nếu template có check role)
          };

          // 4. Lưu thông tin đăng nhập vào hệ thống
          setToken(tokenData);
          useUserStoreHook().SET_USERNAME(userData.name || userData.username);

          // 5. Khởi tạo lại menu và chuyển hướng vào trang chủ
          await initRouter();
          router.push(getTopMenu(true).path).then(() => {
            message("Đăng nhập thành công!", { type: "success" });
          });
        } else {
          // Trường hợp API trả về success: false
          message(result.message || "Tài khoản hoặc mật khẩu không đúng!", {
            type: "error"
          });
          disabled.value = false;
        }
      } catch (error: any) {
        // Xử lý lỗi từ Backend (Lỗi 401, 403, 500 hoặc mất mạng)
        const errorMsg =
          error.response?.data?.message || "Không thể kết nối đến Server!";
        message(errorMsg, { type: "error" });
        disabled.value = false;
      } finally {
        loading.value = false;
      }
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});

watch(checked, bool => {
  useUserStoreHook().SET_ISREMEMBERED(bool);
});
watch(loginDay, value => {
  useUserStoreHook().SET_LOGINDAY(value);
});
</script>

<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="dayIcon"
        :inactive-icon="darkIcon"
        @change="dataThemeChange"
      />
      <el-dropdown trigger="click">
        <globalization
          class="hover:text-primary hover:bg-transparent! size-5 ml-1.5 cursor-pointer outline-hidden duration-300"
        />
        <template #dropdown>
          <el-dropdown-menu class="translation">
            <el-dropdown-item
              :style="getDropdownItemStyle(locale, 'vi')"
              :class="['dark:text-white!', getDropdownItemClass(locale, 'vi')]"
              @click="translationVi"
            >
              <IconifyIconOffline
                v-show="locale === 'vi'"
                class="check-vi"
                :icon="Check"
              />
              Tiếng Việt
            </el-dropdown-item>
            <el-dropdown-item
              :style="getDropdownItemStyle(locale, 'en')"
              :class="['dark:text-white!', getDropdownItemClass(locale, 'en')]"
              @click="translationEn"
            >
              <span v-show="locale === 'en'" class="check-en">
                <IconifyIconOffline :icon="Check" />
              </span>
              English
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div class="login-container">
      <div class="img">
        <img :src="illustration2" alt="Hình minh họa" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <avatar class="avatar" />
          <Motion>
            <h2 class="outline-hidden">
              <TypeIt
                :options="{ strings: [title], cursor: false, speed: 100 }"
              />
            </h2>
          </Motion>

          <el-form
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: transformI18n($t('login.pureUsernameReg')),
                    trigger: 'blur'
                  }
                ]"
                prop="username"
              >
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  :placeholder="t('login.pureUsername')"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  :placeholder="t('login.purePassword')"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="200">
              <el-form-item>
                <div class="w-full h-5 flex-bc">
                  <el-checkbox v-model="checked">
                    <span class="flex">
                      {{ t("login.pureRemember") }}
                      <IconifyIconOffline
                        v-tippy="{
                          content: t('login.pureRememberInfo'),
                          placement: 'top'
                        }"
                        :icon="Info"
                        class="ml-1"
                      />
                    </span>
                  </el-checkbox>
                  <el-button link type="primary">
                    {{ t("login.pureForget") }}
                  </el-button>
                </div>
                <el-button
                  class="w-full mt-4!"
                  size="default"
                  type="primary"
                  :loading="loading"
                  :disabled="disabled"
                  @click="onLogin(ruleFormRef)"
                >
                  {{ t("login.pureLogin") }}
                </el-button>
              </el-form-item>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
    <div
      class="w-full flex-c absolute bottom-3 text-sm text-[rgba(0,0,0,0.6)] dark:text-[rgba(220,220,242,0.8)]"
    >
      Copyright © {{ new Date().getFullYear() }}-present
      <a
        class="hover:text-primary!"
        href="https://emic.com.vn/vn"
        target="_blank"
      >
        &nbsp;{{ title }}
      </a>
    </div>
  </div>
</template>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}

.translation {
  :deep(.el-dropdown-menu__item) {
    padding: 5px 40px;
  }

  .check-vi {
    position: absolute;
    left: 20px;
  }

  .check-en {
    position: absolute;
    left: 20px;
  }
}
</style>
