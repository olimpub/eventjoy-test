<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex items-center justify-center min-h-screen bg-brand-dark text-white relative overflow-hidden q-pa-md">

        <!-- Watermark (matches IndexPage) -->
        <div class="login-watermark pointer-events-none select-none" aria-hidden="true">
          <img :src="EVENTJOY_BRAND.icon" alt="" />
        </div>

        <!-- Ambient Animated Background Glows -->
        <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div class="blob-1 absolute top-[-5%] left-[-5%] w-[60%] h-[60%] rounded-full mix-blend-screen"></div>
          <div class="blob-2 absolute bottom-[-5%] right-[-5%] w-[70%] h-[70%] rounded-full mix-blend-screen"></div>
        </div>

        <!-- Login Card Wrapper -->
        <div class="login-card relative z-10 w-full max-w-md flex flex-col justify-start">
          
          <!-- Top Branding Logo -->
          <div class="login-header text-center q-mb-xl flex flex-col items-center">
            <img
              :src="EVENTJOY_BRAND.logoDark"
              :alt="`${EVENTJOY_BRAND.name} logo`"
              class="login-logo object-contain q-mb-sm"
            />
            <p v-if="step === 'identity'" class="login-tagline">{{ EVENTJOY_BRAND.tagline }}</p>
            <h1 class="login-title">
              {{ step === 'identity' ? 'Üdvözlünk az EventJoy-ban!' : (step === 'register' ? 'Hozd létre a fiókod' : 'Üdv újra!') }}
            </h1>
            <p class="login-subtitle">
              {{ step === 'identity' ? 'Kérlek, add meg az azonosítód a folytatáshoz.' : (step === 'register' ? 'Úgy látjuk, új vagy nálunk! Állíts be egy jelszót.' : 'Kérlek, igazold a személyazonosságod.') }}
            </p>
          </div>

          <!-- Form Container with Smooth Transitions -->
          <div class="form-container min-h-[160px] relative overflow-hidden q-px-xs">
            <Transition name="slide-fade" mode="out-in">
              
              <!-- 1. STEP: IDENTITY (EMAIL VAGY PHONE) -->
              <div v-if="step === 'identity'" key="identity" class="flex flex-col gap-4">
                
                <!-- Típus választó (Email / Telefon) -->
                <div class="login-type-toggle">
                  <button 
                    type="button"
                    @click.prevent="loginType = 'email'; identity = ''"
                    class="login-type-btn"
                    :class="{ 'login-type-btn--active': loginType === 'email' }"
                  >
                    <q-icon name="mail" size="18px" />
                    <span>E-mail</span>
                  </button>
                  <button 
                    type="button"
                    @click.prevent="loginType = 'phone'; identity = ''"
                    class="login-type-btn"
                    :class="{ 'login-type-btn--active': loginType === 'phone' }"
                  >
                    <q-icon name="phone" size="18px" />
                    <span>Telefon</span>
                  </button>
                </div>

                <div class="input-group">
                  <q-input 
                    v-model="identity" 
                    :label="loginType === 'email' ? 'E-mail cím' : 'Telefonszám'" 
                    :type="loginType === 'email' ? 'email' : 'tel'"
                    dark 
                    filled 
                    color="brand-primary" 
                    class="custom-input text-lg"
                    @keyup.enter="handleCheckIdentity"
                  >
                    <template v-slot:prepend>
                      <q-icon :name="loginType === 'email' ? 'mail' : 'phone'" color="slate-400" />
                    </template>
                  </q-input>
                </div>

                <div class="flex justify-center w-full q-mt-md">
                  <button 
                    type="button"
                    @click="handleCheckIdentity"
                    class="login-btn-primary login-btn-primary--full group"
                  >
                    <span>Tovább</span>
                    <q-icon name="arrow_forward" size="20px" class="q-ml-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              <!-- 2. STEP: PASSWORD LOGIN -->
              <div v-else-if="step === 'password'" key="password" class="flex flex-col gap-4">
                <div class="text-center q-py-sm">
                  <p class="login-identity-value m-0">{{ identity }}</p>
                </div>

                <div class="input-group">
                  <q-input 
                    v-model="password" 
                    label="Jelszó"
                    :type="showPassword ? 'text' : 'password'" 
                    dark 
                    filled 
                    color="brand-primary" 
                    class="custom-input"
                    @keyup.enter="handlePasswordLogin"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" color="slate-400" />
                    </template>
                    <template v-slot:append>
                      <q-icon 
                        :name="showPassword ? 'visibility_off' : 'visibility'" 
                        class="cursor-pointer" 
                        color="slate-400"
                        @click="showPassword = !showPassword" 
                      />
                    </template>
                  </q-input>
                  <div class="flex justify-end mt-2 px-2">
                    <a href="#" class="login-link-muted">Elfelejtettem a jelszavam</a>
                  </div>
                </div>

                <div class="flex gap-3 q-mt-sm items-center justify-center">
                  <button type="button" class="login-btn-secondary" @click="step = 'identity'">Vissza</button>
                  <button 
                    type="button"
                    @click="handlePasswordLogin"
                    class="login-btn-primary login-btn-primary--split group"
                  >
                    <span>Belépés</span>
                    <q-icon name="login" size="20px" class="q-ml-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>

                <!-- OTP (Jelszó nélküli) opció -->
                <div class="w-full flex items-center justify-center gap-4 mt-4 mb-2">
                  <div class="h-[1px] flex-1 bg-white/10"></div>
                  <span class="login-divider-label">Vagy</span>
                  <div class="h-[1px] flex-1 bg-white/10"></div>
                </div>
                
                <q-btn 
                  class="login-btn-outline w-full q-mb-sm" 
                  @click="requestOtpDirectly" 
                  unelevated
                  no-caps
                >
                  Belépési kód kérése
                </q-btn>
              </div>

              <!-- 3. STEP: OTP CODE LOGIN -->
              <div v-else-if="step === 'otp'" key="otp" class="flex flex-col gap-4">
                <div class="text-center q-py-sm">
                  <p class="text-slate-300 text-sm m-0">Az ellenőrző kódot elküldtük ide:</p>
                  <p class="login-identity-value m-0">{{ identity }}</p>
                </div>

                <div class="input-group">
                  <q-input 
                    v-model="otpCode" 
                    label="6-jegyű kód" 
                    dark 
                    filled 
                    color="brand-primary" 
                    class="custom-input text-center font-mono letter-spacing-wide"
                    mask="######"
                    @keyup.enter="handleOtpLogin"
                  >
                    <template v-slot:prepend>
                      <q-icon name="vpn_key" color="slate-400" />
                    </template>
                  </q-input>
                </div>

                <div class="flex justify-center mt-2 px-2">
                   <a href="#" @click.prevent="requestOtpDirectly" class="login-link">Nem kaptad meg? Újraküldés.</a>
                </div>

                <div class="flex gap-3 q-mt-sm items-center justify-center">
                  <button type="button" class="login-btn-secondary" @click="step = 'identity'">Vissza</button>
                  <button 
                    type="button"
                    @click="handleOtpLogin"
                    class="login-btn-primary login-btn-primary--split group"
                  >
                    <span>Megerősítés</span>
                    <q-icon name="check_circle" size="20px" class="q-ml-sm transition-transform duration-300 group-hover:scale-110" />
                  </button>
                </div>
              </div>

              <!-- 4. STEP: REGISTER (NEW USER) -->
              <div v-else-if="step === 'register'" key="register" class="flex flex-col gap-4">
                <div class="text-center q-py-sm">
                  <p class="login-identity-value m-0">{{ identity }}</p>
                </div>

                <div class="input-group">
                  <q-input 
                    v-model="password" 
                    label="Új jelszó"
                    :type="showPassword ? 'text' : 'password'" 
                    dark 
                    filled 
                    color="brand-primary" 
                    class="custom-input"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock" color="slate-400" />
                    </template>
                  </q-input>
                </div>

                <div class="flex gap-3 q-mt-sm items-center justify-center">
                  <button type="button" class="login-btn-secondary" @click="step = 'identity'">Vissza</button>
                  <button 
                    type="button"
                    @click="handleRegister"
                    class="login-btn-primary login-btn-primary--split group"
                  >
                    <span>Létrehozás</span>
                    <q-icon name="person_add" size="20px" class="q-ml-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>

                <!-- OTP (Jelszó nélküli) opció -->
                <div class="w-full flex items-center justify-center gap-4 mt-4 mb-2">
                  <div class="h-[1px] flex-1 bg-white/10"></div>
                  <span class="login-divider-label">Vagy</span>
                  <div class="h-[1px] flex-1 bg-white/10"></div>
                </div>
                
                <q-btn 
                  class="login-btn-outline w-full q-mb-sm" 
                  @click="requestOtpDirectly" 
                  unelevated
                  no-caps
                >
                  Belépési kód kérése
                </q-btn>
              </div>

            </Transition>
          </div>

          <!-- Divider -->
          <div v-if="step === 'identity'" class="w-full flex items-center justify-center gap-4 mt-8 mb-6 transition-opacity duration-300">
            <div class="h-[1px] flex-1 bg-white/10"></div>
            <span class="login-divider-label">Vagy folytasd ezzel</span>
            <div class="h-[1px] flex-1 bg-white/10"></div>
          </div>

          <!-- Social Login Form -->
          <div v-if="step === 'identity'" class="flex flex-col gap-4 transition-opacity duration-300">
            <div style="display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 20px !important; width: 100% !important; max-width: 340px !important; margin: 0 auto !important; padding: 4px 0 !important;">
              <!-- Google -->
              <button 
                @click="socialLogin('Google')"
                style="width: 64px; height: 64px; flex-shrink: 0; background: rgba(255, 255, 255, 0.03) !important; backdrop-filter: blur(12px) !important; border: 1.5px solid rgba(66, 133, 244, 0.4) !important; box-shadow: 0 0 15px rgba(66, 133, 244, 0.15) !important; border-radius: 50% !important;"
                class="flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 active:scale-95 outline-none hover:border-[rgba(66,133,244,0.85)]! hover:shadow-[0_0_22px_rgba(66,133,244,0.4)]! opacity-90 hover:opacity-100"
              >
                <q-icon name="mdi-google" size="28px" style="color: #FFFFFF;" />
              </button>
              <!-- Facebook -->
              <button 
                @click="socialLogin('Facebook')"
                style="width: 64px; height: 64px; flex-shrink: 0; background: rgba(255, 255, 255, 0.03) !important; backdrop-filter: blur(12px) !important; border: 1.5px solid rgba(24, 119, 242, 0.4) !important; box-shadow: 0 0 15px rgba(24, 119, 242, 0.15) !important; border-radius: 50% !important;"
                class="flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 active:scale-95 outline-none hover:border-[rgba(24,119,242,0.85)]! hover:shadow-[0_0_22px_rgba(24,119,242,0.4)]! opacity-90 hover:opacity-100"
              >
                <q-icon name="mdi-facebook" size="28px" style="color: #FFFFFF;" />
              </button>
              <!-- Apple -->
              <button 
                @click="socialLogin('Apple')"
                style="width: 64px; height: 64px; flex-shrink: 0; background: rgba(255, 255, 255, 0.03) !important; backdrop-filter: blur(12px) !important; border: 1.5px solid rgba(255, 255, 255, 0.2) !important; box-shadow: 0 0 15px rgba(255, 255, 255, 0.08) !important; border-radius: 50% !important;"
                class="flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-115 active:scale-95 outline-none hover:border-[rgba(255,255,255,0.7)]! hover:shadow-[0_0_22px_rgba(255,255,255,0.25)]! opacity-90 hover:opacity-100"
              >
                <q-icon name="mdi-apple" size="28px" style="color: #FFFFFF;" />
              </button>
            </div>
          </div>

        </div>
      </q-page>
    </q-page-container>
    <PtaBusyOverlay :model-value="workBusy" :label="workLabel" />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { api } from 'src/boot/axios'
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js'
import { fetchSocialProfile, socialApiErrorMessage, SocialAuthError } from 'src/utils/socialAuth'
import { EVENTJOY_BRAND } from 'src/assets/brand/eventjoy'
import PtaBusyOverlay from 'src/modules/profitability/components/PtaBusyOverlay.vue'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const workBusy = ref(false)
const workLabel = ref('Bejelentkezés…')

