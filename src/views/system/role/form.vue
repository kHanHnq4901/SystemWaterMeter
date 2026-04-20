<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { formRules } from "./utils/rule";

const { t } = useI18n();
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    name: "",
    code: "",
    remark: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="82px"
  >
    <el-form-item :label="t('system.role.roleName')" prop="name">
      <el-input
        v-model="newFormInline.name"
        clearable
        :placeholder="t('system.role.roleName')"
      />
    </el-form-item>

    <el-form-item :label="t('system.role.roleCode')" prop="code">
      <el-input
        v-model="newFormInline.code"
        clearable
        :placeholder="t('system.role.roleCode')"
      />
    </el-form-item>

    <el-form-item :label="t('system.role.remark')">
      <el-input
        v-model="newFormInline.remark"
        :placeholder="t('system.role.remark')"
        type="textarea"
      />
    </el-form-item>
  </el-form>
</template>
