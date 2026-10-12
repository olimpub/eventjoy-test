import { onMounted, onUnmounted, ref } from 'vue';

const immersive = ref(false);

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

async function requestFullscreen() {
  const el = document.documentElement as FullscreenElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else await el.webkitRequestFullscreen?.();
  } catch {
    /* iPhone Safari nem adja a böngésző sávját. Az app menüje ettől még eltűnik. */
  }
}

async function exitFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
  try {
    if (fullscreenElement()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    }
  } catch {
    /* a menü akkor is visszajön */
  }
}

let sawFullscreen = false;

function onFullscreenChange() {
  if (fullscreenElement()) {
    sawFullscreen = true;
    return;
  }
  if (!sawFullscreen) return;
  sawFullscreen = false;
  immersive.value = false;
}

let listeners = 0;

export function useImmersiveChrome() {
  async function enter() {
    immersive.value = true;
    await requestFullscreen();
  }

  async function exit() {
    immersive.value = false;
    await exitFullscreen();
  }

  function toggle() {
    if (immersive.value) void exit();
    else void enter();
  }

  onMounted(() => {
    if (listeners === 0) {
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    }
    listeners += 1;
  });

  onUnmounted(() => {
    listeners = Math.max(0, listeners - 1);
    if (listeners === 0) {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    }
  });

  return { immersive, toggle, enter, exit };
}
