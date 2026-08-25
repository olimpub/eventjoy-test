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

    <!-- Lista nézet -->
    <template v-if="!editingTempId">
      <div v-if="tickets.length" class="wizard-ticket-list">
        <div
          v-for="(ticket, idx) in tickets"
          :key="ticket.tempId"
          class="wizard-ticket-summary"
          role="button"
          tabindex="0"
          @click="editTicket(ticket.tempId)"
          @keyup.enter="editTicket(ticket.tempId)"
        >
          <div class="wizard-ticket-summary__body">
            <div class="wizard-ticket-summary__row">
              <div class="wizard-ticket-summary__left">
                <div class="wizard-ticket-summary__title">
                  {{ ticket.TicketName.trim() || `Jegy ${idx + 1}` }}
                </div>
                <div class="wizard-ticket-summary__tags">
                  <span
                    class="wizard-status-chip"
                    :class="ticket.ActiveFlg ? 'is-active' : 'is-inactive'"
                  >
                    {{ ticket.ActiveFlg ? 'Aktív' : 'Inaktív' }}
                  </span>
                  <span
                    v-if="ticket.ActiveFlg"
                    class="wizard-status-chip"
                    :class="regStatusClass(ticket)"
                  >
                    Regisztráció: {{ regStatusLabel(ticket) }}
                  </span>
                  <span v-if="templateLabel(ticket)" class="wizard-status-chip is-active">
                    {{ templateLabel(ticket) }}
                  </span>
                </div>
              </div>
              <div class="wizard-ticket-summary__price">{{ priceLabel(ticket) }}</div>
            </div>

            <div class="wizard-ticket-summary__row wizard-ticket-summary__row--second">
              <div class="wizard-ticket-summary__roles">
                {{ rolesLabel(ticket) }}
              </div>
              <button
                type="button"
                class="wizard-ticket-stock-btn"
                :title="stockTitle(ticket)"
                @click.stop="onStockClick(ticket.tempId)"
              >
                <q-icon name="sym_r_confirmation_number" size="16px" />
                <span>{{ stockLabel(ticket) }}</span>
                <q-icon name="chevron_right" size="16px" class="wizard-ticket-stock-btn__chevron" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-else class="wizard-field-hint" style="margin: 0;">Még nincs jegy — add hozzá az elsőt.</p>

      <button
        type="button"
        class="wizard-btn wizard-btn--dashed"
        :disabled="!interactReady"
        @click="startNewTicket"
      >
        <q-icon name="sym_r_confirmation_number" size="20px" />
        Új jegy
      </button>

      <div class="wizard-step-nav">
        <button type="button" class="wizard-btn wizard-btn--ghost" @click="$emit('back')">Vissza</button>
        <button type="button" class="wizard-btn wizard-btn--primary" @click="submit">Kész</button>
      </div>
    </template>

    <!-- Szerkesztő / új jegy form -->
    <template v-else-if="editingTicket">
      <div class="wizard-form-card wizard-ticket-card">
        <div class="wizard-form-card__head">
          <label class="wizard-field-label" style="margin: 0;">
            {{ isNewDraft ? 'Új jegy' : 'Jegy szerkesztése' }}
          </label>
          <button
            type="button"
            class="wizard-icon-btn wizard-icon-btn--danger wizard-icon-btn--lg"
            aria-label="Jegy törlése"
            @click="removeTicket(editingTicket.tempId)"
          >
            <q-icon name="sym_r_delete" size="26px" />
          </button>
        </div>

        <p class="wizard-ticket-code">{{ editingTicket.Code }}</p>

        <label class="wizard-field-label">Jegy neve *</label>
        <q-input
          :model-value="editingTicket.TicketName"
          dark outlined dense
          class="wizard-field"
          color="brand-primary"
          @update:model-value="(v) => updateTicket(editingTicket.tempId, 'TicketName', String(v ?? ''))"
        />

        <label class="wizard-field-label">Leírás</label>
        <q-input
          :model-value="editingTicket.Description"
          dark outlined dense
          type="textarea"
          autogrow
          class="wizard-field"
          color="brand-primary"
          @update:model-value="(v) => updateTicket(editingTicket.tempId, 'Description', String(v ?? ''))"
        />

        <label class="wizard-field-label">Szerepkörök *</label>
        <q-select
          :model-value="editingTicket.roleTempIds"
          :options="roleOptionsForTicket"
          emit-value
          map-options
          multiple
          use-chips
          dark outlined dense
          class="wizard-field wizard-field--chips"
          color="brand-primary"
          :disable="!roleOptionsForTicket.length"
          @update:model-value="(v) => updateTicketRoles(editingTicket.tempId, v)"
        />
        <p v-if="!roleOptionsForTicket.length" class="wizard-field-hint">
          Adj hozzá legalább egy nem szervező szerepkört a korlátozások lépésben — szervezőhöz nincs jegy.
        </p>

        <div class="wizard-toggle-row">
          <q-toggle
            :model-value="editingTicket.isFree"
            label="Díjmentes"
            color="brand-primary"
            dark dense
            @update:model-value="(v) => onFreeToggle(editingTicket.tempId, v)"
          />
        </div>

        <div v-if="!editingTicket.isFree" class="wizard-field-row">
          <div class="wizard-field-grow">
            <label class="wizard-field-label">Ár *</label>
            <q-input
              :model-value="editingTicket.Price == null ? '' : editingTicket.Price"
              dark outlined dense
              type="number"
              min="0"
              class="wizard-field"
              color="brand-primary"
              @update:model-value="(v) => updateTicketPrice(editingTicket.tempId, v)"
            />
          </div>
          <div style="width: 88px;">
            <label class="wizard-field-label">Pénznem</label>
            <q-input
              model-value="HUF"
              dark outlined dense
              readonly
              class="wizard-field"
              color="brand-primary"
            />
          </div>
        </div>

        <label class="wizard-field-label">Részvételi folyamat *</label>
        <q-select
          v-if="templateOptions.length > 1"
          :model-value="editingTicket.TemplateID"
          :options="templateOptions"
          emit-value
          map-options
          dark outlined dense
          class="wizard-field"
          color="brand-primary"
          :display-value="selectedFlowLabel"
          @update:model-value="(v) => updateTicket(editingTicket.tempId, 'TemplateID', v == null ? null : Number(v))"
        />
        <div v-else class="wizard-flow-name">
          {{ selectedFlowLabel }}
        </div>
        <div v-if="editingFlowStatuses.length" class="wizard-flow-path" aria-label="Folyamat státuszai">
          <template v-for="(status, idx) in editingFlowStatuses" :key="status.id">
            <span v-if="idx" class="wizard-flow-path__sep">–</span>
            <span class="wizard-flow-path__status" :style="{ color: status.color }">{{ status.name }}</span>
          </template>
        </div>
        <p v-if="templateLocked" class="wizard-field-hint">
          Nem nyilvános eseménynél a meghívott folyamat használatos.
        </p>

        <label class="wizard-field-label">Jegyek száma</label>
        <q-input
          :model-value="editingTicket.Capacity == null ? '' : editingTicket.Capacity"
          dark outlined dense
          type="number"
          min="1"
          placeholder="Korlátlan"
          class="wizard-field"
          color="brand-primary"
          @update:model-value="(v) => updateTicketCapacity(editingTicket.tempId, v)"
        />

        <div class="wizard-field-row">
          <div class="wizard-field-grow">
            <label class="wizard-field-label">Regisztráció kezdete *</label>
            <q-input
              :model-value="editingTicket.RegistrationStartDate"
              dark outlined dense readonly
              class="wizard-field"
              color="brand-primary"
            >
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      :model-value="editingTicket.RegistrationStartDate"
                      dark color="brand-primary" mask="YYYY-MM-DD"
                      @update:model-value="(v) => updateTicket(editingTicket.tempId, 'RegistrationStartDate', v || '')"
                    >
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div style="width: 100px;">
            <label class="wizard-field-label">Idő *</label>
            <q-input
              :model-value="editingTicket.RegistrationStartTime"
              dark outlined dense readonly
              class="wizard-field"
              color="brand-primary"
            >
              <template #append>
                <q-icon name="schedule" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-time
                      :model-value="editingTicket.RegistrationStartTime"
                      dark color="brand-primary" format24h mask="HH:mm"
                      @update:model-value="(v) => updateTicket(editingTicket.tempId, 'RegistrationStartTime', v || '00:00')"
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
        </div>

        <div class="wizard-field-row">
          <div class="wizard-field-grow">
            <label class="wizard-field-label">Regisztráció vége *</label>
            <q-input
              :model-value="editingTicket.RegistrationEndDate"
              dark outlined dense readonly
              class="wizard-field"
              color="brand-primary"
            >
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                      :model-value="editingTicket.RegistrationEndDate"
                      dark color="brand-primary" mask="YYYY-MM-DD"
                      @update:model-value="(v) => updateTicket(editingTicket.tempId, 'RegistrationEndDate', v || '')"
                    >
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Kész" color="brand-primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div style="width: 100px;">
            <label class="wizard-field-label">Idő *</label>
            <q-input
              :model-value="editingTicket.RegistrationEndTime"
              dark outlined dense readonly
              class="wizard-field"
              color="brand-primary"
            >
              <template #append>
                <q-icon name="schedule" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-time
                      :model-value="editingTicket.RegistrationEndTime"
                      dark color="brand-primary" format24h mask="HH:mm"
                      @update:model-value="(v) => updateTicket(editingTicket.tempId, 'RegistrationEndTime', v || '23:59')"
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
        </div>

        <div class="wizard-toggle-row">
          <q-toggle
            :model-value="editingTicket.ActiveFlg"
            label="Aktív"
            color="brand-primary"
            dark dense
            @update:model-value="(v) => updateTicket(editingTicket.tempId, 'ActiveFlg', v)"
          />
        </div>
      </div>

      <div class="wizard-step-nav">
        <button type="button" class="wizard-btn wizard-btn--ghost" @click="cancelEdit">Vissza</button>
        <button type="button" class="wizard-btn wizard-btn--primary" @click="saveEdit">Mentés</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useMasterDataStore } from 'src/stores/masterData';
