import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { i18n } from "@/plugins/i18n";

export const formRules = reactive(<FormRules>{
  name: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.role.nameRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  code: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.role.codeRequired")));
      else callback();
    },
    trigger: "blur"
  }]
});
