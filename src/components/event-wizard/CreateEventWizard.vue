<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="onToggle"
  >
    <div class="create-wizard">
      <!-- Header -->
      <header class="create-wizard__header">
        <button
          v-if="step > 1"
          type="button"
          class="create-wizard__icon-btn"
          aria-label="Vissza"
          @click="goBack"
        >
          <q-icon name="arrow_back" size="22px" />
        </button>
        <div v-else class="create-wizard__icon-btn create-wizard__icon-btn--spacer" />

        <div class="create-wizard__titles">
          <h2 class="create-wizard__title">
            {{ mode === 'edit' ? 'Esemény szerkesztése' : 'Új esemény' }}
          </h2>
          <p class="create-wizard__subtitle">{{ stepLabel }}</p>
        </div>

        <button
          type="button"
          class="create-wizard__icon-btn"
          aria-label="Bezárás"
          @click="close"
        >
          <q-icon name="close" size="22px" />
        </button>
      </header>

      <!-- Step indicator -->
      <div class="create-wizard__steps" role="tablist" aria-label="Varázsló lépések">
        <button
          v-for="(n, idx) in visibleSteps"
          :key="n"
          type="button"
          role="tab"
          class="create-wizard__step-tab"
          :class="{
            'is-active': n === step,
            'is-clickable': canGoToStep(n),
            'is-locked': !canGoToStep(n),
          }"
          :aria-selected="n === step"
          :aria-disabled="!canGoToStep(n)"
          :disabled="!canGoToStep(n)"
          @click="goToStep(n)"
        >
          <span class="create-wizard__step-num">{{ idx + 1 }}</span>
          <span v-if="n === step" class="create-wizard__step-name">{{ WIZARD_STEP_LABELS[n] }}</span>
        </button>
      </div>

      <!-- Body -->
      <div class="create-wizard__body">
        <StepType
          v-if="step === 1"
          :group-id="selection.groupId"
          :type-id="selection.typeId"
          :mode="mode"
          @select-group="onCategorySelect"
          @select-type="onTypeSelect"
        />
        <StepBasics
          v-else-if="step === 2"
          :model-value="basics"
          :type-name="selection.typeName"
          :type-icon="selection.typeIcon"
          :mode="mode"
          @update:model-value="patchBasics"
          @back="goBack"
          @next="step = 3"
        />
        <StepRestrictions
          v-else-if="step === WIZARD_STEP.restrictions"
          :model-value="basics"
          :type-name="selection.typeName"
          :type-icon="selection.typeIcon"
          :mode="mode"
          @update:model-value="patchBasics"
          @back="goBack"
          @next="goNext"
        />
        <StepPtaSettings
          v-else-if="step === WIZARD_STEP.ptaSettings"
          :model-value="basics"
          :type-name="selection.typeName"
          :type-icon="selection.typeIcon"
          :mode="mode"
          @update:model-value="patchBasics"
          @back="goBack"
          @next="goNext"
        />
        <StepTickets
          v-else-if="step === WIZARD_STEP.tickets"
          :model-value="basics"
          :type-name="selection.typeName"
          :type-icon="selection.typeIcon"
          :mode="mode"
          @update:model-value="patchBasics"
          @back="goBack"
          @next="onTicketsNext"
        />
        <StepPlaceholder
          v-else
          title="Eseményspecifikus adatlap"
          description="Ennél a típusnál később ide jönnek a típushoz tartozó extra mezők."
          icon="sym_r_dashboard_customize"
          :selection-chip="selection.typeName"
          :type-icon="selection.typeIcon"
          @back="goBack"
          @next="onFinishStub"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { useMasterDataStore } from 'src/stores/masterData';
