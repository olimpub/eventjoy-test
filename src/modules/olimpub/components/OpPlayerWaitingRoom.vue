<template>
  <section class="op-wait">
    <header class="op-wait__head">
      <p class="op-wait__kicker">Váróterem</p>
      <h1>{{ eventName }}</h1>
    </header>

    <div class="op-wait__hero">
      <div class="op-wait__halo" aria-hidden="true" />
      <div class="op-wait__orbit" aria-hidden="true" />
      <div class="op-wait__sparks" aria-hidden="true">
        <span v-for="n in 7" :key="n" class="op-wait__spark" />
      </div>
      <div class="op-wait__mascot">
        <button
          type="button"
          class="op-wait__swap"
          aria-label="Csapat módosítása"
          :disabled="leaving"
          @click="$emit('changeTeam')"
        >
          <q-icon name="swap_horiz" size="22px" />
        </button>
        <img v-if="imageUrl" :src="imageUrl" :alt="teamName" />
        <span v-else class="op-wait__initial">{{ initial }}</span>
      </div>
    </div>

    <p class="op-wait__team">{{ teamName }}</p>
    <p class="op-wait__count">{{ countLabel }}</p>

    <ul v-if="mates.length" class="op-wait__mates">
      <li
        v-for="(row, index) in mates"
        :key="row.eventUserId"
        :class="{ 'is-me': row.isMe }"
        :style="{ '--i': String(index) }"
      >
        {{ row.name }}
      </li>
    </ul>

    <p v-if="error" class="op-wait__error">{{ error }}</p>
    <p class="op-wait__cue">
      <span class="op-wait__live" aria-hidden="true" />
      Figyelj a Kvízmesterre! :-)
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    eventName: string;
    teamName: string;
    imageUrl?: string;
    memberCount?: number;
    mates?: Array<{ eventUserId: number; name: string; isMe: boolean }>;
    leaving?: boolean;
    error?: string;
  }>(),
  {
    imageUrl: '',
    memberCount: 0,
    mates: () => [],
    leaving: false,
    error: '',
  }
);

defineEmits<{
  changeTeam: [];
}>();

const initial = computed(() => {
  const letter = String(props.teamName || '').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
});

const countLabel = computed(() => {
  const n = Math.max(props.memberCount, props.mates.length);
  return `${n} fő`;
});
</script>

<style scoped>
.op-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.op-wait__head,
.op-wait__hero,
.op-wait__team,
.op-wait__count,
.op-wait__mates,
.op-wait__error,
.op-wait__cue {
  animation: op-wait-in 0.7s ease both;
}

.op-wait__head {
  animation-delay: 0.04s;
}

.op-wait__hero {
  animation-delay: 0.12s;
}

.op-wait__team {
  animation-delay: 0.22s;
}

.op-wait__count {
  animation-delay: 0.28s;
}

.op-wait__mates {
  animation-delay: 0.34s;
}

.op-wait__error {
  animation-delay: 0.38s;
}

.op-wait__cue {
  animation-delay: 0.5s;
}

.op-wait__kicker {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--op-gold);
}

h1 {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--op-cream);
}

.op-wait__hero {
  position: relative;
  width: min(68vw, 260px);
  height: min(68vw, 260px);
  margin: 18px 0 10px;
  animation: op-wait-in 0.7s ease both, op-wait-float 4.8s ease-in-out 0.4s infinite;
}

.op-wait__halo {
  position: absolute;
  inset: -22%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 185, 66, 0.42) 0%, transparent 64%);
  animation: op-wait-halo 3.2s ease-in-out infinite;
  pointer-events: none;
}

