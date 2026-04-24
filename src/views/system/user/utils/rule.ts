import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { isPhone, isEmail } from "@pureadmin/utils";
import { i18n } from "@/plugins/i18n";

export const formRules = reactive(<FormRules>{
  nickname: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.user.nicknameRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  username: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.user.usernameRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  password: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.user.passwordRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  phone: [
    {
      validator: (_rule, value, callback) => {
        if (value === "") {
          callback();
        } else if (!isPhone(value)) {
          callback(new Error(i18n.global.t("system.user.invalidPhone")));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  email: [
    {
      validator: (_rule, value, callback) => {
        if (value === "") {
          callback();
        } else if (!isEmail(value)) {
          callback(new Error(i18n.global.t("system.user.invalidEmail")));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  roleId: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (!value && value !== 0) callback(new Error("Vui lòng chọn vai trò"));
        else callback();
      },
      trigger: "change"
    }
  ]
});
