<script setup lang="ts">
import { ref } from "vue";
import ReCol from "@/components/ReCol";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import { usePublicHooks } from "../hooks";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    higherDeptOptions: [],
    parentId: 0,
    name: "",
    principal: "",
    phone: "",
    email: "",
    sort: 0,
    status: 1,
    remark: ""
  })
});

const ruleFormRef = ref();
const { switchStyle } = usePublicHooks();
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
    <el-row :gutter="30">
      <re-col>
        <el-form-item label="Phòng ban cha">
          <el-cascader
            v-model="newFormInline.parentId"
            class="w-full"
            :options="newFormInline.higherDeptOptions"
            :props="{
              value: 'id',
              label: 'name',
              emitPath: false,
              checkStrictly: true
            }"
            clearable
            filterable
            placeholder="Chọn phòng ban cha"
          >
            <template #default="{ node, data }">
              <span>{{ data.name }}</span>
              <span v-if="!node.isLeaf"> ({{ data.children.length }}) </span>
            </template>
          </el-cascader>
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Tên phòng ban" prop="name">
          <el-input
            v-model="newFormInline.name"
            clearable
            placeholder="Nhập tên phòng ban"
          />
        </el-form-item>
      </re-col>
      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Người phụ trách">
          <el-input
            v-model="newFormInline.principal"
            clearable
            placeholder="Nhập người phụ trách"
          />
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Số điện thoại" prop="phone">
          <el-input
            v-model="newFormInline.phone"
            clearable
            placeholder="Nhập số điện thoại"
          />
        </el-form-item>
      </re-col>
      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Email" prop="email">
          <el-input
            v-model="newFormInline.email"
            clearable
            placeholder="Nhập email"
          />
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Sắp xếp">
          <el-input-number
            v-model="newFormInline.sort"
            class="w-full!"
            :min="0"
            :max="9999"
            controls-position="right"
          />
        </el-form-item>
      </re-col>
      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Trạng thái">
          <el-switch
            v-model="newFormInline.status"
            inline-prompt
            :active-value="1"
            :inactive-value="0"
            active-text="Bật"
            inactive-text="Tắt"
            :style="switchStyle"
          />
        </el-form-item>
      </re-col>

      <re-col>
        <el-form-item label="Ghi chú">
          <el-input
            v-model="newFormInline.remark"
            placeholder="Nhập ghi chú"
            type="textarea"
          />
        </el-form-item>
      </re-col>
    </el-row>
  </el-form>
</template>
