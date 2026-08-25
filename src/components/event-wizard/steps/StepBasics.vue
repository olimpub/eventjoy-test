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
      <span v-if="basics.title" class="wizard-chip wizard-chip--title">
        <q-icon name="sym_r_edit_calendar" size="16px" />
        {{ basics.title }}
      </span>
    </div>

    <p class="wizard-step__hint">Add meg az esemény alapadatait</p>

    <div class="wizard-form-card">
      <label class="wizard-field-label">Esemény címe *</label>
      <q-input
        v-model="basics.title"
        dark
        outlined
        dense
        maxlength="300"
        placeholder="Pl. Budapest Tech Meetup 2026"
        class="wizard-field"
        color="brand-primary"
        @update:model-value="emitUpdate"
      />

      <label class="wizard-field-label">Leírás</label>
      <q-input
        v-model="basics.description"
        dark
        outlined
        dense
        type="textarea"
        autogrow
        :input-style="descFocused ? 'min-height: 80px' : 'min-height: 36px; max-height: 36px; overflow: hidden'"
        placeholder="Rövid leírás a résztvevőknek..."
        class="wizard-field"
        color="brand-primary"
        @focus="descFocused = true"
        @blur="descFocused = false"
        @update:model-value="emitUpdate"
      />
    </div>

  <!-- Időpont -->
    <div class="wizard-form-card">
      <div class="wizard-form-card__head">
        <label class="wizard-field-label" style="margin: 0;">Időpont</label>
        <q-toggle
          v-model="basics.isMultiDay"
          label="Többnapos"
          color="brand-primary"
          dark
          dense
          @update:model-value="onMultiDayToggle"
        />
      </div>

      <div v-if="!basics.isMultiDay" class="wizard-field-row">
        <div class="wizard-field-grow">
          <label class="wizard-field-label">Dátum *</label>
          <q-input
            v-model="basics.startDate"
            dark
            outlined
            dense
            readonly
            class="wizard-field"
            color="brand-primary"
          >
            <template #append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="basics.startDate" dark color="brand-primary" mask="YYYY-MM-DD" @update:model-value="onSingleDateChange">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
      </div>

      <div v-else class="wizard-field-row">
        <div class="wizard-field-grow">
          <label class="wizard-field-label">Dátumtartam *</label>
          <q-input
            :model-value="dateRangeLabel"
            dark
            outlined
            dense
            readonly
            class="wizard-field"
            color="brand-primary"
          >
            <template #append>
              <q-icon name="date_range" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateRange" range dark color="brand-primary" mask="YYYY-MM-DD" @update:model-value="onRangeChange">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
      </div>

      <div class="wizard-field-row">
        <div class="wizard-field-grow">
          <label class="wizard-field-label">Kezdés *</label>
          <q-input v-model="basics.startTime" dark outlined dense readonly class="wizard-field" color="brand-primary">
            <template #append>
              <q-icon name="schedule" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="basics.startTime" dark color="brand-primary" format24h mask="HH:mm" @update:model-value="emitUpdate">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="wizard-field-grow">
          <label class="wizard-field-label">Befejezés *</label>
          <q-input v-model="basics.endTime" dark outlined dense readonly class="wizard-field" color="brand-primary">
            <template #append>
              <q-icon name="schedule" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-time v-model="basics.endTime" dark color="brand-primary" format24h mask="HH:mm" @update:model-value="emitUpdate">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                    </div>
                  </q-time>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </div>
      </div>
    </div>

    <!-- Helyszín -->
    <div class="wizard-form-card">
      <div class="wizard-form-card__head">
        <label class="wizard-field-label" style="margin: 0;">Helyszín</label>
        <q-toggle
          :model-value="isOnline"
          label="Online esemény"
          color="brand-primary"
          dark
          dense
          @update:model-value="onOnlineToggle"
        />
      </div>

      <template v-if="!isOnline">
        <!-- Keresés meglévő helyszínek között -->
        <template v-if="!showNewLocationForm">
          <q-select
            :model-value="selectedLocationId"
            :options="locationOptions"
            emit-value
            map-options
            use-input
            input-debounce="200"
            dark
            outlined
            dense
            clearable
            placeholder="Helyszín keresése..."
            class="wizard-field"
            color="brand-primary"
            @filter="filterLocations"
            @update:model-value="onLocationSelected"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">Nincs találat</q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Kiválasztott helyszín adatok -->
          <div v-if="selectedLocationDetail" class="wizard-location-detail">
            <q-icon name="sym_r_location_on" size="18px" color="brand-primary" />
            <div>
              <div class="wizard-location-detail__name">{{ selectedLocationDetail.name }}</div>
              <div class="wizard-location-detail__addr">{{ selectedLocationDetail.address }}</div>
            </div>
          </div>

          <button type="button" class="wizard-btn wizard-btn--dashed" @click="startNewLocation">
            <q-icon name="sym_r_add_location_alt" size="20px" />
            Új helyszín
          </button>
        </template>

        <!-- Új helyszín form -->
        <template v-else>
          <div class="wizard-new-loc-head">
            <label class="wizard-field-label" style="margin:0;">Új helyszín</label>
            <button type="button" class="wizard-btn-link" @click="cancelNewLocation">
              <q-icon name="sym_r_close" size="16px" />
              Mégse
            </button>
          </div>

          <label class="wizard-field-label">Helyszín neve *</label>
          <q-input
            :model-value="modelValue.newLocation.LocationName"
            dark outlined dense
            placeholder="Pl. Bálna Budapest"
            class="wizard-field"
            color="brand-primary"
            @update:model-value="(v) => updateNewLocationField('LocationName', v)"
          />
          <div class="wizard-field-row">
            <div class="wizard-field-grow">
              <label class="wizard-field-label">Város *</label>
              <q-input
                :model-value="modelValue.newLocation.City"
                dark outlined dense
                placeholder="Budapest"
                class="wizard-field"
                color="brand-primary"
                @update:model-value="(v) => updateNewLocationField('City', v)"
              />
            </div>
            <div style="width: 72px;">
              <label class="wizard-field-label">Ország</label>
              <q-input
                :model-value="modelValue.newLocation.CountryCode"
                dark outlined dense
                class="wizard-field"
                color="brand-primary"
                @update:model-value="(v) => updateNewLocationField('CountryCode', v)"
              />
            </div>
          </div>
          <label class="wizard-field-label">Cím</label>
          <q-input
            :model-value="modelValue.newLocation.AddressLine1"
            dark outlined dense
            placeholder="Fővám tér 11-12."
            class="wizard-field"
            color="brand-primary"
            @update:model-value="(v) => updateNewLocationField('AddressLine1', v)"
          />
        </template>
      </template>
      <template v-else>
        <label class="wizard-field-label">Online URL</label>
        <q-input
          :model-value="modelValue.onlineUrl"
          dark
          outlined
          dense
          placeholder="https://meet.google.com/... vagy Teams/Zoom link"
          class="wizard-field"
          color="brand-primary"
          @update:model-value="updateOnlineUrl"
        />
      </template>
    </div>

    <!-- Címkék -->
    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Címkék</label>

      <q-select
        v-model="labelChips"
        :options="labelOptions"
        use-input
        use-chips
        multiple
        input-debounce="150"
        new-value-mode="add-unique"
        dark
        outlined
        dense
        hide-dropdown-icon
        class="wizard-field wizard-field--chips"
        color="brand-primary"
        popup-content-class="wizard-label-menu"
        @filter="filterLabels"
        @update:model-value="onLabelChipsChange"
      >
        <template #no-option>
          <q-item>
            <q-item-section class="text-grey">
              Enter = új címke felvétele
            </q-item-section>
          </q-item>
        </template>
      </q-select>
    </div>

    <div class="wizard-step-nav">
      <button type="button" class="wizard-btn wizard-btn--ghost" @click="$emit('back')">Vissza</button>
      <button type="button" class="wizard-btn wizard-btn--primary" @click="submit">Tovább</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useEventStore } from 'src/stores/event';