// State
const step = ref<'identity' | 'password' | 'otp' | 'register'>('identity')
const identity = ref('')
const password = ref('')
const otpCode = ref('')
const showPassword = ref(false)
const tempUserId = ref<number | null>(null)
const loginType = ref<'email' | 'phone'>('email')

// --- TELEFONSZÁM FORMÁZÓ LOGIKA (libphonenumber-js) ---
watch(identity, (newVal) => {
  if (!newVal || loginType.value === 'email') return
  
  // Automatikus 06 és 36 átalakítás +36-ra
  let inputToFormat = newVal
  const justDigitsAndPlus = newVal.replace(/[^\d+]/g, '')
  
  if (justDigitsAndPlus.startsWith('06')) {
    inputToFormat = '+36' + justDigitsAndPlus.substring(2)
  } else if (justDigitsAndPlus.startsWith('36')) {
    inputToFormat = '+36' + justDigitsAndPlus.substring(2)
  }

  // Profi "As You Type" formázó, alapértelmezetten Magyarországra hangolva
  const formatter = new AsYouType('HU')
  const formatted = formatter.input(inputToFormat)

  // Ha változott a formázott érték, frissítjük a felületen
  if (newVal !== formatted) {
    nextTick(() => {
      identity.value = formatted
    })
  }
})

