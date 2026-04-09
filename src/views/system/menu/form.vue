<script setup lang="ts">
import { ref } from "vue";
import ReCol from "@/components/ReCol";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import { transformI18n } from "@/plugins/i18n";
import { IconSelect } from "@/components/ReIcon";
import Segmented from "@/components/ReSegmented";
import ReAnimateSelector from "@/components/ReAnimateSelector";
import {
  menuTypeOptions,
  showLinkOptions,
  fixedTagOptions,
  keepAliveOptions,
  hiddenTagOptions,
  showParentOptions,
  frameLoadingOptions
} from "./utils/enums";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    menuType: 0,
    higherMenuOptions: [],
    parentId: 0,
    title: "",
    name: "",
    path: "",
    component: "",
    rank: 99,
    redirect: "",
    icon: "",
    extraIcon: "",
    enterTransition: "",
    leaveTransition: "",
    activePath: "",
    auths: "",
    frameSrc: "",
    frameLoading: true,
    keepAlive: false,
    hiddenTag: false,
    fixedTag: false,
    showLink: true,
    showParent: false
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
    <el-row :gutter="30">
      <re-col>
        <el-form-item label="Loại menu">
          <Segmented
            v-model="newFormInline.menuType"
            :options="menuTypeOptions"
          />
        </el-form-item>
      </re-col>

      <re-col>
        <el-form-item label="Menu cha">
          <el-cascader
            v-model="newFormInline.parentId"
            class="w-full"
            :options="newFormInline.higherMenuOptions"
            :props="{
              value: 'id',
              label: 'title',
              emitPath: false,
              checkStrictly: true
            }"
            clearable
            filterable
            placeholder="Chọn menu cha"
          >
            <template #default="{ node, data }">
              <span>{{ transformI18n(data.title) }}</span>
              <span v-if="!node.isLeaf"> ({{ data.children.length }}) </span>
            </template>
          </el-cascader>
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Tên menu" prop="title">
          <el-input
            v-model="newFormInline.title"
            clearable
            placeholder="Nhập tên menu"
          />
        </el-form-item>
      </re-col>
      <re-col v-if="newFormInline.menuType !== 3" :value="12" :xs="24" :sm="24">
        <el-form-item label="Tên route" prop="name">
          <el-input
            v-model="newFormInline.name"
            clearable
            placeholder="Nhập tên route"
          />
        </el-form-item>
      </re-col>

      <re-col v-if="newFormInline.menuType !== 3" :value="12" :xs="24" :sm="24">
        <el-form-item label="Đường dẫn" prop="path">
          <el-input
            v-model="newFormInline.path"
            clearable
            placeholder="Nhập đường dẫn"
          />
        </el-form-item>
      </re-col>
      <re-col
        v-show="newFormInline.menuType === 0"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Đường dẫn component">
          <el-input
            v-model="newFormInline.component"
            clearable
            placeholder="Nhập đường dẫn component"
          />
        </el-form-item>
      </re-col>

      <re-col :value="12" :xs="24" :sm="24">
        <el-form-item label="Sắp xếp menu">
          <el-input-number
            v-model="newFormInline.rank"
            class="w-full!"
            :min="1"
            :max="9999"
            controls-position="right"
          />
        </el-form-item>
      </re-col>
      <re-col
        v-show="newFormInline.menuType === 0"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Chuyển hướng mặc định">
          <el-input
            v-model="newFormInline.redirect"
            clearable
            placeholder="Nhập địa chỉ chuyển hướng"
          />
        </el-form-item>
      </re-col>

      <re-col
        v-show="newFormInline.menuType !== 3"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Biểu tượng">
          <IconSelect v-model="newFormInline.icon" class="w-full" />
        </el-form-item>
      </re-col>
      <re-col
        v-show="newFormInline.menuType !== 3"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Biểu tượng bên phải">
          <el-input
            v-model="newFormInline.extraIcon"
            clearable
            placeholder="Biểu tượng bên phải tên menu"
          />
        </el-form-item>
      </re-col>

      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="Hiệu ứng vào">
          <ReAnimateSelector
            v-model="newFormInline.enterTransition"
            placeholder="Chọn hiệu ứng vào"
          />
        </el-form-item>
      </re-col>

      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="Hiệu ứng ra">
          <ReAnimateSelector
            v-model="newFormInline.leaveTransition"
            placeholder="Chọn hiệu ứng ra"
          />
        </el-form-item>
      </re-col>
      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="离场动画">
          <ReAnimateSelector
            v-model="newFormInline.leaveTransition"
            placeholder="Chọn hiệu ứng ra"
          />
        </el-form-item>
      </re-col>

      <re-col
        v-show="newFormInline.menuType === 0"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Menu kích hoạt">
          <el-input
            v-model="newFormInline.activePath"
            clearable
            placeholder="Nhập menu cần kích hoạt"
          />
        </el-form-item>
      </re-col>
      <re-col v-if="newFormInline.menuType === 3" :value="12" :xs="24" :sm="24">
        <!-- Button permission -->
        <el-form-item label="Mã quyền" prop="auths">
          <el-input
            v-model="newFormInline.auths"
            clearable
            placeholder="Nhập mã quyền"
          />
        </el-form-item>
      </re-col>

      <re-col
        v-show="newFormInline.menuType === 1"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <!-- iframe -->
        <el-form-item label="Đường dẫn iframe">
          <el-input
            v-model="newFormInline.frameSrc"
            clearable
            placeholder="Nhập đường dẫn iframe"
          />
        </el-form-item>
      </re-col>
      <re-col v-if="newFormInline.menuType === 1" :value="12" :xs="24" :sm="24">
        <el-form-item label="Hiệu ứng tải">
          <Segmented
            :modelValue="newFormInline.frameLoading ? 0 : 1"
            :options="frameLoadingOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.frameLoading = value;
              }
            "
          />
        </el-form-item>
      </re-col>

      <re-col
        v-show="newFormInline.menuType !== 3"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Hiển thị menu">
          <Segmented
            :modelValue="newFormInline.showLink ? 0 : 1"
            :options="showLinkOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.showLink = value;
              }
            "
          />
        </el-form-item>
      </re-col>
      <re-col
        v-show="newFormInline.menuType !== 3"
        :value="12"
        :xs="24"
        :sm="24"
      >
        <el-form-item label="Menu cha">
          <Segmented
            :modelValue="newFormInline.showParent ? 0 : 1"
            :options="showParentOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.showParent = value;
              }
            "
          />
        </el-form-item>
      </re-col>

      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="Cache trang">
          <Segmented
            :modelValue="newFormInline.keepAlive ? 0 : 1"
            :options="keepAliveOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.keepAlive = value;
              }
            "
          />
        </el-form-item>
      </re-col>

      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="Tab ẩn">
          <Segmented
            :modelValue="newFormInline.hiddenTag ? 1 : 0"
            :options="hiddenTagOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.hiddenTag = value;
              }
            "
          />
        </el-form-item>
      </re-col>
      <re-col v-show="newFormInline.menuType < 2" :value="12" :xs="24" :sm="24">
        <el-form-item label="Tab cố định">
          <Segmented
            :modelValue="newFormInline.fixedTag ? 0 : 1"
            :options="fixedTagOptions"
            @change="
              ({ option: { value } }) => {
                newFormInline.fixedTag = value;
              }
            "
          />
        </el-form-item>
      </re-col>
    </el-row>
  </el-form>
</template>
