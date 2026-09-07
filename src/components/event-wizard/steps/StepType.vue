<template>
  <div class="wizard-step">
    <div class="wizard-step__chip-row">
      <WizardModeIcon :mode="mode" />
    </div>

    <p class="wizard-step__hint">Válassz kategóriát, majd típust</p>

    <div class="wizard-step__list">
      <div v-for="group in groups" :key="entityId(group)" class="wizard-cat-block">
        <button
          type="button"
          class="wizard-card"
          :class="{ 'is-on': groupId === entityId(group) }"
          @click="selectGroup(group)"
        >
          <div class="wizard-card__icon" :class="{ 'is-img': iconOfGroup(group).kind === 'img' }">
            <img
              v-if="iconOfGroup(group).kind === 'img'"
              :src="iconOfGroup(group).value"
              alt=""
              class="wizard-card__img"
            />
            <q-icon
              v-else
              :name="iconOfGroup(group).value"
              size="28px"
            />
          </div>
          <div class="wizard-card__body">
            <span class="wizard-card__title">{{ groupNameOf(group) }}</span>
            <span v-if="typeCount(group) > 0" class="wizard-card__meta">
              {{ typeCount(group) }} típus
            </span>
          </div>
          <q-icon
            :name="groupId === entityId(group) ? 'expand_less' : 'expand_more'"
            size="22px"
            class="wizard-card__chevron"
          />
        </button>

        <div v-if="groupId === entityId(group)" class="wizard-cat-block__types">
          <q-input
            v-if="types.length > 6"
            v-model="query"
            dense
            outlined
            dark
            clearable
            placeholder="Keresés típusra..."
            class="wizard-search"
            color="brand-primary"
          >
            <template #prepend>
              <q-icon name="search" color="slate-400" size="18px" />
            </template>
          </q-input>

          <div class="wizard-type-grid">
            <button
              v-for="type in filteredTypes"
              :key="entityId(type)"
              type="button"
              class="wizard-type-card"
              :class="{ 'is-selected': typeId === entityId(type) }"
              @click="selectType(type)"
            >
              <div class="wizard-type-card__icon" :class="{ 'is-img': iconOf(type).kind === 'img' }">
                <img
                  v-if="iconOf(type).kind === 'img'"
                  :src="iconOf(type).value"
                  alt=""
                  class="wizard-type-card__img"
                />
                <q-icon
                  v-else
                  :name="iconOf(type).value"
                  size="26px"
                />
              </div>
              <span class="wizard-type-card__title">{{ typeName(type) }}</span>
            </button>
          </div>

          <div v-if="filteredTypes.length === 0" class="wizard-empty">
            {{ query ? 'Nincs találat a keresésre.' : 'Nincs típus ebben a kategóriában.' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="groups.length === 0" class="wizard-empty">
      Nincs elérhető kategória. Ellenőrizd a master data szinkront.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMasterDataStore } from 'src/stores/masterData';
import { resolveEventGroupIcon, resolveEventTypeIcon, typeIconToken } from '../brandedTypeIcons';
import { entityId, isActiveFlag, type WizardMode } from '../types';
import WizardModeIcon from '../WizardModeIcon.vue';

const props = defineProps<{
  groupId: number | null;
  typeId?: number | null;
  mode?: WizardMode;
}>();

const emit = defineEmits<{
  (e: 'select-group', payload: { id: number; name: string }): void;
  (e: 'select-type', payload: { id: number; code: string; name: string; icon: string }): void;
}>();

const masterData = useMasterDataStore();
const query = ref('');

watch(
  () => props.groupId,
  () => {
    query.value = '';
  }
);

const groups = computed(() => {
  const list = (masterData.eventTypeGroups || []) as any[];
  return list
    .filter((g) => isActiveFlag(g.ActiveFlg ?? g.activeFlg ?? g.ActiveFlag))
    .sort((a, b) => {
      const oa = Number(a.OrderIndex ?? a.orderIndex ?? 0);
      const ob = Number(b.OrderIndex ?? b.orderIndex ?? 0);
      return oa - ob;
    });
});

const types = computed(() => {
  if (props.groupId == null) return [];
  return ((masterData.eventTypes || []) as any[])
    .filter((t) => {
      const tg = Number(t.EventTypeGroupID ?? t.eventTypeGroupId ?? t.GroupID ?? 0);
      if (tg !== props.groupId) return false;
      return isActiveFlag(t.ActiveFlg ?? t.activeFlg);
    })
    .sort((a, b) => String(typeName(a)).localeCompare(String(typeName(b)), 'hu'));
});

const filteredTypes = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return types.value;
  return types.value.filter((t) => {
    const name = typeName(t).toLowerCase();
    const code = String(t.Code || t.code || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });
});

function groupNameOf(g: any): string {
  return g.GroupName || g.groupName || g.Name || 'Névtelen kategória';
}

function typeCount(g: any): number {
  const gid = entityId(g);
  return ((masterData.eventTypes || []) as any[]).filter((t) => {
    const tg = Number(t.EventTypeGroupID ?? t.eventTypeGroupId ?? t.GroupID ?? 0);
    return tg === gid && isActiveFlag(t.ActiveFlg ?? t.activeFlg);
  }).length;
}

function typeName(t: any): string {
  return t.TypeName || t.typeName || t.Name || 'Névtelen típus';
}

function typesInGroup(g: any) {
  const gid = entityId(g);
  return ((masterData.eventTypes || []) as any[]).filter((t) => {
    const tg = Number(t.EventTypeGroupID ?? t.eventTypeGroupId ?? t.GroupID ?? 0);
    return tg === gid && isActiveFlag(t.ActiveFlg ?? t.activeFlg);
  });
}

function iconOfGroup(g: any) {
  return resolveEventGroupIcon(g, typesInGroup(g));
}

function iconOf(t: any) {
  return resolveEventTypeIcon(t);
}

function selectGroup(g: any) {
  emit('select-group', { id: entityId(g), name: groupNameOf(g) });
}

function selectType(t: any) {
  emit('select-type', {
    id: entityId(t),
    code: String(t.Code || t.code || ''),
    name: typeName(t),
    icon: typeIconToken(t),
  });
}
</script>