import { resolveTypeIcon } from '../groupIcons';
import { entityId, labelName, type WizardBasics, type WizardLabelItem, type WizardMode, type WizardNewLocation } from '../types';
import WizardModeIcon from '../WizardModeIcon.vue';

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
const eventStore = useEventStore();

const basics = computed(() => props.modelValue);

const typeIconResolved = computed(() => resolveTypeIcon(props.typeIcon));

const descFocused = ref(false);
const selectedLocationId = ref<number | null>(props.modelValue.eventLocationId);
const showNewLocationForm = ref(props.modelValue.useNewLocation);
const isOnline = ref(props.modelValue.onlineFlg);
const selectedLabels = ref<WizardLabelItem[]>([...(props.modelValue.labels || [])]);
const labelChips = ref<string[]>(selectedLabels.value.map((l) => l.name));

const catalogLabels = computed(() => {
  // Labels katalógus az /api/event/data Labels tömbjéből
  return (eventStore.labels || []) as any[];
});

const allLabelSuggestions = computed(() => {
  const taken = new Set(labelChips.value.map((n) => n.toLowerCase()));
  return catalogLabels.value
    .map((row) => labelName(row))
    .filter((name) => name && !taken.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'hu'));
});

const labelOptions = ref(allLabelSuggestions.value);

