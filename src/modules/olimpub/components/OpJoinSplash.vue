<template>
  <section class="op-join-wall">
    <div class="op-join-wall__glow" aria-hidden="true" />
    <div class="op-join-wall__copy">
      <img :src="logo" alt="EventJoy" class="op-join-wall__logo" />
      <p class="op-join-wall__event">{{ eventName || 'Olimpub' }}</p>
      <p class="op-join-wall__site">{{ site }}</p>

      <Transition name="op-join-slide" mode="out-in">
        <article :key="slide.id" class="op-join-wall__slide" :class="`is-${slide.kind}`">
          <h1>{{ slide.title }}</h1>
          <ol>
            <li v-for="(row, index) in slide.lines" :key="row.text" :style="{ '--i': index }">
              <span class="op-join-wall__mark" aria-hidden="true">{{ row.mark }}</span>
              <span class="op-join-wall__line">
                <b v-if="row.lead">{{ row.lead }}</b>
                {{ row.text }}
              </span>
            </li>
          </ol>
        </article>
      </Transition>

      <div class="op-join-wall__dots" role="tablist" aria-label="Vetített lapok">
        <span
          v-for="(row, index) in SLIDES"
          :key="row.id"
          :class="{ 'is-on': index === slideIndex }"
        />
      </div>
    </div>
    <div class="op-join-wall__qr">
      <img v-if="qrSrc" :src="qrSrc" alt="Belépő QR-kód" />
      <p v-else class="op-join-wall__wait">QR készül…</p>
      <strong>Olvasd le a QR-kódot</strong>
      <small>{{ joinUrl }}</small>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import QRCode from 'qrcode';
import { EVENTJOY_BRAND } from 'src/assets/brand/eventjoy';
import { OP_PUBLIC_SITE, opJoinAbsoluteUrl } from '../constants';

const SLIDES = [
  {
    id: 'join',
    kind: 'steps',
    title: 'Csatlakozás a játékhoz',
    ms: 9000,
    lines: [
      { mark: '1', lead: '', text: 'Olvasd le a kivetített QR-kódot!' },
      { mark: '2', lead: '', text: 'Válaszd ki a beceneved!' },
      { mark: '3', lead: '', text: 'Csatlakozz a csapatodhoz!' },
      { mark: '4', lead: '', text: 'Kezdődhet a játék! 🚀' },
    ],
  },
  {
    id: 'plan',
    kind: 'plan',
    title: 'A mai este menete',
    ms: 9000,
    lines: [
      { mark: '🔥', lead: 'Bemelegítés', text: 'Tesztkör, hogy ráérezz a rendszerre' },
      { mark: '🧠', lead: 'Kvíz', text: 'Izgalmas kérdések változatos témakörökben' },
      { mark: '🎯', lead: 'Különszámok', text: 'Interaktív feladatok az extra pontokért!' },
    ],
  },
  {
    id: 'score',
    kind: 'plan',
    title: 'Pontozás és Győzelem',
    ms: 9000,
    lines: [
      { mark: '🤝', lead: 'Csapatmunka', text: 'Együtt küzdötök a győzelemért' },
      { mark: '⚡', lead: 'Gyorsaság és tudás', text: 'A helyezések alapján kaptok pontot' },
      { mark: '🏆', lead: 'A cél', text: 'A legmagasabb összpontszám megszerzése!' },
    ],
  },
  {
    id: 'info',
    kind: 'rules',
    title: 'A Játék Fontos Szabályai',
    ms: 12000,
    lines: [
      { mark: '📱', lead: '', text: 'No Google, No AI! Csak a saját fejeteket használjátok!' },
      { mark: '🧸', lead: '', text: 'A plüssök maradnak! Kérjük, ne vidd haza az asztali kellékeket.' },
      { mark: '🔒', lead: '', text: 'Maradj a helyeden! Csak a saját csapatodba lépj be a felületen.' },
      { mark: '⚖️', lead: '', text: 'A Kvízmester szava szent! Neki mindig igaza van.' },
      { mark: '🔄', lead: '', text: 'Technikai baki? Ha megszakad a kapcsolat, csak frissíts rá az oldalra!' },
    ],
  },
] as const;

const props = withDefaults(
  defineProps<{
    eventName?: string;
    joinUrl?: string;
  }>(),
  {
    eventName: '',
    joinUrl: '',
  }
);

const logo = EVENTJOY_BRAND.logoDark;
const site = OP_PUBLIC_SITE;
const qrSrc = ref('');
const joinUrl = ref(props.joinUrl || opJoinAbsoluteUrl());
const slideIndex = ref(0);
let timer = 0;

const slide = computed(() => SLIDES[slideIndex.value] || SLIDES[0]);

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    slideIndex.value = (slideIndex.value + 1) % SLIDES.length;
    schedule();
  }, slide.value.ms);
}

async function renderQr(url: string) {
  joinUrl.value = url;
  try {
    qrSrc.value = await QRCode.toDataURL(url, {
      width: 960,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b1020', light: '#ffffff' },
    });
  } catch {
    qrSrc.value = '';
  }
}

onMounted(() => {
  void renderQr(props.joinUrl || opJoinAbsoluteUrl());
  schedule();
});
onUnmounted(() => {
  window.clearTimeout(timer);
});
watch(
  () => props.joinUrl,
  (url) => {
    void renderQr(url || opJoinAbsoluteUrl());
  }
);
</script>