import {
  allowedEventUserFlowCodes,
  catalogCodeOfTemplate,
  catalogFlowStatuses,
  eventUserFlowCatalogEntry,
  eventUserFlowDisplayName,
  findTemplateForCatalogCode,
  type EventUserFlowTemplateCode,
} from 'src/utils/eventUserFlow';
import { resolveTypeIcon } from '../groupIcons';
import {
  combineDateTimeToUtcIso,
  createEmptyTicket,
  type WizardBasics,
  type WizardMode,
  type WizardTicket,
} from '../types';
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
const masterDataStore = useMasterDataStore();
const typeIconResolved = computed(() => resolveTypeIcon(props.typeIcon));

/** Előző lépés Tovább kattintása ne nyissa az Új jegy gombot */
const interactReady = ref(false);

const tickets = ref<WizardTicket[]>(
  (props.modelValue.tickets || []).filter((t) => t.TicketName.trim() || t.Description.trim())
);
const editingTempId = ref<string | null>(null);
const draftTempIds = ref<Set<string>>(new Set());

// Üres, félbehagyott draftok ne maradjanak a listában / ne nyissanak formot
if (tickets.value.length !== (props.modelValue.tickets || []).length) {
  props.modelValue.tickets = tickets.value.map((t) => ({
    ...t,
    roleTempIds: [...t.roleTempIds],
  }));
  emit('update:modelValue', {
    ...props.modelValue,
    tickets: props.modelValue.tickets,
  });
}