watch(allLabelSuggestions, (opts) => {
  labelOptions.value = opts;
});

const allLocationOptions = computed(() => {
  return (eventStore.locations || []).map((loc: any) => {
    const id = entityId(loc);
    const name = loc.LocationName || loc.Name || 'Névtelen';
    const city = loc.City || '';
    return {
      label: city ? `${name} — ${city}` : name,
      value: id,
    };
  });
});

const locationOptions = ref(allLocationOptions.value);

watch(allLocationOptions, (opts) => {
  locationOptions.value = opts;
});

const dateRange = ref<string | { from: string; to: string } | null>(null);

const dateRangeLabel = computed(() => {
  if (!basics.value.isMultiDay) return '';
  if (basics.value.startDate && basics.value.endDate) {
    return `${basics.value.startDate} → ${basics.value.endDate}`;
  }
  return '';
});

function emitUpdate() {
  emit('update:modelValue', { ...props.modelValue });
}

function updateNewLocationField(field: keyof WizardNewLocation, val: string | number | null) {
  props.modelValue.newLocation[field] = String(val ?? '');
  emitUpdate();
}

function updateOnlineUrl(val: string | number | null) {
  props.modelValue.onlineUrl = String(val ?? '');
  emitUpdate();
}

function onMultiDayToggle() {
  if (!basics.value.isMultiDay) {
    props.modelValue.endDate = props.modelValue.startDate;
    dateRange.value = null;
  } else if (props.modelValue.startDate) {
    dateRange.value = {
      from: props.modelValue.startDate,
      to: props.modelValue.endDate || props.modelValue.startDate,
    };
  }
  emitUpdate();
}

function onSingleDateChange(val: string) {
  props.modelValue.startDate = val;
  props.modelValue.endDate = val;
  emitUpdate();
}

function onRangeChange(val: string | { from: string; to: string } | null) {
  if (!val) return;
  if (typeof val === 'string') {
    props.modelValue.startDate = val;
    props.modelValue.endDate = val;
  } else {
    props.modelValue.startDate = val.from;
    props.modelValue.endDate = val.to;
  }
  emitUpdate();
}

const selectedLocationDetail = computed(() => {
  if (!selectedLocationId.value) return null;
  const loc = (eventStore.locations || []).find(
    (l: any) => entityId(l) === selectedLocationId.value
  );
  if (!loc) return null;
  const name = loc.LocationName || loc.Name || '';
  const parts = [loc.AddressLine1, loc.City, loc.CountryCode].filter(Boolean);
  return { name, address: parts.join(', ') || '—' };
});