<style scoped>
.op-join-wall {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 4vw;
  align-items: center;
  min-height: 100vh;
  padding: 5vh 5.5vw;
  overflow: hidden;
  color: #fff8f2;
  background:
    radial-gradient(circle at 8% 0%, rgba(14, 165, 233, 0.38), transparent 42%),
    radial-gradient(circle at 92% 18%, rgba(245, 185, 66, 0.22), transparent 34%),
    #070a14;
}

.op-join-wall__glow {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  background:
    radial-gradient(ellipse 50% 40% at 20% 20%, rgba(14, 165, 233, 0.22), transparent 60%),
    radial-gradient(ellipse 40% 35% at 80% 70%, rgba(245, 185, 66, 0.14), transparent 62%);
  animation: opJoinGlow 10s ease-in-out infinite alternate;
}

.op-join-wall__copy,
.op-join-wall__qr {
  position: relative;
  z-index: 1;
}

.op-join-wall__logo {
  display: block;
  height: clamp(36px, 5.5vh, 60px);
  width: auto;
  max-width: 100%;
  margin-bottom: 14px;
  object-fit: contain;
}

.op-join-wall__event {
  margin: 0 0 4px;
  font-size: clamp(20px, 2.6vw, 32px);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.op-join-wall__site {
  margin: 0 0 3.2vh;
  font-size: clamp(15px, 1.8vw, 22px);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f5b942;
}

.op-join-wall__slide {
  min-height: 42vh;
}

.op-join-wall__slide h1 {
  margin: 0 0 22px;
  font-size: clamp(32px, 4.6vw, 62px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.95;
  animation: opJoinTitle 0.55s cubic-bezier(0.2, 1.2, 0.3, 1) both;
}

.op-join-wall__slide ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.op-join-wall__slide li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  font-size: clamp(18px, 2.2vw, 30px);
  font-weight: 800;
  line-height: 1.25;
  animation: opJoinIn 0.55s ease both;
  animation-delay: calc(var(--i) * 0.14s + 0.12s);
}

.op-join-wall__mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1.7em;
  height: 1.7em;
  border-radius: 999px;
  background: rgba(245, 185, 66, 0.18);
  color: #f5b942;
  font-size: 0.92em;
  animation: opJoinPop 0.5s cubic-bezier(0.2, 1.5, 0.3, 1) both;
  animation-delay: calc(var(--i) * 0.14s + 0.08s);
}

.is-rules .op-join-wall__mark {
  animation-name: opJoinWiggle;
  animation-duration: 0.7s;
}

.op-join-wall__line b {
  display: block;
  margin-bottom: 2px;
  color: #f5b942;
  font-size: 0.78em;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.op-join-wall__dots {
  display: flex;
  gap: 10px;
  margin-top: 3.4vh;
}

.op-join-wall__dots span {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 248, 242, 0.22);
  transition: width 0.35s ease, background 0.35s ease;
}

.op-join-wall__dots span.is-on {
  width: 36px;
  background: #f5b942;
}

.op-join-slide-enter-active,
.op-join-slide-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.op-join-slide-enter-from {
  opacity: 0;
  transform: translateY(22px);
}

.op-join-slide-leave-to {
  opacity: 0;
  transform: translateY(-22px);
}

.op-join-wall__qr {
  justify-self: end;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(56vh, 540px);
  padding: 20px 20px 16px;
  border-radius: 32px;
  background: #fff;
  color: #0b1020;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  animation: opJoinQr 2.8s ease-in-out infinite;
}

.op-join-wall__qr img {
  width: 100%;
  height: auto;
  border-radius: 12px;
}

.op-join-wall__qr strong {
  font-size: clamp(15px, 1.6vw, 20px);
  font-weight: 900;
  text-align: center;
}

.op-join-wall__qr small {
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  word-break: break-all;
  color: #64748b;
}

.op-join-wall__wait {
  margin: 48px 0;
  font-weight: 800;
  color: #64748b;
}

@keyframes opJoinIn {
  from {
    opacity: 0;
    transform: translateX(-28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes opJoinTitle {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes opJoinPop {
  0% {
    transform: scale(0.4);
  }
  70% {
    transform: scale(1.18);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes opJoinWiggle {
  0% {
    transform: scale(0.5) rotate(-12deg);
  }
  60% {
    transform: scale(1.16) rotate(8deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes opJoinQr {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }
  50% {
    transform: translateY(-8px);
    box-shadow: 0 32px 70px rgba(14, 165, 233, 0.28);
  }
}

@keyframes opJoinGlow {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(4%, -3%, 0) scale(1.08);
  }
}

@media (max-width: 900px) {
  .op-join-wall {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    padding: 5vh 6vw;
  }

  .op-join-wall__logo,
  .op-join-wall__dots {
    margin-left: auto;
    margin-right: auto;
  }

  .op-join-wall__slide {
    min-height: auto;
  }

  .op-join-wall__slide li {
    text-align: left;
  }

  .op-join-wall__qr {
    justify-self: center;
    width: min(78vw, 380px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .op-join-wall__glow,
  .op-join-wall__qr,
  .op-join-wall__slide h1,
  .op-join-wall__slide li,
  .op-join-wall__mark {
    animation: none;
  }
}
</style>
