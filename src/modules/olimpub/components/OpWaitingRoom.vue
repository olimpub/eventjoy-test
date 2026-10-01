<template>
  <div class="op-lobby" :class="{ 'is-game': face === 'game' }" :style="lobbyStyle">
    <header class="op-lobby__head">
      <div>
        <p v-if="mark" class="op-lobby__mark">{{ mark }}</p>
        <h1>Ki van a teremben</h1>
      </div>
      <span>{{ countLabel }}</span>
    </header>
    <div class="op-lobby__grid">
      <p v-if="!teams.length" class="op-lobby__empty">Még senki nincs csapatban.</p>
      <article
        v-for="team in teams"
        :key="team.name"
        class="op-lobby__card"
        :style="{ '--team': team.color, '--ink': team.ink }"
      >
        <h2>
          <img v-if="team.imageUrl" :src="team.imageUrl" alt="" />
          <span>{{ team.name }}</span>
          <b>{{ team.people.length }} fő</b>
        </h2>
        <ul>
          <li v-for="(person, index) in team.people" :key="`${team.name}-${index}`" :class="{ 'is-on': person.online }">
            <i />
            <span>{{ person.name }}</span>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface OpWaitingPerson {
  name: string;
  online?: boolean;
}

export interface OpWaitingTeam {
  name: string;
  imageUrl?: string;
  people: OpWaitingPerson[];
}

const props = withDefaults(
  defineProps<{
    topic?: string;
    face?: 'quiz' | 'game';
    teams?: OpWaitingTeam[];
  }>(),
  {
    topic: '',
    face: 'quiz',
    teams: undefined,
  }
);

const mark = computed(() => {
  const topic = props.topic.trim();
  if (!topic) return '';
  return `${props.face === 'game' ? 'Játék' : 'Kvíz'} · ${topic}`;
});
const colors = [
  { color: '#ff4d6d', ink: '#2a0610' },
  { color: '#38bdf8', ink: '#042433' },
  { color: '#f5b942', ink: '#2a1c04' },
  { color: '#c084fc', ink: '#1c0730' },
  { color: '#4ade80', ink: '#052e16' },
  { color: '#fb923c', ink: '#2a1204' },
];

const teamNames = [
  'Farkas',
  'Sas',
  'Medve',
  'Róka',
  'Hiúz',
  'Bagoly',
  'Vidra',
  'Gólya',
  'Nincs csapat',
];

const firstNames = ['Anna', 'Béla', 'Csilla', 'Dénes', 'Eszter', 'Fanni', 'Gábor', 'Hanna', 'Iván', 'Júlia'];

const sampleTeams: OpWaitingTeam[] = teamNames.map((name, teamIndex) => {
  const count = 4 + (teamIndex % 2);
  return {
    name,
    people: Array.from({ length: count }, (_, personIndex) => ({
      name: firstNames[(teamIndex * 3 + personIndex) % firstNames.length] ?? 'Vendég',
      online: (teamIndex + personIndex) % 6 !== 0,
    })),
  };
});

const sourceTeams = computed(() => (props.teams ? props.teams : sampleTeams));

const teams = computed(() =>
  sourceTeams.value.map((team, teamIndex) => {
    const tone = colors[teamIndex % colors.length] ?? colors[0];
    return {
      name: team.name,
      imageUrl: team.imageUrl || '',
      color: tone.color,
      ink: tone.ink,
      people: team.people.map((person) => ({
        name: person.name,
        online: person.online !== false,
      })),
    };
  })
);

const memberCount = computed(() => teams.value.reduce((sum, team) => sum + team.people.length, 0));
const countLabel = computed(() => `${memberCount.value} fő`);

const lobbyStyle = computed(() => {
  const count = Math.max(1, teams.value.length);
  const columns = columnsFor(count);
  const rows = Math.max(1, Math.ceil(count / columns));
  const size = sizeFor(count);
  return {
    '--cols': String(columns),
    '--rows': String(rows),
    '--title': `${size.title}px`,
    '--person': `${size.person}px`,
    '--dot': `${size.dot}px`,
    '--gap': `${size.gap}px`,
    '--pad': `${size.pad}px`,
  };
});

function columnsFor(count: number) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  return 5;
}

function sizeFor(count: number) {
  if (count <= 4) return { title: 40, person: 26, dot: 14, gap: 16, pad: 18 };
  if (count <= 9) return { title: 32, person: 22, dot: 12, gap: 12, pad: 14 };
  if (count <= 12) return { title: 24, person: 18, dot: 10, gap: 10, pad: 12 };
  if (count <= 16) return { title: 20, person: 16, dot: 9, gap: 8, pad: 10 };
  return { title: 16, person: 14, dot: 8, gap: 8, pad: 8 };
}
</script>

<style scoped>
.op-lobby {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 64px 16px 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 77, 109, 0.35), transparent 28%),
    radial-gradient(circle at 88% 12%, rgba(56, 189, 248, 0.28), transparent 24%),
    radial-gradient(circle at 70% 88%, rgba(245, 185, 66, 0.22), transparent 26%),
    #14081c;
  color: #fff8f2;
}

.op-lobby__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-right: 48px;
  margin-bottom: 10px;
  flex: 0 0 auto;
}

.op-lobby__head h1 {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 34px);
  font-weight: 900;
  line-height: 1;
}

.op-lobby__mark {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 800;
  color: #ffe8c2;
}

.op-lobby.is-game .op-lobby__mark {
  color: #a5f3fc;
}

.op-lobby__head span {
  padding: 6px 12px;
  border-radius: 999px;
  background: #4ade80;
  color: #052e16;
  font-size: 16px;
  font-weight: 900;
}

.op-lobby__grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
  gap: var(--gap);
}

.op-lobby__card {
  min-height: 0;
  padding: var(--pad);
  border-radius: 18px;
  background: var(--team);
  color: var(--ink);
  overflow: hidden;
}

.op-lobby__empty {
  grid-column: 1 / -1;
  margin: auto;
  font-size: 28px;
  font-weight: 800;
  color: #ffe8c2;
}

.op-lobby__card h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: var(--title);
  font-weight: 900;
  line-height: 1.05;
}

.op-lobby__card h2 img {
  width: calc(var(--title) + 8px);
  height: calc(var(--title) + 8px);
  object-fit: contain;
  flex: 0 0 auto;
}

.op-lobby__card h2 span {
  flex: 1 1 auto;
  min-width: 0;
}

.op-lobby__card h2 b {
  flex: none;
  font-size: 0.62em;
  font-weight: 900;
  padding: 0.15em 0.55em;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.16);
}

.op-lobby__card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
}

.op-lobby__card li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.38);
  font-size: var(--person);
  font-weight: 800;
  line-height: 1.2;
  opacity: 0.4;
}

.op-lobby__card li.is-on {
  opacity: 1;
}

.op-lobby__card i {
  width: var(--dot);
  height: var(--dot);
  border-radius: 999px;
  background: currentColor;
  opacity: 0.45;
}

.op-lobby__card li.is-on i {
  background: #052e16;
  opacity: 1;
}
</style>
