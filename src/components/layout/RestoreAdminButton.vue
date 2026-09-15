<template>
  <q-btn
    v-if="authStore.isImpersonating"
    round
    unelevated
    class="restore-admin-btn"
    icon="sym_r_arrow_back"
    aria-label="Visszalépés a Sysadminba"
    :loading="busy"
    :disable="busy"
    @click="restore"
  >
    <q-tooltip>Visszalépés a Sysadminba</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { readAxiosErrorMessage } from 'src/utils/apiPayload';

const authStore = useAuthStore();
const router = useRouter();
const $q = useQuasar();
const busy = ref(false);

async function restore() {
  if (busy.value) return;
  busy.value = true;
  try {
    await authStore.restoreAdminSession();
    await router.replace('/admin');
  } catch (error) {
    $q.notify({
      message: readAxiosErrorMessage(error, 'A visszalépés sikertelen.'),
      color: 'dark',
      textColor: 'red-4',
      position: 'top',
      icon: 'error',
    });
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped lang="scss">
.restore-admin-btn {
  width: 40px;
  height: 40px;
  background: #f59e0b !important;
  color: #111827 !important;
  border: 2px solid #fde68a;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.28), 0 0 18px rgba(245, 158, 11, 0.55);
}
</style>
