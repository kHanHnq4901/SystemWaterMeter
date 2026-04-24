<script setup lang="ts">
import { ref } from "vue";
import ReCol from "@/components/ReCol";
import { RoleFormProps } from "../utils/types";

const props = withDefaults(defineProps<RoleFormProps>(), {
  formInline: () => ({
    username: "",
    nickname: "",
    roleOptions: [],
    ids: ""
  })
});

const newFormInline = ref(props.formInline);
</script>

<template>
  <el-form :model="newFormInline">
    <el-row :gutter="30">
      <re-col>
        <el-form-item label="Biệt danh">
          <el-input v-model="newFormInline.nickname" disabled />
        </el-form-item>
      </re-col>
      <re-col>
        <el-form-item label="Vai trò">
          <el-select
            v-model="newFormInline.ids"
            placeholder="Chọn vai trò"
            class="w-full"
            clearable
          >
            <el-option
              v-for="(item, index) in newFormInline.roleOptions"
              :key="index"
              :value="item.id"
              :label="item.name"
            />
          </el-select>
        </el-form-item>
      </re-col>
    </el-row>
  </el-form>
</template>