import { useUiStore } from 'src/stores/ui';
import StepType from './steps/StepType.vue';
import StepBasics from './steps/StepBasics.vue';
import StepRestrictions from './steps/StepRestrictions.vue';
import StepTickets from './steps/StepTickets.vue';
import StepPtaSettings from './steps/StepPtaSettings.vue';
import StepPlaceholder from './steps/StepPlaceholder.vue';
import { hydrateWizardFromEvent } from './hydrateFromEvent';
import {
  WIZARD_STEP,
  WIZARD_STEP_LABELS,
  canNavigateToWizardStep,
  createEmptyBasics,
  isWizardStepComplete,
  visibleWizardSteps,
  wizardTypeHasExtraSheet,
  type WizardBasics,
  type WizardMode,
  type WizardSelection,
  type WizardStep,
} from './types';
import { isProfitabilityEventType } from 'src/modules/profitability/constants';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    mode?: WizardMode;
    eventId?: string | number | null;
  }>(),
  {
    mode: 'create',
    eventId: null,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const $q = useQuasar();
const eventStore = useEventStore();
const masterDataStore = useMasterDataStore();
const uiStore = useUiStore();
const step = ref<WizardStep>(1);

const selection = reactive<WizardSelection>({
  groupId: null,
  groupName: '',
  typeId: null,
  typeCode: '',
  typeName: '',
  typeIcon: '',
});

const basics = reactive(createEmptyBasics()) as WizardBasics;

const stepLabel = computed(() => {
  const label = WIZARD_STEP_LABELS[step.value];
  return `${visibleSteps.value.indexOf(step.value) + 1}/${visibleSteps.value.length} · ${label}`;
});

const isPta = computed(() => isProfitabilityEventType(selection.typeId));

const hasExtraSheet = computed(() => {
  if (selection.typeId == null) return false;
  const eventType = masterDataStore.getEventTypeById(selection.typeId);
  return wizardTypeHasExtraSheet(eventType as Record<string, unknown> | undefined);
});

const visibleSteps = computed(() => visibleWizardSteps(hasExtraSheet.value, isPta.value));

const allStepsComplete = computed(() =>
  visibleSteps.value.every((s) => isWizardStepComplete(s, selection, basics))
);

function canGoToStep(n: number): boolean {
  return canNavigateToWizardStep(
    n as WizardStep,
    props.mode,
    selection,
    basics,
    hasExtraSheet.value,
    isPta.value
  );
}

function goToStep(n: number) {
  if (!canGoToStep(n)) {
    $q.notify({
      message: 'Előbb töltsd ki a megelőző lépéseket.',
      color: 'warning',
      position: 'top',
    });
    return;
  }
  step.value = n as WizardStep;
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (props.mode === 'edit') {
      loadForEdit();
      return;
    }
    reset();
  },
  { immediate: true }
);

watch(
  [isPta, hasExtraSheet],
  () => {
    ensurePtaDefaults();
    if (!visibleSteps.value.includes(step.value)) {
      step.value = visibleSteps.value[visibleSteps.value.length - 1] || 1;
    }
  }
);

function applyHydration(payload: { selection: WizardSelection; basics: WizardBasics }) {
  Object.assign(selection, payload.selection);
  Object.assign(basics, payload.basics);
}

function loadForEdit() {
  const id = props.eventId;
  if (id == null || id === '') {
    reset();
    $q.notify({
      message: 'Az esemény adatai nem tölthetők be szerkesztéshez.',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
    });
    close();
    return;
  }
  const hydrated = hydrateWizardFromEvent(id, eventStore, masterDataStore);
  if (!hydrated) {
    reset();
    $q.notify({
      message: 'Ez az esemény nem található a szerkesztőben.',
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      timeout: 2400,
    });
    close();
    return;
  }
  applyHydration(hydrated);
  ensurePtaDefaults();
  step.value = 2;
}

function reset() {
  step.value = 1;
  selection.groupId = null;
  selection.groupName = '';
  selection.typeId = null;
  selection.typeCode = '';
  selection.typeName = '';
  selection.typeIcon = '';
  Object.assign(basics, createEmptyBasics());
}

function patchBasics(value: WizardBasics) {
  Object.assign(basics, value);
}

function onToggle(val: boolean) {
  emit('update:modelValue', val);
  uiStore.createWizardOpen = val;
}

function close() {
  emit('update:modelValue', false);
  uiStore.createWizardOpen = false;
}

onMounted(() => {
  uiStore.createWizardOpen = true;
});

onUnmounted(() => {
  uiStore.createWizardOpen = false;
});

function clearType() {
  selection.typeId = null;
  selection.typeCode = '';
  selection.typeName = '';
  selection.typeIcon = '';
}

function goBack() {
  const steps = visibleSteps.value;
  const idx = steps.indexOf(step.value);
  if (idx > 0) step.value = steps[idx - 1];
}

function goNext() {
  const steps = visibleSteps.value;
  const idx = steps.indexOf(step.value);
  if (idx >= 0 && idx < steps.length - 1) {
    step.value = steps[idx + 1];
    return;
  }
  onFinishStub();
}