// 1. Identity Check
async function handleCheckIdentity() {
  if (!identity.value) {
    showToast(`Add meg a${loginType.value === 'email' ? 'z e-mail címedet' : ' telefonszámodat'}!`, 'warning')
    return
  }
  
  // A backendre szóközök nélkül küldjük a telefonszámot!
  const rawIdentity = identity.value.trim().replace(/\s+/g, '')

  // Profi validáció beküldés előtt!
  if (loginType.value === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(identity.value)) {
      showToast('Kérjük, érvényes e-mail címet adj meg!', 'warning')
      return
    }
  } else {
    if (!isValidPhoneNumber(identity.value, 'HU')) {
      showToast('Érvénytelen telefonszám formátum!', 'warning')
      return
    }
  }

  showLoading('Ellenőrzés...')
  
  try {
    const result = await authStore.checkIdentity(rawIdentity)
    hideLoading()
    
    if (result.StatusID === 4) {
      showToast('Ez a fiók fel lett függesztve!', 'warning')
      return
    }

    if (result.UserExists) {
      tempUserId.value = result.UserID // Elmentjük a UserID-t az OTP híváshoz!
      
      if (result.HasPassword) {
        step.value = 'password' // Van jelszava, kérjük be
      } else {
        // Nincs jelszava, rögtön kérjük le az OTP kódot
        await requestOtpDirectly()
      }
    } else {
      // Nem létezik -> Regisztráció
      step.value = 'register'
    }
  } catch (error: any) {
    hideLoading()
    const msg = error.response?.data?.Result1?.ReturnDescription || 'Hiba történt a szerverrel való kommunikációban.'
    showToast(msg, 'warning')
  }
}

