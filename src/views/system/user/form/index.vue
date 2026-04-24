<script setup lang="ts">
import { ref } from "vue";
import ReCol from "@/components/ReCol";
import { formRules } from "../utils/rule";
import { FormProps } from "../utils/types";
import { usePublicHooks } from "../../hooks";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    title: "Thêm mới",
    roleOptions: [],
    roleIds: [],
    nickname: "",
    username: "",
    password: "",
    phone: "",
    email: "",
    sex: "",
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
    label-width="110px"
  >
    <el-row :gutter="30">
      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Tên đăng nhập" prop="username">
          <el-input
            v-model="newFormInline.username"
            clearable
            placeholder="Nhập tên đăng nhập"
          />
        </el-form-item>
      </re-col>
      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Biệt danh" prop="nickname">
          <el-input
            v-model="newFormInline.nickname"
            clearable
            placeholder="Nhập biệt danh"
          />
        </el-form-item>
      </re-col>

      <re-col
        v-if="newFormInline.title === 'Thêm mới'"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Mật khẩu" prop="password">
          <el-input
            v-model="newFormInline.password"
            clearable
            placeholder="Nhập mật khẩu"
            type="password"
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
        <el-form-item label="Vai trò" prop="roleId">
          <el-select
            v-model="newFormInline.roleId"
            placeholder="Chọn vai trò"
            class="w-full!"
            clearable
          >
            <el-option
              v-for="item in newFormInline.roleOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Phân quyền vùng">
          <el-tree-select
            v-model="newFormInline.zoneIds"
            :data="newFormInline.zoneOptions"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            multiple
            show-checkbox
            :check-strictly="false"
            collapse-tags
            collapse-tags-tooltip
            placeholder="Chọn vùng phân quyền"
            class="w-full!"
            clearable
          />
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Trạng thái">
          <el-switch
            v-model="newFormInline.status"
            :active-value="1"
            :inactive-value="0"
            :style="{ '--el-switch-on-color': '#13ce66', ...switchStyle }"
          />
        </el-form-item>
      </re-col>

      <re-col :value="24" :xs="24" :sm="24">
        <el-form-item label="Ghi chú">
          <el-input
            v-model="newFormInline.remark"
            type="textarea"
            placeholder="Nhập ghi chú"
          />
        </el-form-item>
      </re-col>
    </el-row>
  </el-form>
</template>