onMounted(() => {
  syncPrivateTemplates();
  window.setTimeout(() => {
    interactReady.value = true;
  }, 400);
});

const editingTicket = computed(() =>
  tickets.value.find((t) => t.tempId === editingTempId.value) || null
);

const isNewDraft = computed(() =>
  !!editingTempId.value && draftTempIds.value.has(editingTempId.value)
);

const roleOptionsForTicket = computed(() =>
  (props.modelValue.roles || [])
    .filter((r) => !masterDataStore.isOrganizerRole(r.RoleID))
    .map((r) => ({
      label: r.ActiveFlg ? r.roleName : `${r.roleName} (inaktív)`,
      value: r.tempId,
    }))
);

const isPrivateEvent = computed(() => !props.modelValue.publicFlg);
const templateLocked = computed(() => isPrivateEvent.value);

function flowCodeByTemplateId(templateId: number | null | undefined): string {
  if (templateId == null) return '';
  const hit = (masterDataStore.eventUserFlowTemplates || []).find(
    (t) => Number(t.id) === Number(templateId)
  );
  return catalogCodeOfTemplate(hit) || String(hit?.Code || '').trim().toUpperCase();
}

function templateIdByCode(code: EventUserFlowTemplateCode): number | null {
  return findTemplateForCatalogCode(masterDataStore.eventUserFlowTemplates, code)?.id ?? null;
}

