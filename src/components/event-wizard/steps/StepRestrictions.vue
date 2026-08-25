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

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Kapcsolattartó</label>

      <div class="wizard-contact-kind">
        <button
          type="button"
          class="wizard-contact-kind__btn"
          :class="{ 'is-active': contactKind === 'person' }"
          @click="setContactKind('person')"
        >
          <q-icon name="sym_r_person" size="18px" />
          Magánszemély
        </button>
        <button
          type="button"
          class="wizard-contact-kind__btn"
          :class="{ 'is-active': contactKind === 'organization' }"
          @click="setContactKind('organization')"
        >
          <q-icon name="sym_r_apartment" size="18px" />
          Szervezet
        </button>
      </div>

      <template v-if="contactKind === 'organization'">
        <label class="wizard-field-label">Szervezet</label>
        <q-select
          :model-value="organizationId"
          :options="organizationOptions"
          emit-value
          map-options
          dark
          outlined
          dense
          clearable
          class="wizard-field"
          color="brand-primary"
          :disable="!organizationOptions.length"
          :hint="organizationOptions.length ? undefined : 'Nincs kezelhető szervezet az Adataimban'"
          @update:model-value="onOrganizationChange"
        />
      </template>

      <label class="wizard-field-label">Név</label>
      <q-input
        :model-value="contactName"
        dark
        outlined
        dense
        class="wizard-field"
        color="brand-primary"
        @update:model-value="(v) => patchContact({ contactName: String(v ?? '') })"
      />

      <label class="wizard-field-label">E-mail</label>
      <q-input
        :model-value="contactEmail"
        dark
        outlined
        dense
        type="email"
        class="wizard-field"
        color="brand-primary"
        @update:model-value="(v) => patchContact({ contactEmail: String(v ?? '') })"
      />

      <label class="wizard-field-label">Telefonszám <span class="wizard-field-optional">(opcionális)</span></label>
      <q-input
        :model-value="contactPhone"
        dark
        outlined
        dense
        type="tel"
        class="wizard-field"
        color="brand-primary"
        placeholder="+36 …"
        @update:model-value="(v) => patchContact({ contactPhone: String(v ?? '') })"
      />
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Korlátozások</label>

      <div class="wizard-toggle-row">
        <q-toggle
          :model-value="isPublic"
          label="Publikus"
          color="brand-primary"
          dark
          dense
          @update:model-value="onPublicChange"
        />
      </div>

      <label class="wizard-field-label">Max. létszám</label>
      <q-input
        :model-value="capacityDisplay"
        dark
        outlined
        dense
        type="number"
        min="1"
        placeholder="Korlátlan"
        class="wizard-field"
        color="brand-primary"
        @update:model-value="onCapacityChange"
      />
    </div>

    <div class="wizard-form-card">
      <label class="wizard-field-label" style="margin: 0;">Szerepkörök</label>

      <div v-if="roles.length" class="wizard-role-list">
        <div v-for="role in roles" :key="role.tempId" class="wizard-role-row">
          <span class="wizard-role-row__name">{{ role.roleName }}</span>
          <div class="wizard-role-row__actions">
            <q-toggle
              :model-value="role.ActiveFlg"
              label="Aktív"
              color="brand-primary"
              dark
              dense
              @update:model-value="(v) => toggleRoleActive(role.tempId, v)"
            />
            <button
              type="button"
              class="wizard-icon-btn wizard-icon-btn--danger"
              aria-label="Szerepkör törlése"
              @click="removeRole(role.tempId)"
            >
              <q-icon name="sym_r_delete" size="22px" />
            </button>
          </div>
        </div>
      </div>

      <q-select
        v-model="rolePick"
        :options="availableRoleOptions"
        emit-value
        map-options
        use-input
        input-debounce="150"
        dark
        outlined
        dense
        clearable
        hide-dropdown-icon
        class="wizard-field"
        color="brand-primary"
        @filter="filterRoles"
        @update:model-value="onPickRole"
      >
        <template #no-option>
          <q-item>
            <q-item-section class="text-grey">Nincs további szerepkör</q-item-section>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { useMasterDataStore } from 'src/stores/masterData';