function ensurePtaDefaults() {
  if (!isPta.value) return;
  if (basics.ptaGameTypeId == null && masterDataStore.ptaGameTypes[0]) {
    basics.ptaGameTypeId = masterDataStore.ptaGameTypes[0].id;
  }
  if (basics.ptaPairModeId == null && masterDataStore.ptaPairModes[0]) {
    basics.ptaPairModeId = masterDataStore.ptaPairModes[0].id;
  }
}

function onCategorySelect(payload: { id: number; name: string }) {
  if (selection.groupId === payload.id) {
    clearType();
    selection.groupId = null;
    selection.groupName = '';
    return;
  }
  clearType();
  selection.groupId = payload.id;
  selection.groupName = payload.name;
}

function onTypeSelect(payload: { id: number; code: string; name: string; icon: string }) {
  selection.typeId = payload.id;
  selection.typeCode = payload.code;
  selection.typeName = payload.name;
  selection.typeIcon = payload.icon;
  ensurePtaDefaults();
  step.value = 2;
}

function onTicketsNext() {
  if (hasExtraSheet.value) {
    step.value = WIZARD_STEP.extraSheet;
    return;
  }
  onFinishStub();
}

function onFinishStub() {
  console.log('Wizard draft', {
    mode: props.mode,
    selection: { ...selection },
    basics: { ...basics },
    roles: basics.roles,
    tickets: basics.tickets,
    ptaSettings: {
      GameTypeID: basics.ptaGameTypeId,
      PairModeID: basics.ptaPairModeId,
      ChampinshipID: basics.ptaChampionshipFlg ? basics.ptaChampionshipId : null,
      Category: basics.ptaCategory,
      Point1: basics.ptaPoint1,
      Point2: basics.ptaPoint2,
      Point3: basics.ptaPoint3,
      Point4: basics.ptaPoint4,
      MaxParticipants: basics.ptaMaxParticipants,
      OrganizationGrpFlg: basics.ptaOrganizationGrpFlg,
      TeamGrpFlg: basics.ptaTeamGrpFlg,
      RegionGrpFlg: basics.ptaRegionGrpFlg,
      CompanyGrpFlg: basics.ptaCompanyGrpFlg,
      PhotoUploadMadatoryFlg: basics.ptaPhotoUploadMandatoryFlg,
      ExtraPrizeFlg: basics.ptaExtraPrizeFlg,
      ShowUserPositionFlg: basics.ptaShowUserPositionFlg,
    },
    eventPrizes: basics.ptaExtraPrizeFlg
      ? (basics.ptaExtraPrizeIds || []).map((prizeId) => ({ PrizeID: prizeId }))
      : [],
    allStepsComplete: allStepsComplete.value,
  });
  $q.notify({
    message: 'A varázsló mentése hamarosan elérhető. Az adatok előkészítve.',
    icon: 'check_circle',
    color: 'dark',
    textColor: 'green-4',
    position: 'top',
    timeout: 2800,
    classes: 'border border-green-500/40 rounded-xl q-px-lg q-py-md font-bold text-[14px] mt-4',
    style: 'background: rgba(11, 15, 25, 0.85);',
  });
  close();
}
</script>

<style scoped lang="scss">
.create-wizard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
  color: #fff;
}

.create-wizard__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.create-wizard__icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &--spacer {
    visibility: hidden;
    pointer-events: none;
  }
}

.create-wizard__titles {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.create-wizard__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.create-wizard__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.create-wizard__steps {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 12px;
}

.create-wizard__step-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.72);
  color: #94a3b8;
  cursor: pointer;
  outline: none;
  flex: 0 0 auto;

  &.is-locked {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.is-clickable:not(.is-active):hover {
    border-color: rgba(255, 255, 255, 0.22);
    color: #e2e8f0;
    background: rgba(30, 41, 59, 0.9);
  }

  &.is-active {
    flex: 1 1 auto;
    min-width: 0;
    color: #f0f9ff;
    background: rgba(56, 189, 248, 0.22);
    border-color: rgba(56, 189, 248, 0.55);
    box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.2);
  }
}

