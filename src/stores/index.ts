import { store } from 'quasar/wrappers'
import { createPinia } from 'pinia'
import { Router } from 'vue-router';

/*
 * When adding new properties to StoreGeneric, you should also
 * extend the `PiniaCustomProperties` interface in `src/shims-pinia.d.ts`
 */
declare module 'pinia' {
  export interface PiniaCustomProperties {
    readonly router: Router;
  }
}

export default store((/* { ssrContext } */) => {
  const pinia = createPinia()

  return pinia
})
