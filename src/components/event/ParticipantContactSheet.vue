<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="walkin" :class="{ 'is-pta': variant === 'pta' }">
      <div class="walkin__handle" aria-hidden="true" />
      <div class="walkin__icon">
        <q-icon name="sym_r_edit" size="22px" />
      </div>
      <h2 class="walkin__title">Adatok szerkesztése</h2>
      <p class="walkin__hint">
        A lista mellett a globális felhasználói fiókot és a login e-mail címet is átírja. Ha az e-mail már másik fióké,
        a mentés nem sikerül.
      </p>

      <form class="walkin__form" @submit.prevent="submit">
        <label class="walkin__field">
          <span>Családnév *</span>
          <input v-model="lastName" type="text" autocomplete="family-name" :disabled="busy" />
        </label>
        <label class="walkin__field">
          <span>Keresztnév *</span>
          <input v-model="firstName" type="text" autocomplete="given-name" :disabled="busy" />
        </label>
        <label class="walkin__field">
          <span>Email-cím *</span>
          <input v-model="email" type="email" inputmode="email" autocomplete="email" :disabled="busy" />
        </label>
        <label class="walkin__field">
          <span>Telefonszám</span>
          <input
            v-model="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            :disabled="busy"
            @input="onPhoneInput"
          />
        </label>

        <p v-if="errorMessage" class="walkin__error">{{ errorMessage }}</p>

        <button type="submit" class="walkin__submit" :disabled="busy">
          {{ busy ? 'Mentés…' : 'Mentés' }}
        </button>
        <button type="button" class="walkin__close" :disabled="busy" @click="emit('update:modelValue', false)">
          Mégse
        </button>
      </form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { AsYouType } from 'libphonenumber-js';
import { nullableNumericId, readAxiosErrorMessage, readAxiosHttpStatus } from 'src/utils/apiPayload';
import {
  patchEventUserContact,
  validateEventUserContact,
} from 'src/utils/eventUserContact';

const $q = useQuasar();

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    eventId: string | number | null;
    eventUserId: number | null;
    lastName?: string;
    firstName?: string;
    email?: string;
    phone?: string;
    variant?: 'eventjoy' | 'pta';
  }>(),
  {
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    variant: 'eventjoy',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  saved: [];
}>();

const lastName = ref('');
const firstName = ref('');
const email = ref('');
const phone = ref('');
const busy = ref(false);
const errorMessage = ref('');

watch(
  () => [props.modelValue, props.eventUserId] as const,
  ([open]) => {
    if (!open) return;
    lastName.value = props.lastName;
    firstName.value = props.firstName;
    email.value = props.email;
    phone.value = props.phone;
    errorMessage.value = '';
    busy.value = false;
  }
);

function onPhoneInput() {
  const raw = phone.value;
  if (!raw) return;
  let inputToFormat = raw;
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('06')) inputToFormat = '+36' + digits.substring(2);
  else if (digits.startsWith('36')) inputToFormat = '+36' + digits.substring(2);
  const formatted = new AsYouType('HU').input(inputToFormat);
  if (formatted !== raw) {
    void nextTick(() => {
      phone.value = formatted;
    });
  }
}

async function submit() {
  if (busy.value) return;
  errorMessage.value = '';
  const form = {
    lastName: lastName.value,
    firstName: firstName.value,
    email: email.value,
    phone: phone.value,
  };
  const invalid = validateEventUserContact(form);
  if (invalid) {
    errorMessage.value = invalid;
    return;
  }
  const numericEventId = nullableNumericId(props.eventId);
  const eventUserId = nullableNumericId(props.eventUserId);
  if (numericEventId == null || eventUserId == null) {
    errorMessage.value = 'Hiányzó résztvevő.';
    return;
  }
  busy.value = true;
  try {
    await patchEventUserContact({
      eventId: numericEventId,
      eventUserId,
      input: form,
    });
    $q.notify({
      message: 'Adatok mentve.',
      color: 'dark',
      textColor: props.variant === 'pta' ? 'orange-4' : 'blue-4',
      position: 'top',
      timeout: 1800,
      classes: 'border border-white/10 rounded-xl q-px-lg q-py-md font-bold text-[13px] mt-4',
    });
    emit('update:modelValue', false);
    emit('saved');
  } catch (error) {
    const status = readAxiosHttpStatus(error);
    errorMessage.value = readAxiosErrorMessage(
      error,
      status === 409 ? 'Ez az e-mail már foglalt egy másik fiókban.' : 'A mentés sikertelen.'
    );
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.walkin {
  width: 100%;
  max-width: 640px;
  max-height: min(88vh, 720px);
  overflow-y: auto;
  margin: 0 auto;
  border-radius: 24px 24px 0 0;
  background: #0f172a;
  color: #fff;
  padding: 8px 20px 24px;
}

.walkin.is-pta {
  background: #121416;
}

.walkin__handle {
  width: 48px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 8px auto 16px;
}

.walkin__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;
}

.walkin.is-pta .walkin__icon {
  background: rgba(246, 139, 41, 0.16);
  color: #f68b29;
}

.walkin__title {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}

.walkin__hint {
  margin: 8px 0 16px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #94a3b8;
}

.walkin__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.walkin__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.walkin__field input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.65);
  color: #f1f5f9;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.walkin.is-pta .walkin__field input {
  background: rgba(10, 11, 12, 0.65);
}

.walkin__field input:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.55);
}

.walkin.is-pta .walkin__field input:focus {
  border-color: rgba(246, 139, 41, 0.55);
}

.walkin__error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
  font-size: 13px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

.walkin__submit,
.walkin__close {
  height: 48px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.walkin__submit {
  border: none;
  background: #38bdf8;
  color: #0f172a;
}

.walkin.is-pta .walkin__submit {
  background: #f68b29;
  color: #121416;
}

.walkin__close {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: #94a3b8;
}

.walkin__submit:disabled,
.walkin__close:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