// Jelszó nélküli belépés / Kód kérése közvetlenül
async function requestOtpDirectly() {
  showLoading('Kód küldése folyamatban...')
  try {
    // Eldöntjük, hogy Email-t vagy Telefont küldünk be
    // A backendre szóközök nélkül küldjük a telefonszámot!
    const rawIdentity = identity.value.trim().replace(/\s+/g, '')
    const isEmail = rawIdentity.includes('@')
    const payload = isEmail ? { EmailAddress: rawIdentity } : { PhoneNumber: rawIdentity }
    
    await api.post('/auth/request-otp', payload)
    
    hideLoading()
    step.value = 'otp'
    showToast('Kódot elküldtük az azonosítódra!', 'info')
  } catch (error: any) {
    hideLoading()
    const msg = error.response?.data?.Result1?.ReturnDescription || 'Nem sikerült elküldeni a kódot.'
    showToast(msg, 'warning')
  }
}

// 2. Password Login
async function handlePasswordLogin() {
  if (!password.value) {
    showToast('Kérjük add meg a jelszavad!', 'warning')
    return
  }
  
  showLoading('Bejelentkezés folyamatban...')
  
  try {
    // Generate UUID if it doesn't exist yet (for DeviceId)
    let deviceId = localStorage.getItem('device_uuid')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_uuid', deviceId)
    }

    const payload = {
      IdentityValue: identity.value,
      Password: password.value,
      DeviceId: deviceId,
      DeviceName: 'EventJoy WebApp'
    }

    await authStore.passwordLogin(payload)
    
    // BOOT ADATOK BETÖLTÉSE (Események, Törzsadatok, Értesítések, SignalR indítás)
    showLoading('Adatok szinkronizálása...')
    await authStore.fetchBootData()
    
    hideLoading()
    showToast(`Üdvözlünk újra az EventJoy-ban!`, 'positive')
    router.push('/')
  } catch (error: any) {
    hideLoading()
    const msg = error.response?.data?.Result1?.ReturnDescription || 'Hibás jelszó!'
    showToast(msg, 'warning')
  }
}

