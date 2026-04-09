<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
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
    label-width="100px"
  >
    <el-form-item label="Tên vai trò" prop="name">
      <el-input
        v-model="newFormInline.name"
        clearable
        placeholder="Nhập tên vai trò"
      />
    </el-form-item>

    <el-form-item label="Mã vai trò" prop="code">
      <el-input
        v-model="newFormInline.code"
        clearable
        placeholder="Nhập mã vai trò"
      />
    </el-form-item>

    <el-form-item label="Ghi chú">
      <el-input
        v-model="newFormInline.remark"
        placeholder="Nhập ghi chú"
        type="textarea"
      />
    </el-form-item>
  </el-form>
</template>
