<template>
  <div class="wizard-step">
    <div class="wizard-step__chip-row">
      <WizardModeIcon :mode="mode" />
      <span class="wizard-chip">
        <img
          v-if="typeIconResolved.kind === 'img'"
          :src="typeIconResolved.value"
          alt=""
          style="width: 16px; height: 16px; object-fit: contain;"
        />
        <q-icon v-else :name="typeIconResolved.value" size="16px" />
        {{ typeName }}
      </span>
      <span v-if="modelValue.title" class="wizard-chip wizard-chip--title">
        <q-icon name="sym_r_edit_calendar" size="16px" />
        {{ modelValue.title }}
      </span>
    </div>

    <p class="wizard-step__hint">PROFI-T-ABILITY játékbeállítások</p>

    <div class="wizard-form-card">
      <label class="wizard-field-label">Játéktípus</label>
      <q-select
        :model-value="modelValue.ptaGameTypeId"
        :options="gameTypeOptions"
        emit-value
        map-options
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        :disable="!gameTypeOptions.length"
        :hint="gameTypeHint"
        @update:model-value="(v) => patch({ ptaGameTypeId: toId(v) })"
      />

      <label class="wizard-field-label">Ültetés módja</label>
      <q-select
        :model-value="modelValue.ptaPairModeId"
        :options="pairModeOptions"
        emit-value
        map-options
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        :disable="!pairModeOptions.length"
        :hint="pairModeHint"
        @update:model-value="(v) => patch({ ptaPairModeId: toId(v) })"
      />

      <label class="wizard-field-label">Kategória</label>
      <div class="pta-stars" role="radiogroup" aria-label="Kategória">
        <button
          v-for="n in 4"
          :key="n"
          type="button"
          class="pta-stars__btn"
          :class="{ 'is-on': modelValue.ptaCategory === n }"
          :aria-pressed="modelValue.ptaCategory === n"
          :aria-label="n + ' csillag'"
          @click="patch({ ptaCategory: n })"
        >
          <q-icon v-for="s in n" :key="s" name="star" size="16px" />
        </button>
      </div>

      <div class="pta-option" :class="{ 'is-on': modelValue.ptaChampionshipFlg }">
        <button
          type="button"
          class="pta-option__head"
          role="switch"
          :aria-checked="modelValue.ptaChampionshipFlg"
          @click="onChampionshipFlg(!modelValue.ptaChampionshipFlg)"
        >
          <span class="pta-option__icon" aria-hidden="true">
            <q-icon name="emoji_events" size="20px" />
          </span>
          <span class="pta-option__text">
            <span class="pta-option__title">Bajnokság</span>
            <span class="pta-option__hint">Az esemény egy bajnoksághoz tartozik</span>
          </span>
          <span class="pta-switch" aria-hidden="true" />
        </button>
        <div v-if="modelValue.ptaChampionshipFlg" class="pta-option__body">
          <q-select
            :model-value="modelValue.ptaChampionshipId"
            :options="championshipOptions"
            emit-value
            map-options
            dark
            outlined
            dense
            class="wizard-field"
            color="brand-primary"
            :disable="!championshipOptions.length"
            :hint="championshipHint"
            placeholder="Válassz bajnokságot"
            @update:model-value="(v) => patch({ ptaChampionshipId: toId(v) })"
          />
        </div>
      </div>
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Pontozás (helyezés → pont)</label>
      <div class="pta-points">
        <div v-for="slot in pointSlots" :key="slot.key" class="pta-points__item">
          <label class="wizard-field-label">{{ slot.label }}</label>
          <q-input
            :model-value="modelValue[slot.key]"
            dark
            outlined
            dense
            type="number"
            min="0"
            class="wizard-field"
            color="brand-primary"
            @update:model-value="(v) => patch({ [slot.key]: toInt(v, slot.fallback) })"
          />
        </div>
      </div>
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Létszám</label>
      <label class="wizard-field-label">Max. játékosok <span class="wizard-field-optional">(opcionális)</span></label>
      <q-input
        :model-value="maxPlayersDisplay"
        dark
        outlined
        dense
        type="number"
        min="1"
        placeholder="Korlátlan"
        class="wizard-field"
        color="brand-primary"
        hint="Külön a jegy kapacitástól — a játszók felső határa"
        @update:model-value="(v) => patch({ ptaMaxParticipants: toId(v) })"
      />
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Csoportosítás</label>
      <div class="pta-groups">
        <q-toggle
          :model-value="modelValue.ptaOrganizationGrpFlg"
          label="Szervezet"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaOrganizationGrpFlg: !!v })"
        />
        <q-toggle
          :model-value="modelValue.ptaTeamGrpFlg"
          label="Csapat"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaTeamGrpFlg: !!v })"
        />
        <q-toggle
          :model-value="modelValue.ptaRegionGrpFlg"
          label="Régió"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaRegionGrpFlg: !!v })"
        />
        <q-toggle
          :model-value="modelValue.ptaCompanyGrpFlg"
          label="Cég"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaCompanyGrpFlg: !!v })"
        />
      </div>
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Egyéb</label>
      <div class="wizard-toggle-row">
        <q-toggle
          :model-value="modelValue.ptaPhotoUploadMandatoryFlg"
          label="Fotó feltöltése kötelező"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaPhotoUploadMandatoryFlg: !!v })"
        />
      </div>
      <div class="pta-option" :class="{ 'is-on': modelValue.ptaExtraPrizeFlg }">
        <button
          type="button"
          class="pta-option__head"
          role="switch"
          :aria-checked="modelValue.ptaExtraPrizeFlg"
          @click="onExtraPrizeFlg(!modelValue.ptaExtraPrizeFlg)"
        >
          <span class="pta-option__icon" aria-hidden="true">
            <q-icon name="workspace_premium" size="20px" />
          </span>
          <span class="pta-option__text">
            <span class="pta-option__title">Extra díjak</span>
            <span class="pta-option__hint">További díjak a helyezéseken túl</span>
          </span>
          <span class="pta-switch" aria-hidden="true" />
        </button>
        <div v-if="modelValue.ptaExtraPrizeFlg" class="pta-option__body">
          <q-select
            :model-value="modelValue.ptaExtraPrizeIds"
            :options="extraPrizeOptions"
            emit-value
            map-options
            multiple
            use-chips
            dark
            outlined
            dense
            class="wizard-field wizard-field--chips"
            color="brand-primary"
            :disable="!extraPrizeOptions.length"
            :hint="extraPrizeHint"
            placeholder="Válassz extra díjakat"
            @update:model-value="onExtraPrizeIds"
          />
        </div>
      </div>
      <div class="wizard-toggle-row">
        <q-toggle
          :model-value="modelValue.ptaShowUserPositionFlg"
          label="Játékos pozíció látható"
          color="brand-primary"
          dark
          dense
          @update:model-value="(v) => patch({ ptaShowUserPositionFlg: !!v })"
        />
      </div>
    </div>

    <div class="wizard-step-nav">
      <button type="button" class="wizard-btn wizard-btn--ghost" @click="$emit('back')">Vissza</button>
      <button type="button" class="wizard-btn wizard-btn--primary" @click="submit">Tovább</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useMasterDataStore } from 'src/stores/masterData';