.op-wait__orbit {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(
    from 0deg,
    transparent 0 62%,
    rgba(245, 185, 66, 0.05) 68%,
    #fff6e8 76%,
    var(--op-gold) 82%,
    transparent 90%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  animation: op-wait-spin 9s linear infinite;
}

.op-wait__sparks {
  position: absolute;
  inset: -8%;
  pointer-events: none;
  z-index: 2;
}

.op-wait__spark {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff6e8;
  box-shadow: 0 0 8px 2px rgba(245, 185, 66, 0.85);
  animation: op-wait-spark 2.8s ease-in-out infinite;
}

.op-wait__spark:nth-child(1) {
  left: 6%;
  top: 28%;
  animation-delay: 0s;
}
.op-wait__spark:nth-child(2) {
  left: 88%;
  top: 18%;
  animation-delay: 0.35s;
}
.op-wait__spark:nth-child(3) {
  left: 92%;
  top: 58%;
  animation-delay: 0.7s;
}
.op-wait__spark:nth-child(4) {
  left: 12%;
  top: 72%;
  animation-delay: 1.1s;
}
.op-wait__spark:nth-child(5) {
  left: 48%;
  top: 4%;
  width: 3px;
  height: 3px;
  animation-delay: 1.5s;
}
.op-wait__spark:nth-child(6) {
  left: 72%;
  top: 86%;
  animation-delay: 1.9s;
}
.op-wait__spark:nth-child(7) {
  left: 28%;
  top: 8%;
  animation-delay: 2.3s;
}

.op-wait__mascot {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #0b1020;
  border: 1px solid rgba(245, 185, 66, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 0 6px rgba(7, 10, 20, 0.55),
    0 22px 48px rgba(0, 0, 0, 0.45),
    0 0 40px rgba(245, 185, 66, 0.18);
}

.op-wait__mascot img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0b1020;
}

.op-wait__initial {
  font-size: 4.5rem;
  font-weight: 800;
  color: var(--op-gold);
}

.op-wait__swap {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 9999px;
  background: rgba(7, 10, 20, 0.82);
  color: var(--op-cream);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.op-wait__swap:disabled {
  opacity: 0.5;
  cursor: default;
}

.op-wait__team {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--op-gold);
}

.op-wait__count {
  margin: 0;
  color: var(--op-muted);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.op-wait__mates {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 22rem;
}

.op-wait__mates li {
  padding: 6px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--op-muted);
  font-size: 0.88rem;
  animation: op-wait-in 0.5s ease both;
  animation-delay: calc(0.4s + var(--i, 0) * 0.08s);
}

.op-wait__mates li.is-me {
  background: rgba(245, 185, 66, 0.2);
  color: var(--op-cream);
  font-weight: 700;
  box-shadow: 0 0 0 1px rgba(245, 185, 66, 0.28);
}

.op-wait__error {
  margin: 0;
  color: #ffb4b4;
  font-size: 0.92rem;
}

.op-wait__cue {
  margin: 16px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 9999px;
  background: rgba(245, 185, 66, 0.1);
  border: 1px solid rgba(245, 185, 66, 0.22);
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--op-cream);
  animation: op-wait-in 0.7s ease both, op-wait-cue 2.6s ease-in-out 0.8s infinite;
}

.op-wait__live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--op-gold);
  box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.7);
  animation: op-wait-live 1.6s ease-out infinite;
}

@keyframes op-wait-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes op-wait-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes op-wait-halo {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.92);
  }
  50% {
    opacity: 0.95;
    transform: scale(1.1);
  }
}

@keyframes op-wait-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes op-wait-spark {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes op-wait-cue {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(245, 185, 66, 0);
  }
  50% {
    box-shadow: 0 0 22px rgba(245, 185, 66, 0.22);
  }
}

@keyframes op-wait-live {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0.65);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 185, 66, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 185, 66, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .op-wait__head,
  .op-wait__hero,
  .op-wait__team,
  .op-wait__count,
  .op-wait__mates,
  .op-wait__mates li,
  .op-wait__error,
  .op-wait__cue,
  .op-wait__halo,
  .op-wait__orbit,
  .op-wait__spark,
  .op-wait__live {
    animation: none;
  }
}
</style>