// 3. OTP Login
async function handleOtpLogin() {
  if (otpCode.value.length < 6) {
    showToast('Kérjük adj meg egy érvényes 6-jegyű kódot!', 'warning')
    return
  }
  
  showLoading('Kód ellenőrzése...')
  
  try {
    let deviceId = localStorage.getItem('device_uuid')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_uuid', deviceId)
    }
    
    const rawIdentity = identity.value.trim().replace(/\s+/g, '')

    const payload = {
      IdentityValue: rawIdentity,
      ValidationCode: otpCode.value,
      DeviceId: deviceId,
      DeviceName: 'EventJoy WebApp'
    }

    await authStore.verifyOtp(payload)
    
    showLoading('Adatok szinkronizálása...')
    await authStore.fetchBootData()
    
    hideLoading()
    showToast('Sikeres belépés!', 'positive')
    router.push('/')
  } catch (error: any) {
    hideLoading()
    const msg = error.response?.data?.Result1?.ReturnDescription || 'Hibás vagy lejárt kód!'
    showToast(msg, 'warning')
  }
}

// 4. Register
async function handleRegister() {
  if (!password.value) {
    showToast('Kérjük adj meg egy jelszót!', 'warning')
    return
  }
  
  showLoading('Fiók létrehozása...')
  
  try {
    let deviceId = localStorage.getItem('device_uuid')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_uuid', deviceId)
    }

    const payload = {
      IdentityValue: identity.value,
      Password: password.value,
      DeviceId: deviceId,
      DeviceName: 'EventJoy WebApp'
    }

    await authStore.register(payload)
    
    showLoading('Környezet előkészítése...')
    await authStore.fetchBootData()
    
    hideLoading()
    showToast('Fiók sikeresen létrehozva!', 'positive')
    router.push('/')
  } catch (error: any) {
    hideLoading()
    const msg = error.response?.data?.Result1?.ReturnDescription || 'Hiba a regisztráció során!'
    showToast(msg, 'warning')
  }
}

// 5. Social Login
async function socialLogin(provider: string) {
  if (provider === 'Apple') {
    showToast('Az Apple bejelentkezés hamarosan elérhető lesz az iOS verzióval!', 'info')
    return
  }

  if (provider !== 'Google' && provider !== 'Facebook') return

  try {
    showLoading(provider === 'Google' ? 'Google bejelentkezés inicializálása...' : 'Facebook bejelentkezés inicializálása...')
    const profile = await fetchSocialProfile(provider)

    let deviceId = localStorage.getItem('device_uuid')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_uuid', deviceId)
    }

    showLoading('Bejelentkezés a rendszerbe...')
    await authStore.socialLogin({
      ...profile,
      DeviceId: deviceId,
      DeviceName: 'EventJoy WebApp',
    })

    showLoading('Adatok szinkronizálása...')
    await authStore.fetchBootData()

    hideLoading()
    showToast(
      provider === 'Google' ? 'Sikeres belépés a Google fiókkal!' : 'Sikeres belépés a Facebook fiókkal!',
      'positive'
    )
    router.push('/')
  } catch (error: unknown) {
    hideLoading()
    console.error(error)
    const cancelled = error instanceof SocialAuthError && error.cancelled
    showToast(
      socialApiErrorMessage(
        error,
        provider === 'Google'
          ? 'Hiba történt a Google bejelentkezés során.'
          : 'Hiba történt a Facebook bejelentkezés során.'
      ),
      cancelled ? 'warning' : 'warning'
    )
  }
}