const templateOptions = computed(() => {
  const ticket = editingTicket.value;
  if (!ticket) return [];
  const codes = allowedEventUserFlowCodes({
    publicFlg: !isPrivateEvent.value,
    isFree: ticket.isFree,
  });
  return codes
    .map((code) => {
      const id = templateIdByCode(code);
      const entry = eventUserFlowCatalogEntry(code);
      if (id == null || !entry) return null;
      return { label: entry.label, value: id };
    })
    .filter((row): row is { label: string; value: number } => !!row);
});

const selectedFlowLabel = computed(() => {
  const ticket = editingTicket.value;
  if (!ticket) return '';
  const opt = templateOptions.value.find((row) => Number(row.value) === Number(ticket.TemplateID));
  if (opt) return opt.label;
  const codes = allowedEventUserFlowCodes({
    publicFlg: !isPrivateEvent.value,
    isFree: ticket.isFree,
  });
  const current = flowCodeByTemplateId(ticket.TemplateID);
  if (codes.includes(current as EventUserFlowTemplateCode)) {
    return eventUserFlowDisplayName(current);
  }
  return eventUserFlowDisplayName(codes[0]);
});

function defaultTemplateId(isFree: boolean): number | null {
  return masterDataStore.getDefaultEventUserFlowTemplateId(!isPrivateEvent.value, isFree);
}

function templateLabel(ticket: WizardTicket): string {
  return eventUserFlowDisplayName(flowCodeByTemplateId(ticket.TemplateID));
}

const editingFlowStatuses = computed(() => {
  const ticket = editingTicket.value;
  if (!ticket) return [];
  const codes = allowedEventUserFlowCodes({
    publicFlg: !isPrivateEvent.value,
    isFree: ticket.isFree,
  });
  let code = flowCodeByTemplateId(ticket.TemplateID);
  if (!codes.includes(code as EventUserFlowTemplateCode)) code = codes[0];
  return catalogFlowStatuses(code, masterDataStore.eventUserStatuses);
});

watch(
  () => [editingTicket.value?.tempId, editingTicket.value?.isFree, isPrivateEvent.value] as const,
  () => {
    const t = editingTicket.value;
    if (!t) return;
    const allowed = templateOptions.value;
    if (!allowed.length) return;
    if (allowed.some((row) => Number(row.value) === Number(t.TemplateID))) return;
    t.TemplateID = defaultTemplateId(t.isFree) ?? allowed[0].value;
    emitUpdate();
  }
);

function syncTicketTemplates() {
  let changed = false;
  for (const t of tickets.value) {
    const codes = allowedEventUserFlowCodes({
      publicFlg: !isPrivateEvent.value,
      isFree: t.isFree,
    });
    const code = flowCodeByTemplateId(t.TemplateID);
    if (codes.includes(code as EventUserFlowTemplateCode)) continue;
    const next = defaultTemplateId(t.isFree) ?? templateIdByCode(codes[0]);
    if (next != null && t.TemplateID !== next) {
      t.TemplateID = next;
      changed = true;
    }
  }
  if (changed) emitUpdate();
}

function syncPrivateTemplates() {
  syncTicketTemplates();
}

function priceLabel(ticket: WizardTicket): string {
  if (ticket.isFree || ticket.Price === 0) return 'Díjmentes';
  if (ticket.Price == null) return 'Ár nincs megadva';
  return `${ticket.Price.toLocaleString('hu-HU')} ${ticket.CurrencyCode}`;
}

/** Új eseménynél még 0 az eladott; később API-ból jön */
function soldCount(_ticket: WizardTicket): number {
  return 0;
}

function stockLabel(ticket: WizardTicket): string {
  const sold = soldCount(ticket);
  if (ticket.Capacity == null) return `${sold} / ∞`;
  return `${sold} / ${ticket.Capacity}`;
}