.create-wizard__step-num {
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.create-wizard__step-name {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.create-wizard__body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 28px;
  -webkit-overflow-scrolling: touch;
}

</style>

<!-- Step child styles (unscoped — avoids :deep + BEM nesting issues) -->
<style lang="scss">
.create-wizard {
  .wizard-step {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 4px;
  }

  .wizard-step--center {
    min-height: calc(100% - 24px);
  }

  .wizard-step__hint {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
  }

  .wizard-step__chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wizard-cat-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .wizard-cat-block__types {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 2px 6px 12px;
  }

  .wizard-card.is-on {
    border-color: rgba(56, 189, 248, 0.45);
    background: rgba(56, 189, 248, 0.12);
  }

  .wizard-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(14, 165, 233, 0.28);
    color: #7dd3fc;
    font-size: 12px;
    font-weight: 700;
  }

  .wizard-chip--title {
    max-width: 100%;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-chip--mode {
    flex-shrink: 0;
    padding: 6px 8px;

    &.is-create {
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.14);
      border-color: rgba(16, 185, 129, 0.3);
    }

    &.is-edit {
      color: #fcd34d;
      background: rgba(245, 158, 11, 0.14);
      border-color: rgba(245, 158, 11, 0.3);
    }
  }

  .wizard-role-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .wizard-role-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px 8px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .wizard-role-row__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .wizard-role-row__name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-role-row__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .wizard-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;

    &:active {
      transform: scale(0.94);
    }
  }

  .wizard-icon-btn--lg {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(244, 63, 94, 0.1);
    border: 1px solid rgba(244, 63, 94, 0.22);
  }

  .wizard-icon-btn--danger {
    color: #fb7185;

    &:active {
      background: rgba(244, 63, 94, 0.2);
      color: #fda4af;
    }
  }

  .wizard-ticket-code {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #64748b;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wizard-ticket-card {
    gap: 8px;
  }

  .wizard-ticket-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .wizard-ticket-summary {
    display: block;
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.65);
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:active {
      background: rgba(14, 165, 233, 0.1);
    }
  }

  .wizard-ticket-summary__body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .wizard-ticket-summary__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .wizard-ticket-summary__row--second {
    align-items: center;
    margin-top: 2px;
  }

  .wizard-ticket-summary__left {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .wizard-ticket-summary__title {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-ticket-summary__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .wizard-status-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid transparent;
  }

  .wizard-status-chip.is-active {
    color: #6ee7b7;
    background: rgba(16, 185, 129, 0.14);
    border-color: rgba(16, 185, 129, 0.28);
  }

  .wizard-status-chip.is-inactive {
    color: #fb7185;
    background: rgba(244, 63, 94, 0.12);
    border-color: rgba(244, 63, 94, 0.25);
  }

  .wizard-status-chip.is-reg-open {
    color: #7dd3fc;
    background: rgba(14, 165, 233, 0.14);
    border-color: rgba(56, 189, 248, 0.3);
  }

  .wizard-status-chip.is-reg-soon {
    color: #fcd34d;
    background: rgba(245, 158, 11, 0.14);
    border-color: rgba(245, 158, 11, 0.3);
  }

  .wizard-status-chip.is-reg-ended,
  .wizard-status-chip.is-reg-unknown {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.25);
  }

  .wizard-ticket-summary__price {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 800;
    color: #e2e8f0;
    white-space: nowrap;
  }

  .wizard-ticket-summary__roles {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
    color: #7dd3fc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wizard-ticket-stock-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-height: 36px;
    padding: 6px 10px 6px 12px;
    border-radius: 10px;
    border: 1px solid rgba(56, 189, 248, 0.28);
    background: rgba(14, 165, 233, 0.1);
    color: #7dd3fc;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;

    &:active {
      background: rgba(14, 165, 233, 0.18);
    }
  }

  .wizard-ticket-stock-btn__chevron {
    opacity: 0.7;
    margin-left: 2px;
  }

  .wizard-step__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .wizard-card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.85);
    color: #fff;
    text-align: left;
    cursor: pointer;
    outline: none;
    transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: rgba(14, 165, 233, 0.45);
      background: rgba(30, 41, 59, 0.9);
    }

    &:active {
      transform: scale(0.985);
    }
  }

  .wizard-card__icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--ej-gradient, linear-gradient(135deg, #0ea5e9, #14b8a6));
    color: #fff;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
  }

  .wizard-card__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .wizard-card__title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  .wizard-card__meta {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
  }

  .wizard-card__chevron {
    color: #64748b;
    flex-shrink: 0;
  }

  .wizard-type-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .wizard-type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 12px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.85);
    color: #fff;
    text-align: center;
    cursor: pointer;
    outline: none;
    min-height: 0;
    transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: rgba(14, 165, 233, 0.45);
      background: rgba(30, 41, 59, 0.9);
    }

    &:active {
      transform: scale(0.98);
    }

    &.is-selected {
      border-color: rgba(56, 189, 248, 0.6);
      background: rgba(56, 189, 248, 0.16);
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.25);
    }
  }

  .wizard-type-card__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(14, 165, 233, 0.12);
    color: #7dd3fc;
  }

  .wizard-type-card__img {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }

  .wizard-type-card__title {
    width: 100%;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.35;
    text-align: center;
    text-wrap: balance;
  }

  .wizard-search {
    margin-bottom: 4px;

    .q-field__control {
      border-radius: 12px !important;
    }
  }

  .wizard-empty {
    margin-top: 24px;
    padding: 24px 16px;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #64748b;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 16px;
  }

  .wizard-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 12px;
    gap: 12px;
  }

  .wizard-placeholder__icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(14, 165, 233, 0.12);
    color: #38bdf8;
    margin-bottom: 4px;
  }

  .wizard-placeholder__title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
  }

  .wizard-placeholder__text {
    margin: 0;
    max-width: 320px;
    font-size: 13px;
    line-height: 1.5;
    color: #94a3b8;
  }

  .wizard-placeholder__nav {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
    padding-top: 16px;
  }

  .wizard-btn {
    border: none;
    border-radius: 999px;
    padding: 12px 22px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    outline: none;
    transition: filter 0.2s ease, transform 0.15s ease;

    &:active {
      transform: scale(0.97);
    }
  }

  .wizard-btn--ghost {
    background: rgba(255, 255, 255, 0.06);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .wizard-btn--primary {
    background: var(--ej-gradient, linear-gradient(135deg, #0ea5e9, #14b8a6));
    color: #fff;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
  }

  .wizard-btn--dashed {
    width: 100%;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 4px;
    border-radius: 12px;
    border: 1px dashed rgba(56, 189, 248, 0.55);
    background: rgba(14, 165, 233, 0.08);
    color: #7dd3fc;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:active {
      background: rgba(14, 165, 233, 0.16);
      border-color: rgba(56, 189, 248, 0.8);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .wizard-btn--dashed-compact {
    width: auto;
    flex-shrink: 0;
    min-height: 40px;
    padding: 0 14px;
    margin-top: 0;
  }

  .wizard-label-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wizard-label-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid rgba(236, 72, 153, 0.35);
    background: rgba(236, 72, 153, 0.18);
    color: #f9a8d4;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:active {
      background: rgba(236, 72, 153, 0.28);
    }
  }

  .wizard-label-chip--new {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(14, 165, 233, 0.15);
    color: #7dd3fc;
  }

  .wizard-step-nav {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
    padding-top: 8px;
  }

  .wizard-form-card {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.65);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .wizard-form-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .wizard-field-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 4px;
    display: block;
  }

  .wizard-field-hint {
    font-size: 12px;
    color: #64748b;
    margin: 0;
  }

  .wizard-flow-name {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 800;
    color: #e2e8f0;
  }

  .wizard-flow-path {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    margin: 6px 2px 0;
    overflow-x: auto;
    white-space: nowrap;
  }

  .wizard-flow-path__sep {
    flex-shrink: 0;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
  }

  .wizard-flow-path__status {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .wizard-field-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .wizard-field-grow {
    flex: 1;
    min-width: 0;
  }

  .wizard-toggle-row {
    padding: 2px 0;
  }

  .wizard-field {
    .q-field__control {
      border-radius: 12px !important;
      background-color: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;

      &:before,
      &:after {
        display: none !important;
      }
    }

    .q-field__control:hover {
      border-color: rgba(56, 189, 248, 0.4) !important;
    }

    .q-field--focused .q-field__control {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.15) !important;
    }

    .q-field__native,
    .q-field__input {
      color: #fff !important;
      font-size: 15px !important;
    }

    &.wizard-field--chips {
      .q-chip {
        background: rgba(236, 72, 153, 0.22) !important;
        color: #f9a8d4 !important;
        font-weight: 600;
      }

      .q-chip__icon--remove {
        color: #f9a8d4 !important;
        opacity: 0.85;
      }
    }
  }

  .wizard-location-detail {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(14, 165, 233, 0.08);
    border: 1px solid rgba(14, 165, 233, 0.2);
  }

  .wizard-location-detail__name {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .wizard-location-detail__addr {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
  }

  .wizard-btn-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #38bdf8;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 0;

    &:hover {
      color: #7dd3fc;
    }
  }

  .wizard-new-loc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