// Global UI Helpers
function showToast(message: string, type: 'positive' | 'warning' | 'info') {
  const isWarning = type === 'warning'
  const isPositive = type === 'positive'
  
  $q.notify({
    message,
    icon: isWarning ? 'error_outline' : (isPositive ? 'check_circle' : 'info_outline'),
    color: 'dark', // Alap háttér, amit felülírunk
    textColor: isWarning ? 'red-4' : (isPositive ? 'green-4' : 'blue-4'),
    position: 'top',
    timeout: 3500,
    classes: `border ${isWarning ? 'border-red-500/40' : (isPositive ? 'border-green-500/40' : 'border-blue-500/40')} shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-xl q-px-lg q-py-md font-bold tracking-wide text-[14px] mt-4`,
    style: 'background: rgba(11, 15, 25, 0.85);'
  })
}

function showLoading(message: string) {
  workLabel.value = message
  workBusy.value = true
}

function hideLoading() {
  workBusy.value = false
}
</script>

<style scoped lang="scss">
@keyframes blob-float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  33% { transform: translate(30px, -40px) scale(1.15); opacity: 0.7; }
  66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
}

@keyframes blob-float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  33% { transform: translate(-40px, 30px) scale(1.15); opacity: 0.7; }
  66% { transform: translate(30px, -20px) scale(0.85); opacity: 0.5; }
}

.blob-1 {
  animation: blob-float-1 18s infinite ease-in-out;
  background: rgba(14, 165, 233, 0.35);
  filter: blur(90px);
}

.blob-2 {
  animation: blob-float-2 22s infinite ease-in-out;
  background: rgba(20, 184, 166, 0.28);
  filter: blur(120px);
}

.login-watermark {
  position: absolute;
  right: -6rem;
  top: 12%;
  width: 22rem;
  height: 22rem;
  opacity: 0.03;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.login-card {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 2rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
  transition: all 0.5s ease;

  @media (min-width: 640px) {
    padding: 2rem;
    border-radius: 2.5rem;
  }
}

.login-logo {
  height: 42px;
  width: auto;
}

.login-tagline {
  margin: 0 0 0.75rem;
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.04em;
}

.login-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.02em;
  line-height: 1.25;
}

.login-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.45;
}

.login-identity-value {
  font-size: 16px;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 0.02em;
  word-break: break-all;
}

.login-type-toggle {
  display: flex;
  gap: 12px;
  margin: 8px 0 20px;
}

.login-type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.25s ease;

  &--active {
    background: #0ea5e9;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
  }
}

.login-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  border: none;
  border-radius: 9999px;
  background: var(--ej-gradient);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  cursor: pointer;
  outline: none;
  transition: filter 0.2s ease, transform 0.15s ease;

  &:hover {
    filter: brightness(1.08);
  }

  &:active {
    transform: scale(0.98);
  }

  &--full {
    width: 100%;
  }

  &--split {
    flex: 1;
    min-width: 0;
  }
}

.login-btn-secondary {
  flex-shrink: 0;
  height: 52px;
  padding: 0 20px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.25);
  }
}

.login-btn-outline {
  height: 52px !important;
  border-radius: 9999px !important;
  background: rgba(14, 165, 233, 0.12) !important;
  border: 1px solid rgba(14, 165, 233, 0.28) !important;
  color: #38bdf8 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;

  &:hover {
    background: rgba(14, 165, 233, 0.2) !important;
  }
}

.login-divider-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.login-link {
  font-size: 13px;
  font-weight: 700;
  color: #38bdf8;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #ffffff;
  }
}

.login-link-muted {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-decoration: none;

  &:hover {
    color: #38bdf8;
    text-decoration: underline;
  }
}

.custom-input {
  :deep(.q-field__control) {
    border-radius: 1rem !important;
    background-color: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    transition: all 0.25s ease;
    &:before, &:after { display: none !important; }
  }
  :deep(.q-field__control:hover) {
    border-color: rgba(14, 165, 233, 0.3) !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
  :deep(.q-field--focused .q-field__control) {
    border-color: var(--q-primary) !important;
    box-shadow: 0 0 12px rgba(14, 165, 233, 0.15) !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
  :deep(.q-field__native), :deep(.q-field__input) {
    color: #ffffff !important;
    font-size: 0.875rem !important;
  }
}

.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(10px); opacity: 0; }
</style>
