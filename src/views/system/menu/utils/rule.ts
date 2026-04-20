import { reactive } from "vue";
import type { FormRules } from "element-plus";
import { i18n } from "@/plugins/i18n";

export const formRules = reactive(<FormRules>{
  title: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.menu.titleRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  name: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.menu.nameRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  path: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.menu.pathRequired")));
      else callback();
    },
    trigger: "blur"
  }],
  auths: [{
    required: true,
    validator: (_rule, value, callback) => {
      if (!value) callback(new Error(i18n.global.t("system.menu.authRequired")));
      else callback();
    },
    trigger: "blur"
  }]
});