import { resolveTypeIcon } from '../groupIcons';
import WizardModeIcon from '../WizardModeIcon.vue';
import { isPtaSettingsComplete, type WizardBasics, type WizardMode } from '../types';

const props = defineProps<{
  modelValue: WizardBasics;
  typeName: string;
  typeIcon?: string;
  mode?: WizardMode;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: WizardBasics): void;
  (e: 'back'): void;
  (e: 'next'): void;
}>();

const $q = useQuasar();
const masterData = useMasterDataStore();
const typeIconResolved = computed(() => resolveTypeIcon(props.typeIcon));

const pointSlots = [
  { key: 'ptaPoint1' as const, label: '1. hely', fallback: 8 },
  { key: 'ptaPoint2' as const, label: '2. hely', fallback: 4 },
  { key: 'ptaPoint3' as const, label: '3. hely', fallback: 2 },
  { key: 'ptaPoint4' as const, label: '4. hely', fallback: 0 },
];

const gameTypeOptions = computed(() =>
  (masterData.ptaGameTypes || []).map((row) => ({
    label: row.GName,
    value: row.id,
  }))
);

const pairModeOptions = computed(() =>
  (masterData.ptaPairModes || []).map((row) => ({
    label: row.PName,
    value: row.id,
  }))
);

const selectedRounds = computed(() =>
  masterData.getPtaRoundsForGameType(props.modelValue.ptaGameTypeId)
);

const gameTypeHint = computed(() => {
  if (!gameTypeOptions.value.length) return 'Nincs játéktípus a masterben';
  const n = selectedRounds.value.length;
  if (!n) return undefined;
  const names = selectedRounds.value.map((r) => r.RName).join(', ');
  return `${n} forduló: ${names}`;
});

