<template>
  <div v-if="current" class="role-switch">
    <button
      type="button"
      class="role-switch__chip"
      :class="{ 'is-switchable': canSwitch }"
      :style="chipStyle"
      :aria-label="canSwitch ? 'Profilváltás' : current.name"
      :disabled="!canSwitch"
      @click="onChipClick"
    >
      <span class="role-switch__name">{{ current.name }}</span>
      <span v-if="current.roleTypeName" class="role-switch__type">{{ current.roleTypeName }}</span>
      <q-icon v-if="canSwitch" name="swap_horiz" size="16px" />
      <q-tooltip v-if="canSwitch">Profilváltás</q-tooltip>
    </button>

    <q-dialog v-model="isOpen" position="bottom" transition-show="slide-up" transition-hide="slide-down">
      <q-card class="role-switch__sheet">
        <div class="w-full flex justify-center pt-3 pb-1">
          <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
        </div>
        <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
          <div class="w-10" />
          <div class="role-switch__sheet-title">Profilváltás</div>
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            class="text-slate-400 hover:text-white bg-slate-800/50"
            size="sm"
          />
        </q-card-section>
        <q-card-section class="q-pt-md q-px-md pb-8">
          <p class="role-switch__hint">Válaszd ki, melyik szerepkörrel folytatod.</p>
          <div class="role-switch__list">
            <button
              v-for="role in roles"
              :key="role.eventRoleId ?? role.eventUserId"
              type="button"
              class="role-switch__option"
              :class="{ 'is-current': isSameEventRole(current, role) }"
              @click="pick(role)"
            >
              <span
                class="role-switch__option-chip"
                :style="styleFor(role.color)"
              >
                {{ role.name }}
              </span>
              <span v-if="role.roleTypeName" class="role-switch__option-type">{{ role.roleTypeName }}</span>
              <q-icon
                v-if="isSameEventRole(current, role)"
                name="check"
                size="18px"
                class="role-switch__check"
              />
              <q-icon v-else name="chevron_right" size="18px" class="role-switch__chevron" />
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import type { EnterableEventRole } from 'src/stores/event';
import { eventRoleEnterBlocked, isSameEventRole, navigateToEventRole } from 'src/utils/eventRoleNav';

const props = defineProps<{
  eventId: string | number;
  current: EnterableEventRole | null;
  roles: EnterableEventRole[];
}>();

const router = useRouter();
const $q = useQuasar();
const isOpen = ref(false);

const canSwitch = computed(() => (props.roles || []).length > 1);

const chipStyle = computed(() => styleFor(props.current?.color));

function styleFor(hexColor?: string) {
  let color = hexColor && hexColor.startsWith('#') ? hexColor : '#38bdf8';
  if (color.length === 4) {
    color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return {
    color,
    backgroundColor: color + '1A',
    borderColor: color + '33',
  };
}

function onChipClick() {
  if (!canSwitch.value) return;
  isOpen.value = true;
}

function pick(role: EnterableEventRole) {
  isOpen.value = false;
  if (isSameEventRole(props.current, role)) return;
  const blocked = eventRoleEnterBlocked(props.eventId, role);
  if (blocked) {
    $q.notify({
      message: blocked,
      color: 'dark',
      textColor: 'orange-4',
      position: 'top',
    });
    return;
  }
  void navigateToEventRole(router, props.eventId, role);
}
</script>

<style scoped>
.role-switch {
  min-width: 0;
}

.role-switch__chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: transparent;
  cursor: default;
}

.role-switch__chip.is-switchable {
  cursor: pointer;
}

.role-switch__chip.is-switchable:hover {
  filter: brightness(1.15);
}

.role-switch__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-switch__type {
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.role-switch__sheet {
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  background: rgba(15, 23, 42, 0.96);
  border-top: 1px solid rgba(56, 189, 248, 0.28);
}

.role-switch__sheet-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f8fafc;
}

.role-switch__hint {
  margin: 0 4px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.role-switch__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-switch__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  cursor: pointer;
  text-align: left;
}

.role-switch__option.is-current {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.1);
}

.role-switch__option-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.role-switch__option-type {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

.role-switch__check {
  color: #38bdf8;
  flex-shrink: 0;
}

.role-switch__chevron {
  color: #64748b;
  flex-shrink: 0;
}
</style>
