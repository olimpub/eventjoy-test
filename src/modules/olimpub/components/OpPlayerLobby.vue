<template>
  <section class="op-gamer-lobby">
    <header class="op-gamer-lobby__hero">
      <p v-if="nickname" class="op-gamer-lobby__hi">Szia, {{ nickname }}!</p>
      <h1>{{ title }}</h1>
      <p class="op-gamer-lobby__lead">{{ lead }}</p>
    </header>

    <p v-if="error" class="op-gamer-lobby__error">{{ error }}</p>

    <div v-if="canPickTeam" class="op-gamer-lobby__teams">
      <p v-if="!teams.length" class="op-gamer-lobby__empty">Nincs választható csapat.</p>
      <button
        v-for="team in teams"
        :key="team.id"
        type="button"
        class="op-gamer-lobby__team"
        :class="{ 'is-mine': team.id === myTeamId, 'is-full': isFull(team) && team.id !== myTeamId }"
        :disabled="joining || (isFull(team) && team.id !== myTeamId) || (myTeamId != null && team.id !== myTeamId)"
        @click="$emit('join', team.id)"
      >
        <span class="op-gamer-lobby__mascot">
          <img v-if="imageOf(team)" :src="imageOf(team)" alt="" />
          <span v-else>{{ initialOf(team) }}</span>
        </span>
        <span class="op-gamer-lobby__meta">
          <strong>{{ team.Name }}</strong>
          <small>
            {{ team.MemberCount }}{{ maxTeamSize ? ` / ${maxTeamSize}` : '' }} fő
            <template v-if="team.id === myTeamId"> · a csapatod</template>
            <template v-else-if="isFull(team)"> · tele</template>
          </small>
        </span>
        <q-icon v-if="team.id === myTeamId" name="sym_r_check_circle" size="22px" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { kabalaImageOf, type OpCatalogItem, type OpTeam } from '../opData';

const props = withDefaults(
  defineProps<{
    phase: 'checkin' | 'game' | 'ended' | 'before' | 'draw' | 'ceremony';
    nickname?: string;
    teams?: OpTeam[];
    kabalas?: OpCatalogItem[];
    maxTeamSize?: number | null;
    myTeamId?: number | null;
    joining?: boolean;
    error?: string;
  }>(),
  {
    nickname: '',
    teams: () => [],
    kabalas: () => [],
    maxTeamSize: null,
    myTeamId: null,
    joining: false,
    error: '',
  }
);

defineEmits<{
  join: [teamId: number];
}>();

const canPickTeam = computed(
  () => props.phase === 'game' || (props.phase === 'checkin' && props.teams.length > 0)
);

const myTeam = computed(() => props.teams.find((row) => row.id === props.myTeamId) || null);

const title = computed(() => {
  if (props.phase === 'ended' || props.phase === 'ceremony') return 'A játék véget ért';
  if (canPickTeam.value) {
    if (!props.teams.length) return 'Nincs választható csapat';
    return myTeam.value ? `A csapatod: ${myTeam.value.Name}` : 'Válaszd a csapatod';
  }
  return 'Hamarosan indul a játék';
});

const lead = computed(() => {
  if (props.phase === 'ended' || props.phase === 'ceremony') {
    return 'A végeredményt a vetítőn követheted.';
  }
  if (canPickTeam.value) {
    if (myTeam.value) return 'Várj a kvízmesterre. A kérdés akkor jön, amikor elindítja.';
    if (!props.teams.length) return 'Nincs választható csapat.';
    return 'Válaszd ki a plüssöd / kabalád. Utána várj a kvízmesterre — a többi infó a vetítőn van.';
  }
  return 'A csapatválasztás akkor nyílik, amikor kiosztottuk a plüssöket. Addig a többi infót a vetítőn találod.';
});

function imageOf(team: OpTeam): string {
  return kabalaImageOf(team, props.kabalas, 'profile');
}

function initialOf(team: OpTeam): string {
  const letter = String(team.Name || '').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}

function isFull(team: OpTeam): boolean {
  const cap = props.maxTeamSize;
  if (cap == null || cap <= 0) return false;
  return team.MemberCount >= cap;
}
</script>

<style scoped>
.op-gamer-lobby {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.op-gamer-lobby__hero {
  text-align: center;
}

.op-gamer-lobby__hi {
  margin: 0 0 6px;
  color: var(--op-gold);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 8px;
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--op-cream);
}

.op-gamer-lobby__lead {
  margin: 0;
  color: var(--op-muted);
  line-height: 1.5;
  font-size: 0.98rem;
}

.op-gamer-lobby__error {
  margin: 0;
  text-align: center;
  color: #ffb4b4;
  font-size: 0.92rem;
}

.op-gamer-lobby__empty {
  margin: 0;
  text-align: center;
  color: var(--op-muted);
}

.op-gamer-lobby__teams {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.op-gamer-lobby__team {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--op-radius-sm);
  border: 1px solid rgba(245, 185, 66, 0.22);
  background: rgba(12, 16, 28, 0.72);
  color: var(--op-cream);
  text-align: left;
  cursor: pointer;
}

.op-gamer-lobby__team.is-mine {
  border-color: var(--op-gold);
  background: rgba(245, 185, 66, 0.12);
}

.op-gamer-lobby__team:disabled:not(.is-mine) {
  opacity: 0.55;
  cursor: default;
}

.op-gamer-lobby__mascot {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 185, 66, 0.16);
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--op-gold);
}

.op-gamer-lobby__mascot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.op-gamer-lobby__meta {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.op-gamer-lobby__meta strong {
  font-size: 1.05rem;
}

.op-gamer-lobby__meta small {
  color: var(--op-muted);
  font-size: 0.8rem;
}
</style>