function onLocationSelected(val: number | null) {
  selectedLocationId.value = val;
  props.modelValue.eventLocationId = val;
  emitUpdate();
}

function startNewLocation() {
  showNewLocationForm.value = true;
  selectedLocationId.value = null;
  props.modelValue.useNewLocation = true;
  props.modelValue.eventLocationId = null;
  emitUpdate();
}

function cancelNewLocation() {
  showNewLocationForm.value = false;
  props.modelValue.useNewLocation = false;
  props.modelValue.newLocation.LocationName = '';
  props.modelValue.newLocation.City = '';
  props.modelValue.newLocation.AddressLine1 = '';
  props.modelValue.newLocation.CountryCode = 'HU';
  emitUpdate();
}

function onOnlineToggle(val: boolean) {
  isOnline.value = val;
  props.modelValue.onlineFlg = val;
  if (val) {
    selectedLocationId.value = null;
    showNewLocationForm.value = false;
    props.modelValue.eventLocationId = null;
    props.modelValue.useNewLocation = false;
  }
  emitUpdate();
}

function syncLabelsToModel() {
  props.modelValue.labels = selectedLabels.value.map((l) => ({ ...l }));
}

function onLabelChipsChange(names: string[] | null) {
  const list = (names || [])
    .map((n) => String(n || '').trim())
    .filter(Boolean);

  // Dedup case-insensitive, keep first casing
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of list) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name.slice(0, 80));
  }
  labelChips.value = unique;

  selectedLabels.value = unique.map((name) => {
    const existing = catalogLabels.value.find(
      (l) => labelName(l).toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return { id: entityId(existing), name: labelName(existing), isNew: false };
    }
    return { id: null, name, isNew: true };
  });
  syncLabelsToModel();
  emitUpdate();
}

function filterLabels(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase().trim();
    if (!q) {
      labelOptions.value = allLabelSuggestions.value;
      return;
    }
    labelOptions.value = allLabelSuggestions.value.filter((name) =>
      name.toLowerCase().includes(q)
    );
  });
}

function filterLocations(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase().trim();
    if (!q) {
      locationOptions.value = allLocationOptions.value;
      return;
    }
    locationOptions.value = allLocationOptions.value.filter((o) =>
      o.label.toLowerCase().includes(q)
    );
  });
}

function validate(): boolean {
  const b = props.modelValue;
  if (!b.title.trim()) {
    $q.notify({ message: 'Add meg az esemény címét!', color: 'warning', position: 'top' });
    return false;
  }
  if (!b.startDate) {
    $q.notify({ message: 'Válassz dátumot!', color: 'warning', position: 'top' });
    return false;
  }
  if (b.isMultiDay && b.endDate && b.endDate < b.startDate) {
    $q.notify({ message: 'A záró dátum nem lehet korábbi a kezdőnél!', color: 'warning', position: 'top' });
    return false;
  }
  if (!b.isMultiDay && b.startDate === b.endDate && b.endTime <= b.startTime) {
    $q.notify({ message: 'A befejezés ideje későbbi kell legyen, mint a kezdés!', color: 'warning', position: 'top' });
    return false;
  }
  if (!b.onlineFlg) {
    if (b.useNewLocation) {
      if (!b.newLocation.LocationName.trim() || !b.newLocation.City.trim()) {
        $q.notify({ message: 'Az új helyszín neve és városa kötelező!', color: 'warning', position: 'top' });
        return false;
      }
    } else if (!b.eventLocationId) {
      $q.notify({ message: 'Válassz helyszínt, vagy jelöld új helyszínként!', color: 'warning', position: 'top' });
      return false;
    }
  }
  return true;
}

function submit() {
  if (!validate()) return;
  syncLabelsToModel();
  if (!props.modelValue.eventUid) {
    props.modelValue.eventUid = crypto.randomUUID();
  }
  emit('next');
}

</script>
