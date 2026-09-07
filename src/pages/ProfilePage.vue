<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden flex flex-col h-full">
    <!-- View: MENU -->
    <div v-if="activeView === 'menu'" class="q-pa-md flex flex-col h-full overflow-y-auto no-scrollbar">
      <!-- Section title — same language as Eseményeim / Saját eseményeim -->
      <div class="relative z-10 q-mb-md mt-4">
        <h2 class="profile-section-title">
          <q-icon name="person" color="#38bdf8" size="16px" />
          Profil
        </h2>
      </div>

      <!-- Profile header -->
      <div class="profile-card text-center q-pb-md q-px-md flex flex-col items-center justify-center relative overflow-hidden">
        <div class="avatar-glow absolute w-24 h-24 bg-brand-primary/20 rounded-full blur-xl pointer-events-none"></div>

        <q-avatar size="80px" class="bg-[#0F172A] text-brand-primary border-2 border-brand-primary/30 shadow-[0_4px_20px_rgba(14,165,233,0.25)] z-10">
          <q-icon v-if="!authStore.user?.LastName && !authStore.user?.FirstName" name="person" size="40px" />
          <span v-else class="profile-avatar-initials">{{ (authStore.user?.LastName?.charAt(0) || '') + (authStore.user?.FirstName?.charAt(0) || '') }}</span>
        </q-avatar>

        <div class="profile-user-name z-10">
          {{ authStore.user?.LastName || '' }} {{ authStore.user?.FirstName || 'Felhasználó' }}
        </div>
        <p class="profile-user-email z-10">{{ authStore.user?.Email || authStore.user?.EmailAddress || '' }}</p>
      </div>

      <!-- Menu list — glass card, brand cyan (no indigo) -->
      <div class="menu-container q-mt-sm flex-grow">
        <div class="profile-menu-card">
          <button type="button" class="profile-menu-row" @click="activeView = 'adataim'">
            <span class="profile-menu-icon">
              <q-icon name="badge" size="22px" />
            </span>
            <span class="profile-menu-label">Adataim</span>
            <q-icon name="chevron_right" size="20px" class="profile-menu-chevron" />
          </button>

          <button type="button" class="profile-menu-row" @click="activeView = 'preferenciak'">
            <span class="profile-menu-icon">
              <q-icon name="favorite_border" size="22px" />
            </span>
            <span class="profile-menu-label">Preferenciák</span>
            <q-icon name="chevron_right" size="20px" class="profile-menu-chevron" />
          </button>

          <button type="button" class="profile-menu-row" @click="activeView = 'beallitasok'">
            <span class="profile-menu-icon">
              <q-icon name="settings" size="22px" />
            </span>
            <span class="profile-menu-label">Beállítások</span>
            <q-icon name="chevron_right" size="20px" class="profile-menu-chevron" />
          </button>

          <button type="button" class="profile-menu-row" @click="openQrScanner">
            <span class="profile-menu-icon profile-menu-icon--emerald">
              <q-icon name="qr_code_scanner" size="22px" />
            </span>
            <span class="profile-menu-label">QR-kód olvasó</span>
            <q-icon name="chevron_right" size="20px" class="profile-menu-chevron" />
          </button>

          <div class="profile-menu-divider" aria-hidden="true" />

          <button type="button" class="profile-menu-row profile-menu-row--danger" @click="logout">
            <span class="profile-menu-icon profile-menu-icon--rose">
              <q-icon name="logout" size="22px" />
            </span>
            <span class="profile-menu-label">Kijelentkezés</span>
          </button>
        </div>
      </div>
    </div>

    <!-- View: ADATAIM -->
    <div v-else-if="activeView === 'adataim'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-transparent border-b border-white/10 q-py-sm z-20" style="backdrop-filter: blur(16px); background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 100%);">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-brand-primary bg-white/5 hover:bg-white/10 transition-all ml-2" />
        <q-toolbar-title class="profile-subview-title">
          Adataim
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 profile-save-btn"
          @click="savePersonalData"
        />
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <!-- Személyes adatok kártya -->
        <div class="mb-6 flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="person" size="18px" /> Személyes Adatok
            </div>
          </div>
          <div class="profile-field-stack profile-field-stack--compact" v-if="authStore.user">
            <div class="profile-field">
              <label class="profile-field__label">Vezetéknév</label>
              <q-input
                v-model="authStore.user.LastName"
                dark
                outlined
                dense
                hide-bottom-space
                class="profile-input profile-input--cyan"
                input-class="profile-input__native"
              />
            </div>
            <div class="profile-field">
              <label class="profile-field__label">Keresztnév</label>
              <q-input
                v-model="authStore.user.FirstName"
                dark
                outlined
                dense
                hide-bottom-space
                class="profile-input profile-input--cyan"
                input-class="profile-input__native"
              />
            </div>
            <div class="profile-field">
              <label class="profile-field__label">E-mail cím</label>
              <q-input
                v-model="authStore.user.EmailAddress"
                dark
                outlined
                dense
                hide-bottom-space
                type="email"
                class="profile-input profile-input--cyan"
                input-class="profile-input__native"
              />
            </div>
          </div>
          <div v-else class="text-slate-400 text-sm text-center py-4">Adatok betöltése...</div>
        </div>

        <!-- Csatolt fiókok (Google / Facebook) -->
        <div class="mb-6 flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-sky-400"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="link" size="18px" /> Csatolt fiókok
            </div>
          </div>
          <div class="flex flex-col gap-3 mt-2">
            <div
              v-for="row in socialProviderRows"
              :key="row.id"
              class="flex items-center gap-3 px-4 py-3"
              style="background: rgba(11, 15, 25, 0.5); border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.12);"
            >
              <div
                class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
                :style="row.iconStyle"
              >
                <SocialProviderIcon :provider="row.id" :size="20" />
              </div>
              <div class="flex-grow min-w-0">
                <div class="text-sky-50 font-bold text-sm tracking-wide">{{ row.label }}</div>
                <div v-if="row.linked" class="text-[11px] text-sky-300/80 font-bold mt-0.5 truncate">
                  {{ row.linked.EmailAddress || 'Csatolva' }}
                </div>
                <div v-else-if="row.soon" class="text-[11px] text-slate-500 font-bold mt-0.5">Hamarosan</div>
                <div v-else class="text-[11px] text-slate-500 font-bold mt-0.5">Nincs csatolva</div>
              </div>
              <q-btn
                v-if="row.soon"
                unelevated
                no-caps
                disable
                dense
                label="Hamarosan"
                class="social-link-btn social-link-btn--soon shrink-0"
              />
              <q-btn
                v-else-if="row.linked"
                unelevated
                no-caps
                dense
                label="Leválasztás"
                class="social-link-btn social-link-btn--unlink shrink-0"
                @click="askUnlinkSocial(row.id)"
              />
              <q-btn
                v-else
                unelevated
                no-caps
                dense
                label="Csatolás"
                class="social-link-btn social-link-btn--link shrink-0"
                @click="startLinkSocial(row.id)"
              />
            </div>
          </div>
        </div>

        <!-- Számlázási címek -->
        <div class="mb-6 flex flex-col relative" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-[24px]"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="receipt_long" size="18px" /> Számlázási címek
            </div>
            <q-btn round icon="add" color="emerald-500" class="shadow-[0_8px_20px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform" @click="openBillingDialog('add')" />
          </div>
          <div v-if="authStore.billingAddress && (Array.isArray(authStore.billingAddress) ? authStore.billingAddress.length > 0 : Object.keys(authStore.billingAddress).length > 0)" class="flex flex-col gap-3 mt-2">
            <div v-for="(addr, idx) in (Array.isArray(authStore.billingAddress) ? authStore.billingAddress : [authStore.billingAddress])" :key="idx" 
                 class="relative p-4 flex flex-col justify-center cursor-pointer hover:brightness-110 transition-all" 
                 style="background: rgba(15, 23, 42, 0.4); border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.15); box-shadow: inset 0 0 20px rgba(0,0,0,0.2);"
                 @click="openBillingDialog('edit', addr)">
              <div class="flex items-center justify-between gap-2 mb-1">
                <div class="font-black text-emerald-50 text-base tracking-wide">{{ addr.IsCompany ? addr.CompanyName : addr.BillingName }}</div>
                <q-badge v-if="addr.IsDefault" color="emerald-500" class="text-[10px] font-bold rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] shrink-0">Alapértelmezett</q-badge>
              </div>
              <div class="text-sm text-emerald-100/90 font-bold mt-1">
                {{ addr.CountryCode }} {{ addr.PostalCode }} {{ addr.City }}, {{ addr.AddressLine1 }} <span v-if="addr.AddressLine2">{{ addr.AddressLine2 }}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <div class="text-[11px] text-emerald-500/80 font-bold uppercase tracking-wider" v-if="addr.IsCompany && addr.CompanyTaxNumber">Adószám: {{ addr.CompanyTaxNumber }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-xl">
            Nincs rögzített számlázási cím
          </div>
        </div>

        <!-- Alternatív Elérhetőségek (Login Identifiers) -->
        <div class="mb-6 flex flex-col relative" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-[24px]"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="contact_phone" size="18px" /> Elérhetőségek
            </div>
            <!-- Gomb áthelyezve a kártyán belülre, jobbra igazítva -->
            <q-btn round icon="add" color="amber-500" class="shadow-[0_8px_20px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform" @click="openIdentifierDialog" />
          </div>
          <div v-if="authStore.loginIdentifiers && (Array.isArray(authStore.loginIdentifiers) ? authStore.loginIdentifiers.length > 0 : Object.keys(authStore.loginIdentifiers).length > 0)" class="flex flex-col gap-3 mt-2">
            <div v-for="(ident, idx) in (Array.isArray(authStore.loginIdentifiers) ? authStore.loginIdentifiers : [authStore.loginIdentifiers])" :key="idx" 
                 class="flex items-center justify-between px-4 py-3 bg-[#0B0F19]/50 rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <q-icon :name="ident.IdentifierTypeID === 1 ? 'email' : (ident.IdentifierTypeID === 2 ? 'phone' : 'contact_mail')" color="amber-400" size="16px" />
                </div>
                <div>
                  <div class="text-amber-100 font-bold text-sm tracking-wide">
                    {{ ident.IdentifierValueRaw }}
                  </div>
                </div>
              </div>
              <q-btn flat round icon="delete_outline" class="text-slate-500 hover:text-rose-400 transition-colors" @click="confirmDeleteIdentifier(ident, idx)" />
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold bg-[#0B0F19]/50 rounded-xl">
            Nincs rögzített alternatív elérhetőség
          </div>
        </div>

        <!-- Szervezetek (Owner / Manager) — utolsó kártya -->
        <div class="mb-6 flex flex-col relative" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-[24px]"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #fb923c; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="apartment" size="18px" /> Szervezetek
            </div>
            <q-btn round icon="add" color="orange-500" class="shadow-[0_8px_20px_rgba(249,115,22,0.5)] hover:scale-110 transition-transform" @click="openOrganizationDialog" />
          </div>

          <div v-if="manageableUserOrganizations.length" class="flex flex-col gap-3 mt-2">
            <div
              v-for="row in manageableUserOrganizations"
              :key="row.userOrg.id"
              class="flex items-center gap-3 px-3 py-3"
              style="background: rgba(15, 23, 42, 0.4); border-radius: 16px; border: 1px solid rgba(249, 115, 22, 0.18);"
            >
              <q-btn
                flat
                round
                dense
                :icon="row.userOrg.IsPrimary ? 'star' : 'star_border'"
                :class="row.userOrg.IsPrimary ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'"
                class="transition-colors"
                @click="setPrimaryOrganization(row.userOrg.id)"
              >
                <q-tooltip>{{ row.userOrg.IsPrimary ? 'Alapértelmezett' : 'Beállítás alapértelmezettnek' }}</q-tooltip>
              </q-btn>

              <div class="flex-grow min-w-0">
                <div class="font-black text-orange-50 text-base tracking-wide truncate">{{ row.displayName }}</div>
                <div class="text-xs text-orange-300/80 font-bold mt-0.5">{{ row.typeName }}</div>
              </div>

              <q-badge
                v-if="row.userOrg.IsPrimary"
                color="orange-500"
                class="text-[10px] font-bold rounded-lg shrink-0"
              >
                Alapértelmezett
              </q-badge>

              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                class="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                @click="confirmLeaveOrganization(row)"
              />
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-xl">
            Nincs kezelhető szervezet
          </div>
        </div>

      </div>

      <!-- Számlázási cím Bottom Sheet Dialog -->
      <q-dialog v-model="isBillingDialogVisible" position="bottom">
        <q-card style="width: 100%; border-top-left-radius: 32px; border-top-right-radius: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
          <!-- Handle bar for swipe down indication -->
          <div class="w-full flex justify-center pt-3 pb-1">
            <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
          </div>
          
          <q-card-section class="q-pt-sm">
            <div style="font-size: 14px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; margin-top: 8px;">
              {{ billingDialogMode === 'add' ? 'Új számlázási cím' : 'Számlázási cím szerkesztése' }}
            </div>
            
            <div ref="billingFormScrollRef" class="billing-form-scroll profile-field-stack">
              
              <!-- Toggles: IsDefault & IsCompany -->
              <div class="grid grid-cols-2 gap-3">
                <div class="profile-toggle-card">
                  <div class="profile-toggle-card__label">Alapértelmezett</div>
                  <q-toggle v-model="currentBillingAddress.IsDefault" color="emerald-400" dense />
                </div>
                <div class="profile-toggle-card">
                  <div class="profile-toggle-card__label">Céges</div>
                  <q-toggle v-model="currentBillingAddress.IsCompany" color="emerald-400" dense />
                </div>
              </div>
              
              <q-separator color="white" class="opacity-10 my-1" />
              
              <!-- Név / Cégnév -->
              <template v-if="currentBillingAddress.IsCompany">
                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--emerald">Cégnév</label>
                  <q-input v-model="currentBillingAddress.CompanyName" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">Adószám</label>
                    <q-input v-model="currentBillingAddress.CompanyTaxNumber" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">Közösségi adószám</label>
                    <q-input v-model="currentBillingAddress.CompanyVatNumber" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                </div>
              </template>
              
              <div class="profile-field">
                <label class="profile-field__label profile-field__label--emerald">Számlázási Név (Kapcsolattartó)</label>
                <q-input v-model="currentBillingAddress.BillingName" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
              </div>

              <!-- Cím adatok -->
              <q-separator color="white" class="opacity-10 my-2" />
              <div class="grid grid-cols-4 gap-3">
                <div class="profile-field col-span-1">
                  <label class="profile-field__label profile-field__label--emerald">Ország</label>
                  <q-input v-model="currentBillingAddress.CountryCode" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                </div>
                <div class="profile-field col-span-1">
                  <label class="profile-field__label profile-field__label--emerald">Ir.szám</label>
                  <q-input v-model="currentBillingAddress.PostalCode" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                </div>
                <div class="profile-field col-span-2">
                  <label class="profile-field__label profile-field__label--emerald">Város</label>
                  <q-input v-model="currentBillingAddress.City" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                </div>
              </div>
              
              <div class="profile-field">
                <label class="profile-field__label profile-field__label--emerald">Utca, házszám</label>
                <q-input v-model="currentBillingAddress.AddressLine1" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
              </div>
              
              <div class="flex justify-center mt-2 mb-1">
                <q-btn 
                  flat 
                  no-caps 
                  :icon-right="showMoreBillingDetails ? 'expand_less' : 'expand_more'" 
                  :label="showMoreBillingDetails ? 'Kevesebb adat' : 'További adatok (opcionális)'" 
                  color="emerald-400" 
                  class="bg-emerald-500/10 rounded-xl text-xs font-bold px-4 py-1.5"
                  @click="toggleMoreBillingDetails"
                />
              </div>

              <q-slide-transition>
                <div
                  v-if="showMoreBillingDetails"
                  ref="billingExtraFieldsRef"
                  class="billing-extra-fields profile-field-stack"
                >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">Emelet, ajtó</label>
                    <q-input v-model="currentBillingAddress.AddressLine2" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">Megye / Régió</label>
                    <q-input v-model="currentBillingAddress.StateOrRegion" dark outlined dense hide-bottom-space class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                </div>

                <!-- Elérhetőségek -->
                <q-separator color="white" class="opacity-10 my-1" />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">E-mail</label>
                    <q-input v-model="currentBillingAddress.BillingEmail" dark outlined dense hide-bottom-space type="email" class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                  <div class="profile-field">
                    <label class="profile-field__label profile-field__label--emerald">Telefon</label>
                    <q-input v-model="currentBillingAddress.BillingPhone" dark outlined dense hide-bottom-space type="tel" class="profile-input profile-input--emerald" input-class="profile-input__native" />
                  </div>
                </div>
                </div>
              </q-slide-transition>
              
            </div>
          </q-card-section>

          <q-card-actions class="q-pa-md pt-2 mb-4 grid grid-cols-2 gap-3">
            <q-btn flat no-caps label="Mégsem" color="white" class="bg-white/5 hover:bg-white/10 rounded-xl font-bold py-3" v-close-popup />
            <q-btn unelevated no-caps label="Mentés" color="emerald-500" class="rounded-xl font-bold py-3 shadow-[0_4px_15px_rgba(16,185,129,0.4)]" @click="saveBillingAddress" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Szervezet hozzáadása Bottom Sheet -->
      <q-dialog v-model="isOrganizationDialogVisible" position="bottom">
        <q-card style="width: 100%; border-top-left-radius: 32px; border-top-right-radius: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(249, 115, 22, 0.35); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
          <div class="w-full flex justify-center pt-3 pb-1">
            <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
          </div>

          <q-card-section class="q-pt-sm q-pb-none flex items-center justify-between px-5">
            <q-btn
              v-if="orgDialogMode === 'create'"
              flat
              round
              dense
              icon="arrow_back"
              class="text-orange-300 bg-white/5"
              @click="orgDialogMode = 'join'"
            />
            <div v-else class="w-10" />
            <div style="font-size: 14px; font-weight: 800; color: #fb923c; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
              {{ orgDialogMode === 'create' ? 'Új szervezet' : 'Szervezet hozzáadása' }}
            </div>
            <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
          </q-card-section>

          <q-card-section class="q-pt-md">
            <div ref="orgFormScrollRef" class="billing-form-scroll profile-field-stack">
              <!-- JOIN: keresés + designos Új szervezet CTA -->
              <template v-if="orgDialogMode === 'join'">
                <button
                  type="button"
                  class="org-create-cta w-full text-left mb-4"
                  @click="orgDialogMode = 'create'"
                >
                  <span class="org-create-cta__icon">
                    <q-icon name="add_business" size="22px" />
                  </span>
                  <span class="org-create-cta__body">
                    <span class="org-create-cta__title">Új szervezet</span>
                    <span class="org-create-cta__sub">Létrehozás tulajdonosként</span>
                  </span>
                  <q-icon name="chevron_right" size="22px" class="org-create-cta__chevron" />
                </button>

                <div class="w-full flex items-center gap-3 mb-3">
                  <div class="h-px flex-1 bg-white/10" />
                  <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500">vagy keresés</span>
                  <div class="h-px flex-1 bg-white/10" />
                </div>

                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--orange">Keresés név / rövid név</label>
                  <q-input
                    v-model="orgSearchQuery"
                    dark
                    outlined
                    dense
                    hide-bottom-space
                    clearable
                    class="profile-input profile-input--orange"
                    input-class="profile-input__native"
                    placeholder="pl. TE-TEST"
                  >
                    <template #prepend>
                      <q-icon name="search" color="slate-400" />
                    </template>
                  </q-input>
                </div>

                <div class="text-[11px] text-slate-500 font-bold uppercase tracking-wider px-1">
                  Beosztás: {{ managerUserTypeName }} (alapértelmezett)
                </div>

                <div v-if="joinableOrganizations.length" class="flex flex-col gap-2 max-h-[36vh] overflow-y-auto no-scrollbar">
                  <button
                    v-for="org in joinableOrganizations"
                    :key="org.id"
                    type="button"
                    class="text-left px-4 py-3 rounded-xl transition-all border"
                    :class="selectedJoinOrgId === org.id
                      ? 'bg-orange-500/20 border-orange-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'"
                    @click="selectedJoinOrgId = org.id"
                  >
                    <div class="font-bold text-orange-50 text-sm">{{ org.ShortName?.trim() || org.Name }}</div>
                    <div v-if="org.ShortName?.trim()" class="text-xs text-slate-400 mt-0.5 truncate">{{ org.Name }}</div>
                  </button>
                </div>
                <div v-else class="text-center py-6 text-slate-500 text-xs font-bold border border-dashed border-white/10 rounded-xl">
                  Nincs csatlakozható szervezet
                </div>
              </template>

              <!-- CREATE: új szervezet -->
              <template v-else>
                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--orange">Szervezet típusa</label>
                  <q-select
                    v-model="newOrgForm.OrganizationTypeID"
                    :options="organizationTypeOptions"
                    emit-value
                    map-options
                    dark
                    outlined
                    dense
                    hide-bottom-space
                    class="profile-input profile-input--orange"
                    popup-content-class="bg-slate-900 text-white"
                  />
                </div>

                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--orange">Beosztás</label>
                  <q-input
                    :model-value="ownerUserTypeName"
                    dark
                    outlined
                    dense
                    hide-bottom-space
                    readonly
                    class="profile-input profile-input--orange"
                    input-class="profile-input__native"
                  />
                </div>

                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--orange">Név</label>
                  <q-input
                    v-model="newOrgForm.Name"
                    dark
                    outlined
                    dense
                    hide-bottom-space
                    class="profile-input profile-input--orange"
                    input-class="profile-input__native"
                    placeholder="pl. TE Teszt Organizáció"
                  />
                </div>

                <div class="profile-field">
                  <label class="profile-field__label profile-field__label--orange">Rövid név <span class="text-slate-500 font-normal">(opcionális)</span></label>
                  <q-input
                    v-model="newOrgForm.ShortName"
                    dark
                    outlined
                    dense
                    hide-bottom-space
                    class="profile-input profile-input--orange"
                    input-class="profile-input__native"
                    placeholder="pl. TE-TEST"
                  />
                </div>

                <div class="flex justify-center mt-1 mb-1">
                  <q-btn
                    flat
                    no-caps
                    :icon-right="showMoreOrgDetails ? 'expand_less' : 'expand_more'"
                    :label="showMoreOrgDetails ? 'Kevesebb adat' : 'További adatok (opcionális)'"
                    class="bg-orange-500/10 rounded-xl text-xs font-bold px-4 py-1.5 text-orange-300"
                    @click="toggleMoreOrgDetails"
                  />
                </div>

                <q-slide-transition>
                  <div v-if="showMoreOrgDetails" ref="orgExtraFieldsRef" class="profile-field-stack">
                    <div class="grid grid-cols-4 gap-3">
                      <div class="profile-field col-span-1">
                        <label class="profile-field__label profile-field__label--orange">Ország</label>
                        <q-input v-model="newOrgForm.CountryCode" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                      </div>
                      <div class="profile-field col-span-1">
                        <label class="profile-field__label profile-field__label--orange">Ir.szám</label>
                        <q-input v-model="newOrgForm.PostalCode" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                      </div>
                      <div class="profile-field col-span-2">
                        <label class="profile-field__label profile-field__label--orange">Város</label>
                        <q-input v-model="newOrgForm.City" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                      </div>
                    </div>
                    <div class="profile-field">
                      <label class="profile-field__label profile-field__label--orange">Utca, házszám</label>
                      <q-input v-model="newOrgForm.AddressLine1" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                    </div>
                    <div class="profile-field">
                      <label class="profile-field__label profile-field__label--orange">Emelet, ajtó</label>
                      <q-input v-model="newOrgForm.AddressLine2" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                    </div>
                    <q-separator color="white" class="opacity-10 my-1" />
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="profile-field">
                        <label class="profile-field__label profile-field__label--orange">E-mail</label>
                        <q-input v-model="newOrgForm.Email" type="email" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                      </div>
                      <div class="profile-field">
                        <label class="profile-field__label profile-field__label--orange">Telefon</label>
                        <q-input v-model="newOrgForm.Phone" type="tel" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                      </div>
                    </div>
                    <div class="profile-field">
                      <label class="profile-field__label profile-field__label--orange">Adószám</label>
                      <q-input v-model="newOrgForm.TaxId" dark outlined dense hide-bottom-space class="profile-input profile-input--orange" input-class="profile-input__native" />
                    </div>
                  </div>
                </q-slide-transition>
              </template>
            </div>
          </q-card-section>

          <q-card-actions class="q-pa-md pt-2 mb-4">
            <q-btn
              v-if="orgDialogMode === 'join'"
              unelevated
              no-caps
              label="Csatlakozás"
              color="orange-500"
              class="w-full rounded-xl font-bold py-3 shadow-[0_4px_15px_rgba(249,115,22,0.4)]"
              @click="saveOrganizationDialog"
            />
            <q-btn
              v-else
              unelevated
              no-caps
              label="Szervezet létrehozása"
              color="orange-500"
              class="w-full rounded-xl font-bold py-3 shadow-[0_4px_15px_rgba(249,115,22,0.4)]"
              @click="saveOrganizationDialog"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Új Elérhetőség Bottom Sheet Dialog -->
      <q-dialog v-model="isIdentifierDialogVisible" position="bottom">
        <q-card style="width: 100%; border-top-left-radius: 32px; border-top-right-radius: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
          
          <q-card-section class="q-pb-none flex justify-between items-center relative pt-6 pb-2 px-6">
            <div class="text-xs font-bold text-amber-400 uppercase tracking-widest">Elérhetőség hozzáadása</div>
            <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
          </q-card-section>
          
          <q-card-section class="px-6 py-4 max-h-[80vh] overflow-y-auto">
            
            <div class="flex gap-4 mb-6">
              <button 
                @click.prevent="identifierType = 'email'; newIdentifierValue = ''"
                :style="identifierType === 'email' ? 'background: rgba(245, 158, 11, 0.2); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.5); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);' : 'background: rgba(255, 255, 255, 0.05); color: #94A3B8; border: 1px solid rgba(255, 255, 255, 0.1);'"
                class="flex-1 py-4 px-4 rounded-full text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <q-icon name="email" size="20px" />
                <span>E-mail</span>
              </button>
              <button 
                @click.prevent="identifierType = 'phone'; newIdentifierValue = ''"
                :style="identifierType === 'phone' ? 'background: rgba(245, 158, 11, 0.2); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.5); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);' : 'background: rgba(255, 255, 255, 0.05); color: #94A3B8; border: 1px solid rgba(255, 255, 255, 0.1);'"
                class="flex-1 py-4 px-4 rounded-full text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <q-icon name="phone" size="20px" />
                <span>Telefon</span>
              </button>
            </div>

            <div class="profile-field">
              <label class="profile-field__label profile-field__label--amber">
                {{ identifierType === 'email' ? 'E-mail cím' : 'Telefonszám' }}
              </label>
              <q-input
                v-model="newIdentifierValue"
                :type="identifierType === 'email' ? 'email' : 'tel'"
                dark
                outlined
                dense
                hide-bottom-space
                class="profile-input profile-input--amber"
                input-class="profile-input__native"
                :placeholder="identifierType === 'email' ? 'pl. pelda@email.com' : 'pl. +36 30 123 4567'"
              />
            </div>

            <q-btn 
              unelevated
              class="w-full py-4 text-sm font-bold tracking-wider rounded-xl shadow-[0_8px_20px_rgba(245,158,11,0.3)] mb-4 hover:scale-[1.02] transition-transform"
              style="background-color: #f59e0b; color: black;"
              label="Hozzáadás"
              @click="saveIdentifier"
            />
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-dialog v-model="isSocialConfirmOpen">
        <q-card class="social-confirm" :class="{ 'social-confirm--danger': socialConfirmMode === 'unlink' }">
          <div class="social-confirm__icon" :class="{ 'is-danger': socialConfirmMode === 'unlink' }">
            <q-icon :name="socialConfirmMode === 'unlink' ? 'link_off' : 'link'" size="22px" />
          </div>
          <h2 class="social-confirm__title">{{ socialConfirmTitle }}</h2>
          <p class="social-confirm__message">{{ socialConfirmMessage }}</p>
          <div class="social-confirm__actions">
            <button type="button" class="social-confirm__btn social-confirm__btn--ghost" @click="isSocialConfirmOpen = false">
              Mégsem
            </button>
            <button
              type="button"
              class="social-confirm__btn"
              :class="socialConfirmMode === 'unlink' ? 'social-confirm__btn--danger' : 'social-confirm__btn--primary'"
              @click="confirmSocialAction"
            >
              {{ socialConfirmMode === 'unlink' ? 'Leválasztás' : 'Csatolás' }}
            </button>
          </div>
        </q-card>
      </q-dialog>

    </div>

    <!-- View: PREFERENCIÁK -->
    <div v-else-if="activeView === 'preferenciak'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-transparent border-b border-white/10 q-py-sm z-20" style="backdrop-filter: blur(16px); background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 100%);">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-brand-primary bg-white/5 hover:bg-white/10 transition-all ml-2" />
        <q-toolbar-title class="profile-subview-title">
          Preferenciák
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 profile-save-btn"
          @click="savePreferences"
        />
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <!-- Esemény Típusok kártya -->
        <div class="mb-6 flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="category" size="16px" color="#38bdf8" /> Eseménytípusok
              <q-btn round flat dense icon="info" size="xs" color="slate-400">
                <q-tooltip class="bg-slate-900 text-white shadow-4 text-xs font-bold border border-sky-500/30" :offset="[10, 10]" style="max-width: 250px;">
                  Válaszd ki azokat az esemény típusokat és cimkéket, amelyek érdekelnek, hogy a felületen az ilyen típusú események jelenjenek meg.
                </q-tooltip>
              </q-btn>
            </div>
            <q-btn round icon="add" class="profile-add-btn" @click="openEventTypesDialog" />
          </div>
          
          <div v-if="authStore.eventTypePreferences && authStore.eventTypePreferences.length > 0" class="flex flex-wrap mt-2" style="gap: 8px;">
            <div 
              v-for="pref in authStore.eventTypePreferences" 
              :key="'pref_type_' + pref.EventTypeID"
              class="inline-flex items-center justify-center font-bold rounded-full text-[14px] tracking-wide cursor-pointer transition-all hover:scale-105 max-w-full"
              style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 12px rgba(14,165,233,0.35); padding: 6px 16px;"
              @click="removeEventType(pref.EventTypeID)"
            >
              <span class="truncate block max-w-full">{{ getEventTypeName(pref.EventTypeID) }}</span>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold bg-[#0B0F19]/50 rounded-xl mt-2 border border-white/5">
            Nincsenek kiválasztott esemény típusok
          </div>
        </div>

        <!-- Címkék kártya -->
        <div class="mb-6 flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #ec4899; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="local_offer" size="18px" /> Címkék
              <q-btn round flat dense icon="info" size="xs" color="pink-400">
                <q-tooltip class="bg-pink-900 text-white shadow-4 text-xs font-bold border border-pink-500/30" :offset="[10, 10]" style="max-width: 250px;">
                  Válaszd ki azokat az esemény típusokat és cimkéket, amelyek érdekelnek, hogy a felületen az ilyen típusú események jelenjenek meg.
                </q-tooltip>
              </q-btn>
            </div>
            <q-btn round icon="add" color="pink-500" class="shadow-[0_8px_20px_rgba(236,72,153,0.5)] hover:scale-110 transition-transform" @click="openLabelsDialog" />
          </div>
          
          <div v-if="authStore.labelPreferences && authStore.labelPreferences.length > 0" class="flex flex-wrap mt-2" style="gap: 8px;">
            <div 
              v-for="pref in authStore.labelPreferences" 
              :key="'pref_label_' + pref.LabelID"
              class="inline-flex items-center justify-center font-bold rounded-full text-[15px] tracking-wide cursor-pointer transition-all hover:scale-105 max-w-full"
              style="background-color: #ec4899; color: white; box-shadow: 0 4px 12px rgba(236,72,153,0.4); padding: 6px 16px;"
              @click="removeLabel(pref.LabelID)"
            >
              <span class="truncate block max-w-full">{{ getLabelName(pref.LabelID) }}</span>
            </div>
          </div>
          <div v-else class="text-center py-6 text-slate-500 text-xs font-bold bg-[#0B0F19]/50 rounded-xl mt-2 border border-white/5">
            Nincsenek kiválasztott címkék
          </div>
        </div>

      </div>

      <!-- Esemény típusok Dialog -->
      <q-dialog v-model="isEventTypesDialogVisible" position="bottom">
        <q-card style="width: 100%; border-top-left-radius: 32px; border-top-right-radius: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(99, 102, 241, 0.3); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
          <q-card-section class="q-pb-none flex justify-between items-center relative pt-6 pb-2 px-6">
            <div class="text-xs font-bold text-sky-400 uppercase tracking-wider">Esemény típus hozzáadása</div>
            <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
          </q-card-section>
          
          <q-card-section class="px-6 py-4 max-h-[60vh] overflow-y-auto no-scrollbar">
            <div class="flex flex-wrap" style="gap: 8px;" v-if="availableEventTypes.length > 0">
              <div 
                v-for="type in availableEventTypes" 
                :key="'add_type_'+type.id"
                @click="addEventType(type.id)"
                class="inline-flex items-center justify-center font-bold rounded-full text-[15px] tracking-wide transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-slate-700 max-w-full"
                style="background-color: #334155; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 6px 16px;"
              >
                <span class="truncate block max-w-full">{{ type.TypeName || type.Name }}</span>
              </div>
            </div>
            <div v-else class="text-center py-6 text-slate-500 text-xs font-bold bg-[#0B0F19]/50 rounded-xl border border-white/5">
              Minden elérhető esemény típust kiválasztottál!
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Címkék Dialog -->
      <q-dialog v-model="isLabelsDialogVisible" position="bottom">
        <q-card style="width: 100%; border-top-left-radius: 32px; border-top-right-radius: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(236, 72, 153, 0.3); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);">
          <q-card-section class="q-pb-none flex justify-between items-center relative pt-6 pb-2 px-6">
            <div class="text-xs font-bold text-pink-400 uppercase tracking-widest">Címke hozzáadása</div>
            <q-btn icon="close" flat round dense v-close-popup class="text-slate-400 hover:text-white transition-colors bg-slate-800/50" size="sm" />
          </q-card-section>
          
          <q-card-section class="px-6 py-4 max-h-[60vh] overflow-y-auto no-scrollbar">
            <div class="flex flex-wrap" style="gap: 8px;" v-if="availableLabels.length > 0">
              <div 
                v-for="label in availableLabels" 
                :key="'add_label_'+label.id"
                @click="addLabel(label.id)"
                class="inline-flex items-center justify-center font-bold rounded-full text-[15px] tracking-wide transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-slate-700 max-w-full"
                style="background-color: #334155; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 6px 16px;"
              >
                <span class="truncate block max-w-full">{{ label.LabelName || label.Name }}</span>
              </div>
            </div>
            <div v-else class="text-center py-6 text-slate-500 text-xs font-bold bg-[#0B0F19]/50 rounded-xl border border-white/5">
              Minden elérhető címkét kiválasztottál!
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

    </div>

    <!-- View: BEÁLLÍTÁSOK -->
    <div v-else-if="activeView === 'beallitasok'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-transparent border-b border-white/10 q-py-sm z-20" style="backdrop-filter: blur(16px); background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 100%);">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-brand-primary bg-white/5 hover:bg-white/10 transition-all ml-2" />
        <q-toolbar-title class="profile-subview-title">
          Beállítások
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 profile-save-btn"
          @click="saveSettings"
        />
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <q-list v-if="authStore.settings" class="flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 8px;">
          <q-item tag="label" v-ripple class="q-py-lg rounded-xl">
            <q-item-section>
              <div class="text-white tracking-wide" style="font-size: 16px; font-weight: 700;">Új üzenet értesítés</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="authStore.settings.NotifyNewMessage" />
            </q-item-section>
          </q-item>
          
          <div class="menu-divider"></div>
          
          <q-item tag="label" v-ripple class="q-py-lg rounded-xl">
            <q-item-section>
              <div class="text-white tracking-wide" style="font-size: 16px; font-weight: 700;">Közelgő események</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="authStore.settings.NotifyUpcomingEvent" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <q-item tag="label" v-ripple class="q-py-lg rounded-xl">
            <q-item-section>
              <div class="text-white tracking-wide" style="font-size: 16px; font-weight: 700;">Közösségi hírek</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="authStore.settings.NotifyCommunityNews" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <q-item tag="label" v-ripple class="q-py-lg rounded-xl">
            <q-item-section>
              <div class="text-white tracking-wide" style="font-size: 16px; font-weight: 700;">Fizetési emlékeztető</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="authStore.settings.NotifyPaymentReminder" />
            </q-item-section>
          </q-item>

          <div class="menu-divider"></div>

          <q-item tag="label" v-ripple class="q-py-lg rounded-xl">
            <q-item-section>
              <div class="text-white tracking-wide" style="font-size: 16px; font-weight: 700;">E-mail értesítések</div>
            </q-item-section>
            <q-item-section side>
              <q-toggle color="brand-primary" v-model="authStore.settings.AllowEmailNotifications" />
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="text-center py-10">
          <q-spinner color="brand-primary" size="2em" />
          <div class="text-slate-400 mt-2 text-sm">Beállítások betöltése...</div>
        </div>
        
        <!-- Mentés gomb áthelyezve a fejlécbe -->

      </div>
    </div>


    <!-- QR Kód Olvasó Modális ablak -->
    <q-dialog v-model="qrScannerOpen" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="bg-[#020617] text-white flex flex-col justify-between" style="width: 100vw; height: 100vh;">
        <!-- Top Toolbar -->
        <q-toolbar class="bg-[#0B0F19] border-b border-white/5 q-py-sm z-20">
          <q-btn flat round dense icon="close" size="lg" @click="qrScannerOpen = false" class="text-white" />
          <q-toolbar-title class="text-center font-bold text-base uppercase tracking-wider">
            QR Kód Beolvasása
          </q-toolbar-title>
          <q-btn flat round dense icon="flash_on" size="md" class="text-white opacity-50" />
        </q-toolbar>

        <!-- Scanner Viewport Area -->
        <div class="flex-grow relative flex items-center justify-center overflow-hidden bg-black">
          
          <!-- Szimulált radar/mátrix (ha nincs kameraelérés) -->
          <div class="absolute inset-0 flex flex-col items-center justify-center q-pa-lg text-center bg-slate-950">
            <q-icon name="photo_camera" size="80px" class="text-slate-600 q-mb-md animate-pulse" />
            <div class="text-lg font-bold text-slate-300">Kamera aktiválása...</div>
            <div class="text-xs text-slate-500 q-mt-sm max-w-xs">
              Irányítsd a kamerát a QR kódra a beolvasáshoz.
            </div>
            
            <!-- Animated Matrix Grid Background -->
            <div class="absolute inset-0 opacity-5 pointer-events-none" style="background-image: radial-gradient(#0EA5E9 1px, transparent 1px); background-size: 16px 16px;"></div>
          </div>

          <!-- Scanner Overlay Mask (Célkereszt) -->
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none z-10">
            <div class="bg-black/60 flex-grow"></div>
            
            <div class="flex flex-row justify-between h-[250px] sm:h-[280px]">
              <div class="bg-black/60 flex-grow"></div>
              
              <!-- Scanning Square Window -->
              <div class="w-[250px] sm:w-[280px] relative border border-white/10 flex items-center justify-center">
                <!-- Glowing Corners -->
                <div class="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-primary rounded-tl-md"></div>
                <div class="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-primary rounded-tr-md"></div>
                <div class="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-primary rounded-bl-md"></div>
                <div class="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-primary rounded-br-md"></div>
                
                <!-- Scanning Laser Line -->
                <div class="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent shadow-[0_0_8px_#0EA5E9] animate-scan"></div>
              </div>
              
              <div class="bg-black/60 flex-grow"></div>
            </div>
            
            <div class="bg-black/60 flex-grow flex items-center justify-center">
              <div class="text-white/70 text-sm font-bold tracking-widest uppercase bg-black/50 px-6 py-2 rounded-full backdrop-blur-md">
                Keresés...
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <PtaBusyOverlay :model-value="workBusy" :label="workLabel" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue';
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';
import { useAuthStore, type UserOrganization } from 'src/stores/auth';
import { useMasterDataStore, type MasterOrganization } from 'src/stores/masterData';
import { useEventStore } from 'src/stores/event';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import PtaBusyOverlay from 'src/modules/profitability/components/PtaBusyOverlay.vue';
import SocialProviderIcon from 'src/components/brand/SocialProviderIcon.vue';
import {
  fetchSocialProfile,
  socialApiErrorMessage,
  type SocialProfilePayload,
  type SocialProvider,
} from 'src/utils/socialAuth';

const authStore = useAuthStore();
const masterDataStore = useMasterDataStore();
const eventStore = useEventStore();
const router = useRouter();
const $q = useQuasar();

function confirmDeleteIdentifier(ident: any, idx: number) {
  $q.dialog({
    title: 'Megerősítés',
    message: 'Biztosan törölni szeretnéd ezt az elérhetőséget?',
    cancel: {
      label: 'Mégsem',
      color: 'slate',
      flat: true
    },
    ok: {
      label: 'Törlés',
      color: 'negative',
      flat: true
    },
    persistent: true
  }).onOk(() => {
    console.log('Törlésre került:', ident, 'Index:', idx);
    // TODO: backend hívás és listából való törlés
  });
}

type ManageableOrgRow = {
  userOrg: UserOrganization;
  displayName: string;
  typeName: string;
};

const manageableUserOrganizations = computed<ManageableOrgRow[]>(() => {
  return (authStore.userOrganizations || [])
    .map((userOrg) => {
      const userType = userOrg.OrganizationUserTypeID != null
        ? masterDataStore.getOrganizationUserTypeById(userOrg.OrganizationUserTypeID)
        : null;
      if (!userType) return null;
      if (!userType.OwnerFlg && !userType.ManagerFlg) return null;

      const org = masterDataStore.getOrganizationById(userOrg.OrganizationID);
      const displayName = org
        ? (org.ShortName?.trim() || org.Name || 'Ismeretlen')
        : 'Ismeretlen';

      return {
        userOrg,
        displayName,
        typeName: userType.Name?.trim() || 'Ismeretlen',
      };
    })
    .filter((row): row is ManageableOrgRow => row != null);
});

const ownerUserType = computed(() => {
  const types = masterDataStore.organizationUserTypes || [];
  return (
    types.find((t) => t.Code?.toUpperCase() === 'OWNER') ||
    types.find((t) => t.OwnerFlg) ||
    null
  );
});

const managerUserType = computed(() => {
  const types = masterDataStore.organizationUserTypes || [];
  return (
    types.find((t) => t.Code?.toUpperCase() === 'MANAGER') ||
    types.find((t) => t.ManagerFlg && !t.OwnerFlg) ||
    types.find((t) => t.ManagerFlg) ||
    null
  );
});

const ownerUserTypeName = computed(() => ownerUserType.value?.Name || 'Tulajdonos');
const managerUserTypeName = computed(() => managerUserType.value?.Name || 'Menedzser');

const memberOrganizationIds = computed(() => {
  return new Set((authStore.userOrganizations || []).map((uo) => Number(uo.OrganizationID)));
});

const organizationTypeOptions = computed(() =>
  (masterDataStore.organizationTypes || []).map((t) => ({
    label: t.Name,
    value: t.id,
  }))
);

const isOrganizationDialogVisible = ref(false);
const orgDialogMode = ref<'join' | 'create'>('join');
const orgSearchQuery = ref('');
const selectedJoinOrgId = ref<number | null>(null);
const showMoreOrgDetails = ref(false);
const orgFormScrollRef = ref<HTMLElement | null>(null);
const orgExtraFieldsRef = ref<HTMLElement | null>(null);

const emptyNewOrgForm = () => ({
  OrganizationTypeID: null as number | null,
  Name: '',
  ShortName: '',
  CountryCode: 'HU',
  PostalCode: '',
  City: '',
  AddressLine1: '',
  AddressLine2: '',
  Email: '',
  Phone: '',
  TaxId: '',
});

const newOrgForm = ref(emptyNewOrgForm());

const joinableOrganizations = computed(() => {
  const q = orgSearchQuery.value.trim().toLowerCase();
  return (masterDataStore.organizations || [])
    .filter((org) => !memberOrganizationIds.value.has(Number(org.id)))
    .filter((org) => {
      if (!q) return true;
      const name = (org.Name || '').toLowerCase();
      const shortName = (org.ShortName || '').toLowerCase();
      return name.includes(q) || shortName.includes(q);
    })
    .slice(0, 40);
});

function nextLocalId(existingIds: number[]): number {
  const maxId = existingIds.reduce((max, id) => (Number.isFinite(id) && id > max ? id : max), 0);
  return maxId + 1;
}

function persistOrganizationsCache() {
  localStorage.setItem('md_organizations', JSON.stringify(masterDataStore.organizations));
}

function openOrganizationDialog() {
  orgDialogMode.value = 'join';
  orgSearchQuery.value = '';
  selectedJoinOrgId.value = null;
  showMoreOrgDetails.value = false;
  newOrgForm.value = emptyNewOrgForm();
  if (organizationTypeOptions.value.length === 1) {
    newOrgForm.value.OrganizationTypeID = organizationTypeOptions.value[0].value;
  }
  isOrganizationDialogVisible.value = true;
}

function toggleMoreOrgDetails() {
  showMoreOrgDetails.value = !showMoreOrgDetails.value;
  if (showMoreOrgDetails.value) {
    void nextTick(() => {
      orgExtraFieldsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

function setPrimaryOrganization(userOrgId: number) {
  authStore.userOrganizations = (authStore.userOrganizations || []).map((uo) => ({
    ...uo,
    IsPrimary: Number(uo.id) === Number(userOrgId),
  }));
}

function confirmLeaveOrganization(row: ManageableOrgRow) {
  $q.dialog({
    title: 'Kilépés a szervezetből',
    message: `Biztosan kilépsz a(z) „${row.displayName}” szervezetből?`,
    cancel: {
      label: 'Mégsem',
      color: 'slate',
      flat: true,
    },
    ok: {
      label: 'Kilépés',
      color: 'negative',
      flat: true,
    },
    persistent: true,
  }).onOk(() => {
    authStore.userOrganizations = (authStore.userOrganizations || []).filter(
      (uo) => Number(uo.id) !== Number(row.userOrg.id)
    );
    $q.notify({
      message: 'Kiléptél a szervezetből. A mentés a profil mentésekor történik.',
      color: 'info',
      position: 'top',
      icon: 'logout',
    });
  });
}

function joinOrganizationLocally(orgId: number) {
  const manager = managerUserType.value;
  if (!manager) {
    $q.notify({
      message: 'Nincs elérhető Menedzser beosztás a törzsadatokban.',
      color: 'warning',
      position: 'top',
      icon: 'warning',
    });
    return false;
  }

  const nextId = nextLocalId((authStore.userOrganizations || []).map((uo) => Number(uo.id)));
  authStore.userOrganizations = [
    ...(authStore.userOrganizations || []),
    {
      id: nextId,
      OrganizationID: orgId,
      IsPrimary: false,
      OrganizationUserTypeID: manager.id,
      ActiveFlg: true,
    },
  ];
  return true;
}

function createOrganizationLocally() {
  const owner = ownerUserType.value;
  if (!owner) {
    $q.notify({
      message: 'Nincs elérhető Tulajdonos beosztás a törzsadatokban.',
      color: 'warning',
      position: 'top',
      icon: 'warning',
    });
    return false;
  }

  const name = newOrgForm.value.Name.trim();
  if (!name) {
    $q.notify({
      message: 'Add meg a szervezet nevét!',
      color: 'warning',
      position: 'top',
      icon: 'warning',
    });
    return false;
  }

  if (newOrgForm.value.OrganizationTypeID == null) {
    $q.notify({
      message: 'Válassz szervezet típust!',
      color: 'warning',
      position: 'top',
      icon: 'warning',
    });
    return false;
  }

  const orgId = nextLocalId((masterDataStore.organizations || []).map((o) => Number(o.id)));
  const now = new Date().toISOString();
  const org: MasterOrganization = {
    id: orgId,
    Name: name,
    ShortName: newOrgForm.value.ShortName.trim() || null,
    Email: newOrgForm.value.Email.trim() || null,
    Phone: newOrgForm.value.Phone.trim() || null,
    TaxId: newOrgForm.value.TaxId.trim() || null,
    CountryCode: newOrgForm.value.CountryCode.trim() || null,
    PostalCode: newOrgForm.value.PostalCode.trim() || null,
    City: newOrgForm.value.City.trim() || null,
    AddressLine1: newOrgForm.value.AddressLine1.trim() || null,
    AddressLine2: newOrgForm.value.AddressLine2.trim() || null,
    OrganizationTypeID: newOrgForm.value.OrganizationTypeID,
    ActiveFlg: true,
    createdAt: now,
    updatedAt: now,
  };

  masterDataStore.organizations = [...(masterDataStore.organizations || []), org];
  persistOrganizationsCache();

  const linkId = nextLocalId((authStore.userOrganizations || []).map((uo) => Number(uo.id)));
  authStore.userOrganizations = [
    ...(authStore.userOrganizations || []),
    {
      id: linkId,
      OrganizationID: orgId,
      IsPrimary: false,
      OrganizationUserTypeID: owner.id,
      ActiveFlg: true,
    },
  ];
  return true;
}

function saveOrganizationDialog() {
  if (orgDialogMode.value === 'join') {
    if (selectedJoinOrgId.value == null) {
      $q.notify({
        message: 'Válassz ki egy szervezetet a listából!',
        color: 'warning',
        position: 'top',
        icon: 'warning',
      });
      return;
    }
    if (!joinOrganizationLocally(selectedJoinOrgId.value)) return;
    isOrganizationDialogVisible.value = false;
    $q.notify({
      message: 'Csatlakoztál a szervezethez. A mentés a profil mentésekor történik.',
      color: 'positive',
      position: 'top',
      icon: 'check_circle',
    });
    return;
  }

  if (!createOrganizationLocally()) return;
  isOrganizationDialogVisible.value = false;
  $q.notify({
    message: 'Szervezet létrehozva. A mentés a profil mentésekor történik.',
    color: 'positive',
    position: 'top',
    icon: 'check_circle',
  });
}

type ViewState = 'menu' | 'adataim' | 'preferenciak' | 'beallitasok';
const activeView = ref<ViewState>('menu');
const qrScannerOpen = ref(false);

// Számlázási cím szerkesztő állapota
const isBillingDialogVisible = ref(false);
const billingDialogMode = ref<'add' | 'edit'>('add');
const currentBillingAddress = ref<any>({});
const showMoreBillingDetails = ref(false);
const billingFormScrollRef = ref<HTMLElement | null>(null);
const billingExtraFieldsRef = ref<HTMLElement | null>(null);

function hasOptionalBillingFields(addr: Record<string, unknown>) {
  return Boolean(
    addr.AddressLine2 ||
    addr.StateOrRegion ||
    addr.BillingEmail ||
    addr.BillingPhone
  );
}

function toggleMoreBillingDetails() {
  showMoreBillingDetails.value = !showMoreBillingDetails.value;
  if (showMoreBillingDetails.value) {
    void nextTick(() => {
      billingExtraFieldsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

function openBillingDialog(mode: 'add' | 'edit', addr?: any) {
  billingDialogMode.value = mode;
  if (mode === 'edit' && addr) {
    currentBillingAddress.value = { ...addr };
    showMoreBillingDetails.value = hasOptionalBillingFields(addr);
  } else {
    currentBillingAddress.value = { 
      BillingName: '', 
      IsDefault: false,
      IsCompany: false,
      CompanyName: '',
      CompanyTaxNumber: '',
      CompanyVatNumber: '',
      CountryCode: 'HU',
      PostalCode: '', 
      City: '', 
      AddressLine1: '',
      AddressLine2: '',
      StateOrRegion: '',
      BillingEmail: '',
      BillingPhone: ''
    };
    showMoreBillingDetails.value = false;
  }
  isBillingDialogVisible.value = true;
}

function saveBillingAddress() {
  // TODO: Hívás a backend felé
  console.log('Mentve:', currentBillingAddress.value);
  isBillingDialogVisible.value = false;
}

function savePersonalData() {
  // TODO: User Save endpoint — user + userOrganizations + billing + identifiers
  console.log('Személyes adatok mentve:', {
    user: authStore.user,
    userOrganizations: authStore.userOrganizations,
  });
  $q.notify({
    message: 'Személyes adatok sikeresen mentve!',
    color: 'positive',
    position: 'top',
    icon: 'check_circle'
  });
}

const workBusy = ref(false);
const workLabel = ref('Dolgozom…');
const isSocialConfirmOpen = ref(false);
const socialConfirmMode = ref<'link' | 'unlink'>('link');
const pendingLinkPayload = ref<SocialProfilePayload | null>(null);
const pendingUnlinkProvider = ref<SocialProvider | null>(null);

const socialProviderRows = computed(() => {
  const googleStyle = 'background: rgba(66, 133, 244, 0.18); border: 1.5px solid rgba(66, 133, 244, 0.55);';
  const facebookStyle = 'background: rgba(24, 119, 242, 0.18); border: 1.5px solid rgba(24, 119, 242, 0.55);';
  const appleStyle = 'background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(255, 255, 255, 0.22);';
  const linked = (provider: string) =>
    (authStore.socialLogins || []).find(
      (row) => row.Provider.toLowerCase() === provider.toLowerCase()
    ) ?? null;
  return [
    {
      id: 'Google' as const,
      label: 'Google',
      iconStyle: googleStyle,
      soon: false,
      linked: linked('Google'),
    },
    {
      id: 'Facebook' as const,
      label: 'Facebook',
      iconStyle: facebookStyle,
      soon: false,
      linked: linked('Facebook'),
    },
    {
      id: 'Apple' as const,
      label: 'Apple',
      iconStyle: appleStyle,
      soon: true,
      linked: null as ReturnType<typeof linked>,
    },
  ];
});

const socialConfirmTitle = computed(() =>
  socialConfirmMode.value === 'unlink' ? 'Fiók leválasztása' : 'Fiók csatolása'
);

const socialConfirmMessage = computed(() => {
  if (socialConfirmMode.value === 'unlink') {
    const label = pendingUnlinkProvider.value === 'Facebook' ? 'Facebook' : 'Google';
    return `Leválasztod a ${label}-fiókot? A neved és az alap e-mailcímed nem változik.`;
  }
  const payload = pendingLinkPayload.value;
  if (!payload) return '';
  const label = payload.Provider === 'Facebook' ? 'Facebook' : 'Google';
  const email = payload.EmailAddress || '';
  return `Csatolod a ${label}-fiókot${email ? ` (${email})` : ''}? A neved és az alap e-mailcímed megmarad; ez a cím belépési módként kerül fel.`;
});

function showSocialToast(message: string, type: 'positive' | 'warning' | 'info') {
  $q.notify({
    message,
    icon: type === 'warning' ? 'error_outline' : type === 'positive' ? 'check_circle' : 'info_outline',
    color: 'dark',
    textColor: type === 'warning' ? 'red-4' : type === 'positive' ? 'green-4' : 'blue-4',
    position: 'top',
  });
}

async function startLinkSocial(provider: 'Google' | 'Facebook' | 'Apple') {
  if (provider === 'Apple') {
    showSocialToast('Az Apple bejelentkezés hamarosan elérhető lesz az iOS verzióval!', 'info');
    return;
  }

  workLabel.value = provider === 'Google' ? 'Google fiók…' : 'Facebook fiók…';
  workBusy.value = true;
  try {
    const profile = await fetchSocialProfile(provider);
    pendingLinkPayload.value = profile;
    socialConfirmMode.value = 'link';
    isSocialConfirmOpen.value = true;
  } catch (error) {
    showSocialToast(socialApiErrorMessage(error, 'Nem sikerült a fiók adatainak lekérése.'), 'warning');
  } finally {
    workBusy.value = false;
  }
}

function askUnlinkSocial(provider: 'Google' | 'Facebook' | 'Apple') {
  if (provider === 'Apple') return;
  pendingUnlinkProvider.value = provider;
  socialConfirmMode.value = 'unlink';
  isSocialConfirmOpen.value = true;
}

async function confirmSocialAction() {
  isSocialConfirmOpen.value = false;

  if (socialConfirmMode.value === 'unlink') {
    const provider = pendingUnlinkProvider.value;
    if (!provider) return;
    workLabel.value = 'Leválasztás…';
    workBusy.value = true;
    try {
      const data = await authStore.unlinkSocial(provider);
      const msg = data?.Result1?.ReturnDescription || 'Fiók leválasztva.';
      showSocialToast(msg, 'positive');
    } catch (error) {
      showSocialToast(socialApiErrorMessage(error, 'Nem sikerült a fiók leválasztása.'), 'warning');
    } finally {
      workBusy.value = false;
      pendingUnlinkProvider.value = null;
    }
    return;
  }

  const payload = pendingLinkPayload.value;
  if (!payload) return;
  workLabel.value = 'Fiók csatolása…';
  workBusy.value = true;
  try {
    const data = await authStore.linkSocial(payload);
    const msg = data?.Result1?.ReturnDescription || 'Fiók csatolva.';
    showSocialToast(msg, 'positive');
  } catch (error) {
    showSocialToast(socialApiErrorMessage(error, 'Nem sikerült a fiók csatolása.'), 'warning');
  } finally {
    workBusy.value = false;
    pendingLinkPayload.value = null;
  }
}

function savePreferences() {
  // TODO: API hívás
  console.log('Preferenciák mentve');
  $q.notify({
    message: 'Preferenciák sikeresen mentve!',
    color: 'positive',
    position: 'top',
    icon: 'check_circle'
  });
}

function saveSettings() {
  // TODO: API hívás
  console.log('Beállítások mentve');
  $q.notify({
    message: 'Beállítások sikeresen mentve!',
    color: 'positive',
    position: 'top',
    icon: 'check_circle'
  });
}

// mockSettings eltávolítva

function logout() {
  authStore.logout();
  router.push('/login');
}

function openQrScanner() {
  qrScannerOpen.value = true;
}

const isIdentifierDialogVisible = ref(false);
const identifierType = ref<'email' | 'phone'>('email');
const newIdentifierValue = ref('');

function openIdentifierDialog() {
  identifierType.value = 'email';
  newIdentifierValue.value = '';
  isIdentifierDialogVisible.value = true;
}

// Telefonszám formázó logika
watch(newIdentifierValue, (newVal) => {
  if (!newVal || identifierType.value === 'email') return;
  
  let cleaned = newVal.replace(/\s+/g, '');
  if (cleaned.startsWith('06')) cleaned = '+36' + cleaned.substring(2);
  else if (cleaned.startsWith('36')) cleaned = '+36' + cleaned.substring(2);
  else if (!cleaned.startsWith('+') && cleaned.length > 0) cleaned = '+' + cleaned;
  
  if (newVal !== cleaned && (newVal.startsWith('06') || newVal.startsWith('36'))) {
    newIdentifierValue.value = cleaned;
    return;
  }
  
  const formatter = new AsYouType('HU');
  const formatted = formatter.input(cleaned);
  if (formatted !== newVal) {
    newIdentifierValue.value = formatted;
  }
});

function saveIdentifier() {
  if (!newIdentifierValue.value) {
    $q.notify({
      message: `Kérjük add meg a${identifierType.value === 'email' ? 'z e-mail címet' : ' telefonszámot'}!`,
      color: 'warning',
      position: 'top',
      icon: 'warning'
    });
    return;
  }
  
  if (identifierType.value === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newIdentifierValue.value)) {
      $q.notify({
        message: 'Kérjük, érvényes e-mail címet adj meg!',
        color: 'negative',
        position: 'top',
        icon: 'error'
      });
      return;
    }
  } else {
    if (!isValidPhoneNumber(newIdentifierValue.value, 'HU')) {
      $q.notify({
        message: 'Érvénytelen telefonszám formátum!',
        color: 'negative',
        position: 'top',
        icon: 'error'
      });
      return;
    }
  }
  
  console.log('Mentve:', { type: identifierType.value, value: newIdentifierValue.value });
  // TODO: backend hívás
  isIdentifierDialogVisible.value = false;
}

// Preferenciák kezelése (Vizuális szimuláció a UI-hoz, a store-ban valószínűleg API hívás is kellene)
const isEventTypesDialogVisible = ref(false);
const isLabelsDialogVisible = ref(false);

function getEventTypeName(id: number) {
  const t = masterDataStore.eventTypes?.find((x: any) => x.id === id);
  return t ? (t.TypeName || t.Name) : 'Ismeretlen';
}

function getLabelName(id: number) {
  const l = eventStore.labels?.find((x: any) => x.id === id);
  return l ? (l.LabelName || l.Name) : 'Ismeretlen';
}

const availableEventTypes = computed(() => {
  return (masterDataStore.eventTypes || []).filter((t: any) => {
    return !(authStore.eventTypePreferences || []).find((p: any) => p.EventTypeID === t.id);
  });
});

const availableLabels = computed(() => {
  return (eventStore.labels || []).filter((l: any) => {
    return !(authStore.labelPreferences || []).find((p: any) => p.LabelID === l.id);
  });
});

function openEventTypesDialog() {
  isEventTypesDialogVisible.value = true;
}

function openLabelsDialog() {
  isLabelsDialogVisible.value = true;
}

function addEventType(id: number) {
  if (!authStore.eventTypePreferences) authStore.eventTypePreferences = [];
  authStore.eventTypePreferences.push({ EventTypeID: id });
  isEventTypesDialogVisible.value = false;
}

function removeEventType(id: number) {
  if (!authStore.eventTypePreferences) return;
  authStore.eventTypePreferences = authStore.eventTypePreferences.filter((p: any) => p.EventTypeID !== id);
}

function addLabel(id: number) {
  if (!authStore.labelPreferences) authStore.labelPreferences = [];
  authStore.labelPreferences.push({ LabelID: id });
  isLabelsDialogVisible.value = false;
}

function removeLabel(id: number) {
  if (!authStore.labelPreferences) return;
  authStore.labelPreferences = authStore.labelPreferences.filter((p: any) => p.LabelID !== id);
}
</script>

<style scoped lang="scss">
.profile-section-title {
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.profile-avatar-initials {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.profile-user-name {
  margin-top: 12px;
  margin-bottom: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.profile-user-email {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

.profile-card {
  border-radius: 24px;
  background: radial-gradient(circle at top, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
}

.profile-menu-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 24px;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.profile-menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.08);

    .profile-menu-label {
      color: #ffffff;
    }

    .profile-menu-chevron {
      color: #38bdf8;
      transform: translateX(2px);
    }

    .profile-menu-icon:not(.profile-menu-icon--rose):not(.profile-menu-icon--emerald) {
      background: rgba(14, 165, 233, 0.18);
    }
  }

  &:active {
    transform: scale(0.99);
  }

  &--danger:hover {
    background: rgba(244, 63, 94, 0.08);

    .profile-menu-label {
      color: #fb7185;
    }
  }
}

.profile-menu-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(14, 165, 233, 0.12);
  color: #38bdf8;
  transition: background 0.2s ease;

  &--emerald {
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
  }

  &--rose {
    background: rgba(244, 63, 94, 0.12);
    color: #fb7185;
  }
}

.profile-menu-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #cbd5e1;
  transition: color 0.2s ease;
}

.profile-menu-chevron {
  color: #64748b;
  flex-shrink: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}

.profile-menu-divider {
  height: 1px;
  margin: 6px 8px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.08) 80%,
    transparent
  );
}

.profile-subview-title {
  font-size: 15px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase;
  text-align: center;
  color: #e2e8f0 !important;
}

.profile-save-btn {
  background: var(--ej-gradient) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
  transition: transform 0.2s ease, filter 0.2s ease;

  &:hover {
    filter: brightness(1.06);
    transform: scale(1.05);
  }
}

.profile-add-btn {
  background: var(--ej-gradient) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes scan {
  0%, 100% { top: 0; opacity: 0; }
  10%, 90% { opacity: 1; }
  50% { top: 100%; opacity: 1; }
}
.animate-scan {
  animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.profile-field-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--compact {
    gap: 10px;

    .profile-field {
      gap: 4px;
    }
  }
}

.billing-form-scroll {
  max-height: min(68vh, 640px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 4px 24px 4px;
}

.billing-extra-fields {
  padding-top: 4px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.profile-field__label {
  margin: 0;
  padding-left: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  line-height: 1.2;

  &--emerald {
    color: rgba(52, 211, 153, 0.85);
  }

  &--amber {
    color: rgba(251, 191, 36, 0.9);
  }

  &--orange {
    color: rgba(251, 146, 60, 0.95);
  }
}

.profile-toggle-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 72px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(11, 15, 25, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-toggle-card__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: rgba(167, 243, 208, 0.9);
  line-height: 1.25;
}

.profile-input {
  :deep(.q-field__control) {
    min-height: 48px;
    height: 48px;
    border-radius: 14px !important;
    background-color: rgba(11, 15, 25, 0.55) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;

    &::before,
    &::after {
      display: none !important;
    }
  }

  :deep(.q-field__marginal) {
    height: 48px;
  }

  :deep(.q-field__native),
  :deep(.q-field__input) {
    padding: 0 14px;
    font-size: 16px;
    font-weight: 500;
    color: #f8fafc;
  }

  :deep(.q-field__control:hover) {
    background-color: rgba(255, 255, 255, 0.06) !important;
  }

  &--cyan :deep(.q-field__control:hover) {
    border-color: rgba(56, 189, 248, 0.35) !important;
  }

  &--cyan :deep(.q-field--focused .q-field__control) {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15) !important;
  }

  &--emerald :deep(.q-field__control:hover) {
    border-color: rgba(52, 211, 153, 0.35) !important;
  }

  &--emerald :deep(.q-field--focused .q-field__control) {
    border-color: #34d399 !important;
    box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15) !important;
  }

  &--amber :deep(.q-field__control:hover) {
    border-color: rgba(251, 191, 36, 0.35) !important;
  }

  &--amber :deep(.q-field--focused .q-field__control) {
    border-color: #fbbf24 !important;
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15) !important;
  }

  &--orange :deep(.q-field__control:hover) {
    border-color: rgba(249, 115, 22, 0.4) !important;
  }

  &--orange :deep(.q-field--focused .q-field__control) {
    border-color: #f97316 !important;
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18) !important;
  }
}

.org-create-cta {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(249, 115, 22, 0.35);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.22) 0%, rgba(249, 115, 22, 0.06) 100%);
  box-shadow: 0 8px 24px rgba(249, 115, 22, 0.15);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(249, 115, 22, 0.55);
    box-shadow: 0 10px 28px rgba(249, 115, 22, 0.22);
  }

  &:active {
    transform: scale(0.99);
  }
}

.org-create-cta__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(249, 115, 22, 0.25);
  color: #fdba74;
  flex-shrink: 0;
}

.org-create-cta__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.org-create-cta__title {
  font-size: 15px;
  font-weight: 800;
  color: #fff7ed;
  letter-spacing: 0.02em;
}

.org-create-cta__sub {
  font-size: 12px;
  font-weight: 600;
  color: rgba(253, 186, 116, 0.85);
}

.org-create-cta__chevron {
  color: #fdba74;
  flex-shrink: 0;
}

:deep(.profile-input__native) {
  font-size: 16px;
  font-weight: 500;
  color: #f8fafc;
}

.custom-input {
  :deep(.q-field__control) {
    border-radius: 12px !important;
    background-color: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    transition: all 0.3s ease;
    
    &:before, &:after {
      display: none !important;
    }
  }
  
  :deep(.q-field__control:hover) {
    border-color: rgba(56, 189, 248, 0.4) !important;
    background-color: rgba(255, 255, 255, 0.08) !important;
  }
  
  :deep(.q-field--focused .q-field__control) {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.2) !important;
  }
}

.social-link-btn {
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &--link {
    background: rgba(56, 189, 248, 0.16) !important;
    color: #7dd3fc !important;
  }

  &--unlink {
    background: rgba(255, 96, 96, 0.12) !important;
    color: #fb7185 !important;
  }

  &--soon {
    background: rgba(255, 255, 255, 0.04) !important;
    color: #64748b !important;
  }
}

.social-confirm {
  width: min(100%, 360px);
  margin: 16px;
  padding: 22px 20px 18px;
  border-radius: 24px;
  background: rgba(12, 13, 14, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(56, 189, 248, 0.22);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  color: #fff;

  &--danger {
    border-color: rgba(246, 139, 41, 0.22);
  }
}

.social-confirm__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.16);
  color: #38bdf8;

  &.is-danger {
    background: rgba(255, 96, 96, 0.16);
    color: #ff6060;
  }
}

.social-confirm__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: #38bdf8;
}

.social-confirm--danger .social-confirm__title {
  color: #ff6060;
}

.social-confirm__message {
  margin: 0 0 20px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-align: center;
  color: #cbd5e1;
}

.social-confirm__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.social-confirm__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.social-confirm__btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
}

.social-confirm__btn--primary {
  background: rgba(56, 189, 248, 0.18);
  border-color: rgba(56, 189, 248, 0.4);
  color: #7dd3fc;
}

.social-confirm__btn--danger {
  background: rgba(255, 96, 96, 0.18);
  border-color: rgba(255, 96, 96, 0.35);
  color: #ff6060;
}

</style>
