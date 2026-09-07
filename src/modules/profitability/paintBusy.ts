import { nextTick } from 'vue';

/** Overlay kirajzolása, mielőtt a szinkron sorsolás blokkolja a UI-t. */
export async function paintBusy(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
