<template>
  <div class="main">

    <!-- ================================================================
         Toolbar
    ================================================================ -->
    <div class="bg-bg_color px-4 py-3 flex flex-wrap items-end gap-3 border-b border-[var(--el-border-color-light)] shrink-0">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t("report.production.title") }}</span>
        <el-select
          v-model="selectedRptId"
          :placeholder="t('report.production.selectReport')"
          clearable
          style="width: 300px"
          filterable
        >
          <el-option
            v-for="r in reports"
            :key="r.RPT_ID"
            :value="r.RPT_ID"
            :label="r.NAME"
          >
            <div class="flex items-center justify-between w-full">
              <span class="font-medium">{{ r.NAME }}</span>
              <span class="text-xs text-[var(--el-text-color-secondary)] ml-3">
                {{ r.GROUP_COUNT }} {{ t("report.production.groups") }} · {{ r.METER_COUNT }} {{ t("report.production.meterCode") }}
              </span>
            </div>
          </el-option>
        </el-select>
      </div>

      <el-button
        type="primary"
        :loading="calculating"
        :disabled="!selectedRptId"
        @click="handleCalculate"
      >
        <span class="i-ri:calculator-line mr-1" />
        {{ t("report.production.calculate") }}
      </el-button>

      <el-divider direction="vertical" style="height:28px;margin:0 2px" />

      <el-button @click="openDrawer">
        <span class="i-ri:settings-3-line mr-1" />
        {{ t("report.production.manageConfig") }}
      </el-button>

      <el-button v-if="result" type="success" class="ml-auto" @click="handleExport">
        <span class="i-ri:file-excel-2-line mr-1" />
        {{ t("report.production.exportExcel") }}
      </el-button>
    </div>

    <!-- ================================================================
         Scroll area
    ================================================================ -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">

      <!-- Empty state -->
      <div
        v-if="!result && !calculating"
        class="bg-bg_color rounded-lg flex flex-col items-center justify-center"
        style="min-height: 420px"
      >
        <span class="i-ri:bar-chart-grouped-line" style="font-size:72px;color:var(--el-text-color-placeholder)" />
        <p class="mt-4 text-[var(--el-text-color-secondary)] text-sm">
          {{ t("report.production.emptyHint") }}
        </p>
        <el-button plain class="mt-4" @click="openDrawer">
          <span class="i-ri:add-line mr-1" />
          {{ t("report.production.createNew") }}
        </el-button>
      </div>

      <!-- Calculating -->
      <div
        v-if="calculating"
        class="bg-bg_color rounded-lg flex flex-col items-center justify-center"
        style="min-height: 300px"
      >
        <span class="i-ri:loader-4-line animate-spin text-5xl text-[var(--el-color-primary)]" />
        <p class="mt-4 text-[var(--el-text-color-secondary)] text-sm">{{ t("report.production.calculating") }}</p>
      </div>

      <!-- Results -->
      <template v-if="result">

        <!-- Summary banner -->
        <div class="bg-bg_color rounded-lg px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-l-4 border-[var(--el-color-primary)]">
          <div>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t("report.production.reportName") }}</p>
            <p class="font-bold text-sm leading-tight">{{ result.rpt.NAME }}</p>
          </div>
          <div class="w-px h-8 bg-[var(--el-border-color)] hidden sm:block" />
          <div>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t("report.production.startDate") }}</p>
            <p class="text-sm font-medium">{{ formatDate(result.rpt.START_DATE) }}</p>
          </div>
          <div>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t("report.production.periodConfig") }}</p>
            <p class="text-sm font-medium">{{ result.rpt.PERIOD_NUM }} {{ periodLabel(result.rpt.TIME_RECORD) }}</p>
          </div>
          <div>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t("report.production.actualData") }}</p>
            <p class="text-sm font-medium">{{ result.periods.length }} {{ t("report.production.periods") }}</p>
          </div>
          <div>
            <p class="text-[11px] text-[var(--el-text-color-secondary)]">{{ t("report.production.scope") }}</p>
            <p class="text-sm font-medium">{{ result.groups.length }} {{ t("report.production.groups") }} · {{ totalMeterCount }} {{ t("report.production.meters") }}</p>
          </div>
          <el-tag
            class="ml-auto shrink-0"
            :type="result.rpt.TIME_RECORD === 'MONTH' ? 'primary' : result.rpt.TIME_RECORD === 'DAY' ? 'warning' : 'success'"
            size="small"
          >
            {{ result.rpt.TIME_RECORD === 'MONTH' ? t("report.production.byMonth") : result.rpt.TIME_RECORD === 'DAY' ? t("report.production.byDay") : t("report.production.byYear") }}
          </el-tag>
        </div>

        <!-- KPI grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="bg-bg_color rounded-lg p-4 border-l-4"
            :style="{ borderColor: kpi.color }"
          >
            <div class="flex items-center gap-3">
              <span :class="[kpi.icon, 'text-[28px] shrink-0']" :style="{ color: kpi.color }" />
              <div class="min-w-0">
                <p class="text-xs text-[var(--el-text-color-secondary)] truncate">{{ kpi.label }}</p>
                <p class="text-lg font-bold leading-tight" :style="{ color: kpi.color }">
                  {{ kpi.val }}
                  <span class="text-xs font-normal text-[var(--el-text-color-secondary)] ml-0.5">{{ kpi.unit }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart -->
        <div class="bg-bg_color rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <span class="font-semibold text-sm">{{ t("report.production.productionChart") }}</span>
              <span class="text-xs text-[var(--el-text-color-secondary)] ml-2">
                {{ result.periods.length > 0 ? result.periods[0] + ' → ' + result.periods[result.periods.length - 1] : '' }}
              </span>
            </div>
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t("report.production.unitLabel") }}</span>
          </div>
          <div ref="chartRef" style="height: 320px; width: 100%" />
        </div>

        <!-- Table -->
        <div class="bg-bg_color rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm">{{ t("report.production.productionTable") }}</span>
              <el-tag type="info" size="small">{{ result.groups.length }} {{ t("report.production.groups") }}</el-tag>
              <el-tag type="success" size="small">{{ totalMeterCount }} {{ t("report.production.meters") }}</el-tag>
            </div>
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t("report.production.unitLabel") }}</span>
          </div>
          <el-table
            :data="result.groups"
            border
            stripe
            show-summary
            :summary-method="summaryMethod"
            style="width: 100%"
            :header-cell-style="{ fontSize: '12px', fontWeight: '600', background: 'var(--el-fill-color-light)' }"
          >
            <el-table-column :label="t('report.production.group')" fixed="left" min-width="200">
              <template #default="{ row }">
                <div class="flex items-center gap-2">
                  <span class="i-ri:group-line text-[var(--el-color-primary)] shrink-0" />
                  <span class="font-medium truncate">{{ row.groupName }}</span>
                  <el-tag size="small" type="info" class="shrink-0">{{ row.meterNos.length }} {{ t("report.production.meterCode") }}</el-tag>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              v-for="period in result.periods"
              :key="period"
              :label="period"
              min-width="110"
              align="right"
            >
              <template #default="{ row }">
                <span class="tabular-nums text-sm">
                  {{ (row.periodTotals[period] ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column :label="t('report.production.totalM3')" fixed="right" min-width="130" align="right">
              <template #default="{ row }">
                <span class="font-bold text-[var(--el-color-primary)] tabular-nums">
                  {{ row.total.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>

      </template>
    </div><!-- end scroll area -->

    <!-- ================================================================
         Config Drawer
    ================================================================ -->
    <el-drawer
      v-model="drawerOpen"
      :title="t('report.production.configManagement')"
      direction="rtl"
      size="900px"
      :destroy-on-close="false"
    >
      <div class="flex h-full" style="gap: 0">
        <!-- Left: report list -->
        <div
          class="shrink-0 flex flex-col border-r border-[var(--el-border-color)]"
          style="width: 240px; padding: 12px 8px"
        >
          <el-button
            type="primary"
            size="small"
            class="mb-3 w-full"
            @click="openAddRpt"
          >
            <span class="i-ri:add-line mr-1" />
            {{ t("report.production.addReport") }}
          </el-button>

          <div class="flex-1 overflow-y-auto">
            <div
              v-for="r in reports"
              :key="r.RPT_ID"
              class="rpt-item"
              :class="{ 'rpt-item--active': drawerRptId === r.RPT_ID }"
              @click="selectDrawerRpt(r.RPT_ID)"
            >
              <div class="font-medium text-sm leading-5 truncate">{{ r.NAME }}</div>
              <div class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                {{ formatDate(r.START_DATE) }} · {{ r.PERIOD_NUM }} {{ periodLabel(r.TIME_RECORD) }}
              </div>
              <div class="text-xs text-[var(--el-text-color-secondary)]">
                {{ r.GROUP_COUNT }} {{ t("report.production.groups") }} · {{ r.METER_COUNT }} {{ t("report.production.meterCode") }}
              </div>
              <div class="flex gap-2 mt-1">
                <span class="text-xs text-[var(--el-color-primary)] cursor-pointer hover:underline" @click.stop="openEditRpt(r)">{{ t("common.edit") }}</span>
                <span class="text-xs text-[var(--el-color-danger)] cursor-pointer hover:underline" @click.stop="deleteRpt(r)">{{ t("common.delete") }}</span>
              </div>
            </div>

            <div
              v-if="reports.length === 0"
              class="text-center text-sm text-[var(--el-text-color-secondary)] py-6"
            >
              {{ t("common.noData") }}
            </div>
          </div>
        </div>

        <!-- Right: group + meter detail -->
        <div class="flex-1 flex flex-col overflow-hidden" style="padding: 12px 16px">
          <template v-if="drawerDetail">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
              <span class="font-semibold text-base">{{ drawerDetail.name }}</span>
              <el-button
                type="primary"
                size="small"
                @click="openAddGroup(drawerDetail.rptId)"
              >
                <span class="i-ri:add-line mr-1" />
                {{ t("report.production.addGroup") }}
              </el-button>
            </div>

            <div class="flex-1 overflow-y-auto">
              <el-collapse v-if="drawerDetail.groups && drawerDetail.groups.length > 0">
                <el-collapse-item
                  v-for="g in drawerDetail.groups"
                  :key="g.groupId"
                  :name="g.groupId"
                >
                  <template #title>
                    <div class="flex items-center gap-2 w-full pr-4">
                      <span class="font-medium">{{ g.name }}</span>
                      <el-tag size="small" type="info">{{ g.meters.length }} {{ t("report.production.meterCode") }}</el-tag>
                      <div class="ml-auto flex gap-2" @click.stop>
                        <span class="text-xs text-[var(--el-color-primary)] cursor-pointer hover:underline" @click="openEditGroup(g)">{{ t("common.edit") }}</span>
                        <span class="text-xs text-[var(--el-color-danger)] cursor-pointer hover:underline" @click="deleteGroup(g)">{{ t("common.delete") }}</span>
                      </div>
                    </div>
                  </template>

                  <div class="pb-2">
                    <el-button
                      size="small"
                      class="mb-2"
                      @click="openAddMeter(g.groupId, g.name)"
                    >
                      <span class="i-ri:add-line mr-1" />
                      {{ t("report.production.addMeter") }}
                    </el-button>

                    <el-table
                      :data="g.meters"
                      size="small"
                      border
                      style="width: 100%"
                    >
                      <el-table-column :label="t('report.production.meterCode')" prop="meterNo" min-width="120" />
                      <el-table-column :label="t('report.production.meterNameLabel')" prop="meterName" min-width="150" show-overflow-tooltip />
                      <el-table-column :label="t('report.production.statusLabel')" width="90" align="center">
                        <template #default="{ row }">
                          <el-tag :type="row.state === 1 ? 'success' : 'danger'" size="small">
                            {{ row.state === 1 ? t("report.production.stateActive") : t("report.production.stateInactive") }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column label="" width="60" align="center">
                        <template #default="{ row }">
                          <el-button
                            link
                            type="danger"
                            size="small"
                            @click="removeMeter(g.groupId, row.meterNo)"
                          >
                            <span class="i-ri:delete-bin-line" />
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>

                    <div
                      v-if="g.meters.length === 0"
                      class="text-center text-sm text-[var(--el-text-color-secondary)] py-4"
                    >
                      {{ t("report.production.noMeter") }}
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>

              <div
                v-else
                class="flex flex-col items-center justify-center py-12"
              >
                <span class="i-ri:group-line text-5xl text-[var(--el-text-color-placeholder)]" />
                <p class="mt-3 text-sm text-[var(--el-text-color-secondary)]">
                  {{ t("report.production.noGroups") }}
                </p>
              </div>
            </div>
          </template>

          <div
            v-else
            class="flex flex-col items-center justify-center h-full"
          >
            <span class="i-ri:arrow-left-line text-4xl text-[var(--el-text-color-placeholder)]" />
            <p class="mt-3 text-sm text-[var(--el-text-color-secondary)]">
              {{ t("report.production.selectFromLeft") }}
            </p>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- ================================================================
         Report Form Dialog
    ================================================================ -->
    <el-dialog
      v-model="rptFormVisible"
      :title="rptFormMode === 'add' ? t('report.production.addReport') : t('report.production.editReport')"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px" label-position="left">
        <el-form-item :label="t('report.production.reportNameLabel')" required>
          <el-input v-model="rptForm.name" :placeholder="t('report.production.reportNameLabel')" clearable />
        </el-form-item>
        <el-form-item :label="t('report.production.startDate')" required>
          <el-date-picker
            v-model="rptForm.startDate"
            type="date"
            :placeholder="t('report.production.startDate')"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('report.production.periodNum')" required>
          <el-input-number
            v-model="rptForm.periodNum"
            :min="1"
            :max="120"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('report.production.periodType')" required>
          <el-select v-model="rptForm.timeRecord" style="width: 100%">
            <el-option :label="t('report.production.periodMonth')" value="MONTH" />
            <el-option :label="t('report.production.periodDay')" value="DAY" />
            <el-option :label="t('report.production.periodYear')" value="YEAR" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="rptFormVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitRptForm">
          {{ rptFormMode === "add" ? t("common.add") : t("common.save") }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ================================================================
         Group Form Dialog
    ================================================================ -->
    <el-dialog
      v-model="groupFormVisible"
      :title="groupFormMode === 'add' ? t('report.production.addGroup') : t('report.production.editGroup')"
      width="360px"
      :close-on-click-modal="false"
    >
      <el-form label-width="90px" label-position="left">
        <el-form-item :label="t('report.production.group')" required>
          <el-input v-model="groupForm.name" :placeholder="t('report.production.group')" clearable />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="groupFormVisible = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitGroupForm">
          {{ groupFormMode === "add" ? t("common.add") : t("common.save") }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ================================================================
         Add Meter Dialog — tree browse + table select
    ================================================================ -->
    <el-dialog
      v-model="meterDialogVisible"
      :title="`${t('report.production.addMeter')}: ${meterDialogGroupName}`"
      :width="960"
      top="4vh"
      :close-on-click-modal="false"
      class="meter-pick-dialog"
    >
      <div class="meter-pick-body">

        <!-- Left: zone tree (5-level browse) -->
        <div class="meter-pick-tree">
          <div class="pick-panel-hd">
            <span class="i-ri:node-tree mr-1 text-[var(--el-color-primary)]" />
            {{ t("report.production.browseByZone") }}
          </div>
          <ZoneMeterTree
            title=""
            height="calc(70vh - 80px)"
            @select="onDialogTreeSelect"
          />
        </div>

        <!-- Right: search + table + selection -->
        <div class="meter-pick-right">

          <!-- Zone breadcrumb filter -->
          <div class="pick-zone-bar">
            <span class="text-xs text-[var(--el-text-color-secondary)]">{{ t("report.production.filterByZone") }}:</span>
            <el-tag
              v-if="meterDialogZoneName"
              closable
              size="small"
              type="primary"
              class="ml-1"
              @close="clearDialogZone"
            >
              {{ meterDialogZoneName }}
            </el-tag>
            <span v-else class="ml-1 text-xs text-[var(--el-text-color-placeholder)]">{{ t("report.production.allZones") }}</span>
          </div>

          <!-- Search row -->
          <div class="flex gap-2 mb-2">
            <el-input
              v-model="meterSearchKw"
              :placeholder="t('report.production.searchMeter')"
              clearable
              size="small"
              @keyup.enter="searchMeters"
            >
              <template #prefix><span class="i-ri:search-line" /></template>
            </el-input>
            <el-button size="small" type="primary" :loading="meterSearchLoading" @click="searchMeters">{{ t("common.search") }}</el-button>
          </div>

          <!-- Meter table -->
          <el-table
            :data="meterSearchResults"
            v-loading="meterSearchLoading"
            border
            size="small"
            style="width:100%"
            height="calc(70vh - 180px)"
            @selection-change="(sel: any[]) => (selectedMeterNos = sel.map((r: any) => r.meterNo))"
          >
            <el-table-column type="selection" width="42" />
            <el-table-column :label="t('report.production.meterCode')" prop="meterNo" width="120" />
            <el-table-column :label="t('report.production.meterNameLabel')" prop="meterName" min-width="160" show-overflow-tooltip />
            <el-table-column :label="t('report.production.regionLabel')" prop="regionName" min-width="140" show-overflow-tooltip />
            <el-table-column :label="t('report.production.statusShort')" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="row.state === 1 ? 'success' : row.state === 2 ? 'danger' : 'info'" size="small">
                  {{ row.state === 1 ? t("report.production.stateActive") : row.state === 2 ? t("report.production.stateBroken") : t("report.production.stateOther") }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <!-- Selected chips -->
          <div class="pick-selection-bar">
            <span class="text-xs text-[var(--el-text-color-secondary)] shrink-0">
              {{ t("report.production.selected") }} ({{ selectedMeterNos.length }}):
            </span>
            <div class="flex flex-wrap gap-1 overflow-y-auto" style="max-height:52px">
              <el-tag
                v-for="no in selectedMeterNos"
                :key="no"
                closable
                size="small"
                type="primary"
                @close="removeSelectedMeter(no)"
              >{{ no }}</el-tag>
              <span v-if="selectedMeterNos.length === 0" class="text-xs text-[var(--el-text-color-placeholder)]">{{ t("report.production.noMeter") }}</span>
            </div>
          </div>

        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <span class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t("report.production.showingMeters", { count: meterSearchResults.length }) }}
            <template v-if="meterDialogZoneName"> {{ t("report.production.inZone") }} <b>{{ meterDialogZoneName }}</b></template>
          </span>
          <div class="flex gap-2">
            <el-button @click="meterDialogVisible = false">{{ t("common.cancel") }}</el-button>
            <el-button
              type="primary"
              :disabled="selectedMeterNos.length === 0"
              @click="submitAddMeters"
            >
              <span class="i-ri:add-line mr-1" />
              {{ t("report.production.addMetersBtn", { count: selectedMeterNos.length || '' }) }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

  </div><!-- end .main -->
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useDark, useECharts } from "@pureadmin/utils";
import { ElMessage, ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import { http } from "@/utils/http";
import ZoneMeterTree from "@/components/ZoneMeterTree/index.vue";
import type { TreeSelection } from "@/hooks/useZoneMeterTree";
import {
  getReportVolumeList,
  addReportVolume,
  updateReportVolume,
  deleteReportVolume,
  getReportVolumeDetail,
  addReportGroup,
  updateReportGroup,
  deleteReportGroup,
  addGroupMeter,
  removeGroupMeter,
  calculateReportVolume
} from "@/api/reportVolume";

defineOptions({ name: "ReportProduction" });

const { t } = useI18n();

// ================================================================
// State
// ================================================================
const reports = ref<any[]>([]);
const selectedRptId = ref<number | null>(null);
const calculating = ref(false);
const result = ref<any>(null);

// Drawer
const drawerOpen = ref(false);
const drawerLoading = ref(false);
const drawerRptId = ref<number | null>(null);
const drawerDetail = ref<any>(null);

// Report form
const rptFormVisible = ref(false);
const rptFormMode = ref<"add" | "edit">("add");
const rptFormEditId = ref<number | null>(null);
const rptForm = ref({
  name: "",
  startDate: dayjs().startOf("year").format("YYYY-MM-DD"),
  periodNum: 12,
  timeRecord: "MONTH"
});

// Group form
const groupFormVisible = ref(false);
const groupFormMode = ref<"add" | "edit">("add");
const groupFormId = ref<number | null>(null);
const groupFormRptId = ref<number | null>(null);
const groupForm = ref({ name: "" });

// Meter dialog
const meterDialogVisible = ref(false);
const meterDialogGroupId = ref<number | null>(null);
const meterDialogGroupName = ref("");
const meterSearchKw = ref("");
const meterSearchResults = ref<any[]>([]);
const meterSearchLoading = ref(false);
const selectedMeterNos = ref<string[]>([]);
const meterDialogZoneId = ref<number | null>(null);
const meterDialogZoneName = ref("");

function onDialogTreeSelect(sel: TreeSelection) {
  if (sel.type === "meter") {
    if (sel.meterNo && !selectedMeterNos.value.includes(sel.meterNo)) {
      selectedMeterNos.value = [...selectedMeterNos.value, sel.meterNo];
      ElMessage.success({ message: `${t("common.selected")}: ${sel.label}`, duration: 1000 });
    }
    return;
  }
  meterDialogZoneId.value = sel.type === "zone" ? (sel.regionId ?? null) : null;
  meterDialogZoneName.value = sel.type === "zone" ? sel.label : "";
  searchMeters();
}

function clearDialogZone() {
  meterDialogZoneId.value = null;
  meterDialogZoneName.value = "";
  searchMeters();
}

function removeSelectedMeter(meterNo: string) {
  selectedMeterNos.value = selectedMeterNos.value.filter(n => n !== meterNo);
}

// ================================================================
// Chart
// ================================================================
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "default"));
const chartRef = ref();
const { setOptions } = useECharts(chartRef, { theme });

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6"
];

function renderChart() {
  if (!result.value || !result.value.periods.length) return;

  const { periods, groups } = result.value;

  const series = groups.map((g: any, idx: number) => ({
    name: g.groupName,
    type: "bar",
    stack: "total",
    data: periods.map((p: string) => +(g.periodTotals[p] ?? 0).toFixed(3)),
    itemStyle: { color: COLORS[idx % COLORS.length] }
  }));

  setOptions({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        if (!params.length) return "";
        const period = params[0].name;
        let html = `<b>${period}</b><br/>`;
        let total = 0;
        for (const p of params) {
          html += `${p.marker}${p.seriesName}: <b>${(+p.value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</b> m³<br/>`;
          total += +p.value;
        }
        html += `<hr style="margin:4px 0"/>Tổng: <b>${total.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</b> m³`;
        return html;
      }
    },
    legend: { bottom: 0, type: "scroll" },
    grid: { top: 20, left: 60, right: 20, bottom: 50 },
    xAxis: {
      type: "category",
      data: periods,
      axisLabel: { rotate: periods.length > 12 ? 30 : 0 }
    },
    yAxis: {
      type: "value",
      name: "m³",
      axisLabel: {
        formatter: (v: number) => v.toLocaleString("vi-VN")
      }
    },
    series
  });
}

watch(theme, () => {
  nextTick(() => renderChart());
});

// ================================================================
// Computed
// ================================================================
const totalMeterCount = computed(() => {
  if (!result.value) return 0;
  return result.value.groups.reduce(
    (acc: number, g: any) => acc + g.meterNos.length,
    0
  );
});

const kpis = computed(() => {
  if (!result.value) return [];
  const avgPerPeriod =
    result.value.periods.length > 0
      ? result.value.grandTotal / result.value.periods.length
      : 0;
  return [
    {
      label: t("report.production.totalProduction"),
      val: result.value.grandTotal.toLocaleString("vi-VN", {
        maximumFractionDigits: 2
      }),
      unit: "m³",
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      icon: "i-ri:drop-fill"
    },
    {
      label: t("report.production.groupCount"),
      val: result.value.groups.length,
      unit: t("report.production.groups"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.08)",
      icon: "i-ri:group-line"
    },
    {
      label: t("report.production.periodCount"),
      val: result.value.periods.length,
      unit: t("report.production.periods"),
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      icon: "i-ri:calendar-line"
    },
    {
      label: t("report.production.avgPerPeriod"),
      val: avgPerPeriod.toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
      unit: "m³",
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.08)",
      icon: "i-ri:bar-chart-line"
    }
  ];
});

// ================================================================
// Table summary
// ================================================================
function summaryMethod({ columns }: { columns: any[] }) {
  if (!result.value) return [];
  const sums: string[] = [];
  columns.forEach((col: any, index: number) => {
    if (index === 0) {
      sums[index] = t("report.production.grandTotal");
      return;
    }
    if (index === columns.length - 1) {
      sums[index] = result.value.grandTotal.toLocaleString("vi-VN", {
        maximumFractionDigits: 2
      });
      return;
    }
    const period = result.value.periods[index - 1];
    if (!period) {
      sums[index] = "";
      return;
    }
    const total = result.value.groups.reduce(
      (acc: number, g: any) => acc + (g.periodTotals[period] ?? 0),
      0
    );
    sums[index] = total.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  });
  return sums;
}

// ================================================================
// Helpers
// ================================================================
function formatDate(d: string | Date | null) {
  if (!d) return "";
  return dayjs(d).format("DD/MM/YYYY");
}

function periodLabel(tr: string) {
  if (tr === "MONTH") return t("report.production.periodMonth");
  if (tr === "DAY") return t("report.production.periodDay");
  if (tr === "YEAR") return t("report.production.periodYear");
  return tr;
}

// ================================================================
// Report list
// ================================================================
async function loadReports() {
  const res = (await getReportVolumeList()) as any;
  if (res?.code === 0) {
    reports.value = res.data ?? [];
    if (!selectedRptId.value && reports.value.length > 0) {
      selectedRptId.value = reports.value[0].RPT_ID;
    }
  }
}

// ================================================================
// Calculate
// ================================================================
async function handleCalculate() {
  if (!selectedRptId.value) {
    ElMessage.warning(t("report.production.selectReportFirst"));
    return;
  }
  calculating.value = true;
  result.value = null;
  try {
    const res = (await calculateReportVolume(selectedRptId.value)) as any;
    if (res?.code === 0) {
      result.value = res.data;
      await nextTick();
      renderChart();
    } else {
      ElMessage.error(res?.message ?? t("report.production.calcFailed"));
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("common.unknownError"));
  } finally {
    calculating.value = false;
  }
}

// ================================================================
// Drawer
// ================================================================
function openDrawer() {
  drawerOpen.value = true;
  loadReports();
}

async function loadDrawerDetail(rptId: number) {
  drawerLoading.value = true;
  try {
    const res = (await getReportVolumeDetail(rptId)) as any;
    if (res?.code === 0) {
      drawerDetail.value = res.data;
    }
  } finally {
    drawerLoading.value = false;
  }
}

function selectDrawerRpt(rptId: number) {
  drawerRptId.value = rptId;
  loadDrawerDetail(rptId);
}

// ================================================================
// Report CRUD
// ================================================================
function openAddRpt() {
  rptFormMode.value = "add";
  rptFormEditId.value = null;
  rptForm.value = {
    name: "",
    startDate: dayjs().startOf("year").format("YYYY-MM-DD"),
    periodNum: 12,
    timeRecord: "MONTH"
  };
  rptFormVisible.value = true;
}

function openEditRpt(r: any) {
  rptFormMode.value = "edit";
  rptFormEditId.value = r.RPT_ID;
  rptForm.value = {
    name: r.NAME,
    startDate: dayjs(r.START_DATE).format("YYYY-MM-DD"),
    periodNum: r.PERIOD_NUM,
    timeRecord: r.TIME_RECORD
  };
  rptFormVisible.value = true;
}

async function submitRptForm() {
  if (!rptForm.value.name.trim()) {
    ElMessage.warning(t("report.production.enterReportName"));
    return;
  }
  try {
    let res: any;
    if (rptFormMode.value === "add") {
      res = await addReportVolume(rptForm.value);
    } else {
      res = await updateReportVolume(rptFormEditId.value!, rptForm.value);
    }
    if ((res as any)?.code === 0) {
      ElMessage.success(
        rptFormMode.value === "add"
          ? t("report.production.addRptSuccess")
          : t("report.production.updateRptSuccess")
      );
      rptFormVisible.value = false;
      await loadReports();
      if (rptFormMode.value === "edit" && drawerRptId.value) {
        loadDrawerDetail(drawerRptId.value);
      }
    } else {
      ElMessage.error((res as any)?.message ?? t("report.production.opFailed"));
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

async function deleteRpt(r: any) {
  try {
    await ElMessageBox.confirm(
      t("report.production.deleteRptConfirm", { name: r.NAME }),
      t("report.production.confirmDeleteTitle"),
      {
        type: "warning",
        confirmButtonText: t("report.production.deleteBtn"),
        cancelButtonText: t("common.cancel")
      }
    );
    const res = (await deleteReportVolume(r.RPT_ID)) as any;
    if (res?.code === 0) {
      ElMessage.success(t("common.deleteSuccess"));
      if (drawerRptId.value === r.RPT_ID) {
        drawerRptId.value = null;
        drawerDetail.value = null;
      }
      await loadReports();
    } else {
      ElMessage.error(res?.message ?? t("common.deleteFailed"));
    }
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

// ================================================================
// Group CRUD
// ================================================================
function openAddGroup(rptId: number) {
  groupFormMode.value = "add";
  groupFormId.value = null;
  groupFormRptId.value = rptId;
  groupForm.value = { name: "" };
  groupFormVisible.value = true;
}

function openEditGroup(g: any) {
  groupFormMode.value = "edit";
  groupFormId.value = g.groupId;
  groupFormRptId.value = drawerRptId.value;
  groupForm.value = { name: g.name };
  groupFormVisible.value = true;
}

async function submitGroupForm() {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning(t("report.production.enterGroupName"));
    return;
  }
  try {
    let res: any;
    if (groupFormMode.value === "add") {
      res = await addReportGroup({
        rptId: groupFormRptId.value,
        name: groupForm.value.name
      });
    } else {
      res = await updateReportGroup(groupFormId.value!, {
        name: groupForm.value.name
      });
    }
    if ((res as any)?.code === 0) {
      ElMessage.success(
        groupFormMode.value === "add"
          ? t("report.production.addGroupSuccess")
          : t("report.production.updateGroupSuccess")
      );
      groupFormVisible.value = false;
      if (drawerRptId.value) await loadDrawerDetail(drawerRptId.value);
      await loadReports();
    } else {
      ElMessage.error((res as any)?.message ?? t("report.production.opFailed"));
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

async function deleteGroup(g: any) {
  try {
    await ElMessageBox.confirm(
      t("report.production.deleteGroupConfirm", { name: g.name }),
      t("report.production.confirmDeleteTitle"),
      {
        type: "warning",
        confirmButtonText: t("report.production.deleteBtn"),
        cancelButtonText: t("common.cancel")
      }
    );
    const res = (await deleteReportGroup(g.groupId)) as any;
    if (res?.code === 0) {
      ElMessage.success(t("report.production.deleteGroupSuccess"));
      if (drawerRptId.value) await loadDrawerDetail(drawerRptId.value);
      await loadReports();
    } else {
      ElMessage.error(res?.message ?? t("common.deleteFailed"));
    }
  } catch (e: any) {
    if (e !== "cancel") ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

// ================================================================
// Meter CRUD
// ================================================================
function openAddMeter(groupId: number, groupName = "") {
  meterDialogGroupId.value = groupId;
  meterDialogGroupName.value = groupName;
  meterSearchKw.value = "";
  meterSearchResults.value = [];
  selectedMeterNos.value = [];
  meterDialogZoneId.value = null;
  meterDialogZoneName.value = "";
  meterDialogVisible.value = true;
  nextTick(() => searchMeters());
}

async function searchMeters() {
  meterSearchLoading.value = true;
  try {
    const payload: any = { keyword: meterSearchKw.value, pageSize: 50, currentPage: 1 };
    if (meterDialogZoneId.value) payload.lineId = meterDialogZoneId.value;
    const res = (await (http.request as Function)("post", "/api/water-meters/list", {
      data: payload
    })) as any;
    if (res?.code === 0) {
      meterSearchResults.value = res.data?.list ?? res.data ?? [];
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("report.production.searchFailed"));
  } finally {
    meterSearchLoading.value = false;
  }
}

async function submitAddMeters() {
  if (!meterDialogGroupId.value || selectedMeterNos.value.length === 0) return;
  try {
    const res = (await addGroupMeter(meterDialogGroupId.value, {
      meterNos: selectedMeterNos.value
    })) as any;
    if (res?.code === 0) {
      ElMessage.success(
        t("report.production.addMetersBtn", { count: res.data?.added ?? selectedMeterNos.value.length })
      );
      meterDialogVisible.value = false;
      if (drawerRptId.value) await loadDrawerDetail(drawerRptId.value);
      await loadReports();
    } else {
      ElMessage.error(res?.message ?? t("report.production.addMeterFailed"));
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

async function removeMeter(groupId: number, meterNo: string) {
  try {
    const res = (await removeGroupMeter(groupId, { meterNo })) as any;
    if (res?.code === 0) {
      ElMessage.success(t("report.production.removeMeterSuccess"));
      if (drawerRptId.value) await loadDrawerDetail(drawerRptId.value);
      await loadReports();
    } else {
      ElMessage.error(res?.message ?? t("report.production.removeMeterFailed"));
    }
  } catch (e: any) {
    ElMessage.error(e?.message ?? t("common.unknownError"));
  }
}

// ================================================================
// Export
// ================================================================
function handleExport() {
  ElMessage.info(t("report.production.exportDev"));
}

// ================================================================
// Lifecycle
// ================================================================
onMounted(() => {
  loadReports();
});
</script>

<style scoped lang="scss">
.main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-fill-color-extra-light);
}

.rpt-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: background 0.12s;

  &:hover { background: var(--el-fill-color); }

  &--active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }
}

/* Add-meter dialog */
.meter-pick-body {
  display: flex;
  gap: 0;
  height: 70vh;
  overflow: hidden;
}

.meter-pick-tree {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 8px 8px;
}

.meter-pick-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 0 0 14px;
}

.pick-panel-hd {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 8px 4px 8px;
  display: flex;
  align-items: center;
}

.pick-zone-bar {
  display: flex;
  align-items: center;
  padding: 6px 0 8px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  margin-bottom: 8px;
  min-height: 36px;
}

.pick-selection-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0 0;
  border-top: 1px solid var(--el-border-color-extra-light);
  margin-top: 8px;
}
</style>
