import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { isPhone, isEmail } from "@pureadmin/utils";
import { i18n } from "@/plugins/i18n";

export const formRules = reactive(<FormRules>{
  name: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.dept.nameRequired")));
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
          callback(new Error(i18n.global.t("system.dept.invalidPhone")));
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
          callback(new Error(i18n.global.t("system.dept.invalidEmail")));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});