function stockTitle(ticket: WizardTicket): string {
  const sold = soldCount(ticket);
  if (ticket.Capacity == null) return `${sold} eladva · korlátlan`;
  return `${sold} eladva / ${ticket.Capacity} összesen`;
}

type RegStatus = 'open' | 'soon' | 'ended' | 'unknown';

function registrationStatus(ticket: WizardTicket): RegStatus {
  const startIso = combineDateTimeToUtcIso(ticket.RegistrationStartDate, ticket.RegistrationStartTime);
  const endIso = combineDateTimeToUtcIso(ticket.RegistrationEndDate, ticket.RegistrationEndTime);
  if (!startIso || !endIso) return 'unknown';
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'unknown';
  if (now < start) return 'soon';
  if (now > end) return 'ended';
  return 'open';
}

function regStatusLabel(ticket: WizardTicket): string {
  switch (registrationStatus(ticket)) {
    case 'open':
      return 'Nyitott';
    case 'soon':
      return 'Hamarosan';
    case 'ended':
      return 'Lejárt';
    default:
      return '—';
  }
}

function regStatusClass(ticket: WizardTicket): string {
  switch (registrationStatus(ticket)) {
    case 'open':
      return 'is-reg-open';
    case 'soon':
      return 'is-reg-soon';
    case 'ended':
      return 'is-reg-ended';
    default:
      return 'is-reg-unknown';
  }
}

function rolesLabel(ticket: WizardTicket): string {
  const roles = props.modelValue.roles || [];
  const names = ticket.roleTempIds
    .map((id) => roles.find((r) => r.tempId === id)?.roleName)
    .filter(Boolean) as string[];
  if (!names.length) return 'Nincs szerepkör';
  return names.join(' · ');
}

function onStockClick(_tempId: string) {
  // Később: jegyértékesítés / résztvevők lista
  $q.notify({
    message: 'A jegyfogyás részletei hamarosan elérhetők.',
    color: 'dark',
    textColor: 'sky-3',
    position: 'top',
    timeout: 2000,
  });
}

function emitUpdate() {
  props.modelValue.tickets = tickets.value.map((t) => ({
    ...t,
    roleTempIds: [...t.roleTempIds],
  }));
  emit('update:modelValue', {
    ...props.modelValue,
    tickets: props.modelValue.tickets,
  });
}

function startNewTicket() {
  if (!interactReady.value) return;
  if (!roleOptionsForTicket.value.length) {
    $q.notify({
      message: 'Adj hozzá legalább egy nem szervező szerepkört, mielőtt jegyet készítesz!',
      color: 'warning',
      position: 'top',
    });
    return;
  }
  const nextIndex = tickets.value.length + 1;
  const t = createEmptyTicket(props.modelValue.eventUid, nextIndex, {
    RegistrationStartDate: props.modelValue.startDate || '',
    RegistrationEndDate: props.modelValue.endDate || props.modelValue.startDate || '',
    RegistrationStartTime: '00:00',
    RegistrationEndTime: props.modelValue.startTime || '23:59',
  });
  const firstActive = (props.modelValue.roles || []).find(
    (r) => r.ActiveFlg && !masterDataStore.isOrganizerRole(r.RoleID)
  );
  if (firstActive) t.roleTempIds = [firstActive.tempId];
  t.TemplateID = defaultTemplateId(t.isFree);
  tickets.value.push(t);
  draftTempIds.value.add(t.tempId);
  editingTempId.value = t.tempId;
  emitUpdate();
}

function editTicket(tempId: string) {
  if (!interactReady.value) return;
  editingTempId.value = tempId;
}

function closeEditor() {
  editingTempId.value = null;
}

function cancelEdit() {
  const id = editingTempId.value;
  if (id && draftTempIds.value.has(id)) {
    const t = tickets.value.find((x) => x.tempId === id);
    // Üres új jegy: Vissza törli
    if (t && !t.TicketName.trim()) {
      tickets.value = tickets.value.filter((x) => x.tempId !== id);
      draftTempIds.value.delete(id);
      emitUpdate();
    } else {
      draftTempIds.value.delete(id);
    }
  }
  closeEditor();
}