import { resolveTypeIcon } from '../groupIcons';
import {
  entityId,
  isActiveFlag,
  roleDisplayName,
  type WizardBasics,
  type WizardEventRole,
  type WizardMode,
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
const authStore = useAuthStore();
const masterData = useMasterDataStore();

const typeIconResolved = computed(() => resolveTypeIcon(props.typeIcon));
const isPublic = ref(props.modelValue.publicFlg);
const roles = ref<WizardEventRole[]>([...(props.modelValue.roles || [])]);
const rolePick = ref<number | null>(null);

const contactKind = computed(() => props.modelValue.contactKind || 'person');
const organizationId = computed(() => props.modelValue.organizationId);
const contactName = computed(() => props.modelValue.contactName || '');
const contactEmail = computed(() => props.modelValue.contactEmail || '');
const contactPhone = computed(() => props.modelValue.contactPhone || '');

const capacityDisplay = computed(() =>
  props.modelValue.capacity == null ? '' : props.modelValue.capacity
);

/** Adataim Szervezetek — Owner / Manager */
const organizationOptions = computed(() => {
  return (authStore.userOrganizations || [])
    .map((uo) => {
      if (uo.OrganizationUserTypeID == null) return null;
      const userType = masterData.getOrganizationUserTypeById(uo.OrganizationUserTypeID);
      if (!userType || (!userType.OwnerFlg && !userType.ManagerFlg)) return null;
      const org = masterData.getOrganizationById(uo.OrganizationID);
      if (!org) return null;
      const label = org.ShortName?.trim() || org.Name || 'Ismeretlen';
      return { label, value: org.id, org };
    })
    .filter((o): o is { label: string; value: number; org: NonNullable<ReturnType<typeof masterData.getOrganizationById>> } => !!o)
    .sort((a, b) => a.label.localeCompare(b.label, 'hu'));
});

function personDefaults() {
  const user = authStore.user || {};
  const last = String(user.LastName || '').trim();
  const first = String(user.FirstName || '').trim();
  const name = [last, first].filter(Boolean).join(' ').trim();
  const email = String(user.EmailAddress || user.Email || '').trim();
  return { contactName: name, contactEmail: email, contactPhone: '' };
}

function orgDisplayName(org: { ShortName?: string | null; Name?: string }) {
  return (org.ShortName?.trim() || org.Name || '').trim();
}

function patchContact(partial: Partial<WizardBasics>) {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}

function setContactKind(kind: 'person' | 'organization') {
  if (kind === 'person') {
    patchContact({
      contactKind: 'person',
      organizationId: null,
      ...personDefaults(),
    });
    return;
  }
  patchContact({
    contactKind: 'organization',
    organizationId: null,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
}

function onOrganizationChange(orgId: number | null) {
  if (orgId == null) {
    patchContact({
      organizationId: null,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    });
    return;
  }
  const org = masterData.getOrganizationById(orgId);
  patchContact({
    organizationId: orgId,
    contactName: org ? orgDisplayName(org) : '',
    contactEmail: (org?.Email || '').trim(),
    contactPhone: (org?.Phone || '').trim(),
  });
}

function ensurePersonDefaultsOnce() {
  if ((props.modelValue.contactKind || 'person') !== 'person') return;
  const hasAny =
    !!(props.modelValue.contactName || '').trim() ||
    !!(props.modelValue.contactEmail || '').trim() ||
    !!(props.modelValue.contactPhone || '').trim();
  if (hasAny) return;
  patchContact({
    contactKind: 'person',
    organizationId: null,
    ...personDefaults(),
  });
}

onMounted(() => {
  ensurePersonDefaultsOnce();
});

const catalogRoles = computed(() => {
  return ((masterData.roles || []) as any[]).filter((r) => isActiveFlag(r.ActiveFlg ?? r.activeFlg));
});

const allRoleOptions = computed(() => {
  const taken = new Set(roles.value.map((r) => r.RoleID));
  return catalogRoles.value
    .map((row) => {
      const id = entityId(row);
      const name = roleDisplayName(row) || `Szerepkör #${id}`;
      return { label: name, value: id };
    })
    .filter((o) => o.value && !taken.has(o.value))
    .sort((a, b) => a.label.localeCompare(b.label, 'hu'));
});

const roleOptions = ref(allRoleOptions.value);
const availableRoleOptions = computed(() => roleOptions.value);

watch(allRoleOptions, (opts) => {
  roleOptions.value = opts;
});

function emitUpdate() {
  props.modelValue.roles = roles.value.map((r) => ({ ...r }));
  emit('update:modelValue', { ...props.modelValue, roles: [...roles.value] });
}

function onPublicChange(val: boolean) {
  isPublic.value = val;
  props.modelValue.publicFlg = val;
  emitUpdate();
}

function onCapacityChange(val: string | number | null) {
  if (val === '' || val === null || val === undefined) {
    props.modelValue.capacity = null;
  } else {
    const n = Number(val);
    props.modelValue.capacity = Number.isFinite(n) && n > 0 ? n : null;
  }
  emitUpdate();
}

function filterRoles(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase().trim();
    if (!q) {
      roleOptions.value = allRoleOptions.value;
      return;
    }
    roleOptions.value = allRoleOptions.value.filter((o) =>
      o.label.toLowerCase().includes(q)
    );
  });
}

function onPickRole(roleId: number | null) {
  rolePick.value = null;
  if (roleId == null) return;
  if (roles.value.some((r) => r.RoleID === roleId)) return;
  const row = catalogRoles.value.find((r) => entityId(r) === roleId);
  const name = row ? roleDisplayName(row) : `Szerepkör #${roleId}`;
  roles.value.push({
    tempId: crypto.randomUUID(),
    RoleID: roleId,
    ActiveFlg: true,
    roleName: name || `Szerepkör #${roleId}`,
  });
  emitUpdate();
}

function toggleRoleActive(tempId: string, val: boolean) {
  const role = roles.value.find((r) => r.tempId === tempId);
  if (!role) return;
  role.ActiveFlg = val;
  emitUpdate();
}

function removeRole(tempId: string) {
  roles.value = roles.value.filter((r) => r.tempId !== tempId);
  props.modelValue.tickets = (props.modelValue.tickets || []).map((t) => ({
    ...t,
    roleTempIds: t.roleTempIds.filter((id) => id !== tempId),
  }));
  emitUpdate();
}

function submit() {
  if (!roles.value.length) {
    $q.notify({
      message: 'Adj hozzá legalább egy szerepkört!',
      color: 'warning',
      position: 'top',
    });
    return;
  }
  emitUpdate();
  emit('next');
}
</script>

<style scoped lang="scss">
.wizard-contact-kind {
  display: flex;
  gap: 10px;
  margin: 12px 0 4px;
}

.wizard-contact-kind__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.is-active {
    background: rgba(14, 165, 233, 0.22);
    border-color: rgba(56, 189, 248, 0.55);
    color: #e0f2fe;
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.2);
  }
}

.wizard-field-optional {
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: #64748b;
}
</style>