const pairModeHint = computed(() => {
  if (!pairModeOptions.value.length) return 'Nincs ültetési mód a masterben';
  const mode = masterData.getPtaPairModeById(Number(props.modelValue.ptaPairModeId));
  if (!mode) return undefined;
  if (mode.FixedGroupFlg) return 'Fix csoportosítás';
  if (mode.SameGroupFlg) return 'Azonos csoportból ültet';
  return 'Véletlen ültetés';
});

const championshipOptions = computed(() =>
  (masterData.ptaChampionships || []).map((row) => ({
    label: row.CName,
    value: row.id,
  }))
);

const extraPrizeOptions = computed(() =>
  (masterData.ptaExtraPrizes || []).map((row) => ({
    label: row.PName,
    value: row.id,
  }))
);

const championshipHint = computed(() => {
  if (!championshipOptions.value.length) return 'Nincs bajnokság a masterben';
  return 'Egy bajnokságot lehet választani';
});

const extraPrizeHint = computed(() => {
  if (!extraPrizeOptions.value.length) return 'Nincs extra díj a masterben';
  return 'Több díj is kiválasztható';
});

const maxPlayersDisplay = computed(() =>
  props.modelValue.ptaMaxParticipants == null ? '' : props.modelValue.ptaMaxParticipants
);

function toId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toInt(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function patch(partial: Partial<WizardBasics>) {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}

function onChampionshipFlg(on: boolean) {
  if (!on) {
    patch({ ptaChampionshipFlg: false, ptaChampionshipId: null });
    return;
  }
  const options = championshipOptions.value;
  const current = props.modelValue.ptaChampionshipId;
  const keep = options.some((o) => o.value === current)
    ? current
    : options.length === 1
      ? options[0].value
      : null;
  patch({ ptaChampionshipFlg: true, ptaChampionshipId: keep });
}

function onExtraPrizeFlg(on: boolean) {
  if (!on) {
    patch({ ptaExtraPrizeFlg: false, ptaExtraPrizeIds: [] });
    return;
  }
  patch({ ptaExtraPrizeFlg: true });
}

function onExtraPrizeIds(value: unknown) {
  const ids = Array.isArray(value)
    ? value.map((v) => toId(v)).filter((n): n is number => n != null)
    : [];
  patch({ ptaExtraPrizeIds: ids });
}

function submit() {
  if (!isPtaSettingsComplete(props.modelValue)) {
    const b = props.modelValue;
    let message = 'Válaszd ki a játéktípust, az ültetés módját, a kategóriát és a pontokat.';
    if (b.ptaChampionshipFlg && b.ptaChampionshipId == null) {
      message = 'Válassz egy bajnokságot.';
    } else if (b.ptaExtraPrizeFlg && !(b.ptaExtraPrizeIds || []).length) {
      message = 'Válassz legalább egy extra díjat.';
    }
    $q.notify({
      message,
      color: 'warning',
      position: 'top',
    });
    return;
  }
  emit('next');
}
</script>

<style scoped>
.pta-points {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 8px;
}

.pta-points__item .wizard-field-label {
  margin-top: 0;
}

@media (min-width: 520px) {
  .pta-points {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.pta-stars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 8px 0 14px;
}

.pta-stars__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1px;
  min-height: 44px;
  padding: 8px 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #64748b;
  cursor: pointer;
}

.pta-stars__btn.is-on {
  border-color: rgba(56, 189, 248, 0.55);
  background: rgba(14, 165, 233, 0.2);
  color: #fbbf24;
}

.pta-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin-top: 8px;
}

.pta-option {
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease;
}

.pta-option.is-on {
  border-color: rgba(56, 189, 248, 0.55);
  background: rgba(14, 165, 233, 0.12);
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.08);
}

.pta-option__head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pta-option__icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.pta-option.is-on .pta-option__icon {
  background: rgba(14, 165, 233, 0.28);
  color: #7dd3fc;
}

.pta-option__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 2px;
}

.pta-option__title {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.pta-option__hint {
  font-size: 12px;
  line-height: 1.35;
  color: #94a3b8;
}

.pta-switch {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.28);
  transition: background 0.16s ease;
}

.pta-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.16s ease;
}

.pta-option.is-on .pta-switch {
  background: #38bdf8;
}

.pta-option.is-on .pta-switch::after {
  transform: translateX(18px);
}

.pta-option__body {
  padding: 0 12px 12px;
}
</style>