function validateOne(t: WizardTicket, label: string): boolean {
  if (!t.TicketName.trim()) {
    $q.notify({ message: `${label}: add meg a jegy nevét!`, color: 'warning', position: 'top' });
    return false;
  }
  if (!t.roleTempIds.length) {
    $q.notify({ message: `${label}: válassz legalább egy szerepkört!`, color: 'warning', position: 'top' });
    return false;
  }
  if (t.TemplateID == null) {
    $q.notify({
      message: `${label}: válaszd ki a részvételi folyamatot!`,
      color: 'warning',
      position: 'top',
    });
    return false;
  }
  if (!t.isFree && (t.Price == null || t.Price < 0)) {
    $q.notify({ message: `${label}: add meg az árat, vagy jelöld díjmentesnek!`, color: 'warning', position: 'top' });
    return false;
  }
  if (!t.RegistrationStartDate || !t.RegistrationEndDate) {
    $q.notify({ message: `${label}: add meg a regisztrációs időszakot!`, color: 'warning', position: 'top' });
    return false;
  }
  const startIso = combineDateTimeToUtcIso(t.RegistrationStartDate, t.RegistrationStartTime);
  const endIso = combineDateTimeToUtcIso(t.RegistrationEndDate, t.RegistrationEndTime);
  if (startIso && endIso && endIso < startIso) {
    $q.notify({ message: `${label}: a regisztráció vége nem lehet a kezdete előtt!`, color: 'warning', position: 'top' });
    return false;
  }
  return true;
}

function saveEdit() {
  const t = editingTicket.value;
  if (!t) {
    closeEditor();
    return;
  }
  if (!validateOne(t, t.TicketName.trim() || 'Jegy')) return;
  draftTempIds.value.delete(t.tempId);
  emitUpdate();
  closeEditor();
}

function removeTicket(tempId: string) {
  tickets.value = tickets.value.filter((t) => t.tempId !== tempId);
  draftTempIds.value.delete(tempId);
  if (editingTempId.value === tempId) closeEditor();
  emitUpdate();
}

function updateTicket<K extends keyof WizardTicket>(tempId: string, key: K, value: WizardTicket[K]) {
  const t = tickets.value.find((x) => x.tempId === tempId);
  if (!t) return;
  t[key] = value;
  emitUpdate();
}

function updateTicketRoles(tempId: string, ids: string[] | null) {
  updateTicket(tempId, 'roleTempIds', ids || []);
}

function onFreeToggle(tempId: string, isFree: boolean) {
  const t = tickets.value.find((x) => x.tempId === tempId);
  if (!t) return;
  t.isFree = isFree;
  if (isFree) t.Price = 0;
  else if (t.Price === 0) t.Price = null;
  const allowed = allowedEventUserFlowCodes({
    publicFlg: !isPrivateEvent.value,
    isFree,
  });
  const code = flowCodeByTemplateId(t.TemplateID);
  if (!allowed.includes(code as (typeof allowed)[number])) {
    t.TemplateID = defaultTemplateId(isFree);
  }
  emitUpdate();
}

function updateTicketPrice(tempId: string, val: string | number | null) {
  const t = tickets.value.find((x) => x.tempId === tempId);
  if (!t) return;
  if (val === '' || val === null || val === undefined) {
    t.Price = null;
  } else {
    const n = Number(val);
    t.Price = Number.isFinite(n) && n >= 0 ? n : null;
  }
  emitUpdate();
}

function updateTicketCapacity(tempId: string, val: string | number | null) {
  const t = tickets.value.find((x) => x.tempId === tempId);
  if (!t) return;
  if (val === '' || val === null || val === undefined) {
    t.Capacity = null;
  } else {
    const n = Number(val);
    t.Capacity = Number.isFinite(n) && n > 0 ? n : null;
  }
  emitUpdate();
}

function validate(): boolean {
  if (!tickets.value.length) {
    $q.notify({ message: 'Adj hozzá legalább egy jegyet!', color: 'warning', position: 'top' });
    return false;
  }
  for (let i = 0; i < tickets.value.length; i++) {
    const t = tickets.value[i];
    const label = t.TicketName.trim() || `Jegy ${i + 1}`;
    if (!validateOne(t, label)) return false;
  }
  return true;
}

function submit() {
  if (!validate()) return;
  emitUpdate();
  emit('next');
}
</script>
