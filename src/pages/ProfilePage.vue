<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden flex flex-col h-full">
    <!-- View: MENU -->
    <div v-if="activeView === 'menu'" class="q-pa-md flex flex-col h-full overflow-y-auto no-scrollbar">
      <!-- Premium Profile Header -->
      <div class="profile-card text-center q-pt-lg q-pb-md q-px-md flex flex-col items-center justify-center relative overflow-hidden">
        <div class="avatar-glow absolute w-24 h-24 bg-brand-primary/20 rounded-full blur-xl pointer-events-none"></div>
        
        <q-avatar size="80px" class="bg-[#0F172A] text-brand-primary border-2 border-brand-primary/30 shadow-[0_4px_20px_rgba(14,165,233,0.25)] z-10">
          <q-icon v-if="!authStore.user?.LastName && !authStore.user?.FirstName" name="person" size="48px" />
          <span v-else class="text-3xl font-black">{{ (authStore.user?.LastName?.charAt(0) || '') + (authStore.user?.FirstName?.charAt(0) || '') }}</span>
        </q-avatar>
        
        <div class="text-xl font-black text-white tracking-wide q-mt-md q-mb-xs z-10">
          {{ authStore.user?.LastName || '' }} {{ authStore.user?.FirstName || 'Felhasználó' }}
        </div>
        <p class="text-xs text-slate-400 font-medium z-10">{{ authStore.user?.Email || '' }}</p>
      </div>

      <!-- Menu List -->
      <div class="menu-container q-mt-md flex-grow">
        <q-list class="bg-[#0f172a] border border-brand-primary/20 rounded-[2rem] overflow-hidden p-3 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-1">
          
          <!-- 1. Adataim -->
          <q-item clickable v-ripple class="rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-brand-primary/20 hover:to-sky-400/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] q-py-md q-px-md group" @click="activeView = 'adataim'">
            <q-item-section avatar>
              <q-icon name="badge" color="brand-primary" size="24px" class="group-hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </q-item-section>
            <q-item-section class="font-bold text-slate-300 text-sm tracking-wide group-hover:text-white transition-colors duration-300">Adataim</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="group-hover:translate-x-1 group-hover:text-brand-primary transition-all duration-300" />
            </q-item-section>
          </q-item>

          <!-- 2. Preferenciák -->
          <q-item clickable v-ripple class="rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-brand-primary/20 hover:to-sky-400/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] q-py-md q-px-md group" @click="activeView = 'preferenciak'">
            <q-item-section avatar>
              <q-icon name="favorite_border" color="brand-primary" size="24px" class="group-hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </q-item-section>
            <q-item-section class="font-bold text-slate-300 text-sm tracking-wide group-hover:text-white transition-colors duration-300">Preferenciák</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="group-hover:translate-x-1 group-hover:text-brand-primary transition-all duration-300" />
            </q-item-section>
          </q-item>

          <!-- 3. Beállítások -->
          <q-item clickable v-ripple class="rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-brand-primary/20 hover:to-sky-400/10 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] q-py-md q-px-md group" @click="activeView = 'beallitasok'">
            <q-item-section avatar>
              <q-icon name="settings" color="brand-primary" size="24px" class="group-hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </q-item-section>
            <q-item-section class="font-bold text-slate-300 text-sm tracking-wide group-hover:text-white transition-colors duration-300">Beállítások</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="group-hover:translate-x-1 group-hover:text-brand-primary transition-all duration-300" />
            </q-item-section>
          </q-item>

          <!-- 4. QR-kód olvasó -->
          <q-item clickable v-ripple class="rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-400/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] q-py-md q-px-md group" @click="openQrScanner">
            <q-item-section avatar>
              <q-icon name="qr_code_scanner" color="emerald-500" size="24px" class="group-hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </q-item-section>
            <q-item-section class="font-bold text-slate-300 text-sm tracking-wide group-hover:text-white transition-colors duration-300">QR-kód olvasó</q-item-section>
            <q-item-section side>
              <q-icon name="chevron_right" color="slate-600" size="20px" class="group-hover:translate-x-1 group-hover:text-emerald-400 transition-all duration-300" />
            </q-item-section>
          </q-item>

          <!-- 5. Kijelentkezés -->
          <q-item clickable v-ripple class="rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-rose-500/20 hover:to-pink-500/10 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] q-py-md q-px-md mt-4 group" @click="logout">
            <q-item-section avatar>
              <q-icon name="logout" color="rose-500" size="24px" class="group-hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </q-item-section>
            <q-item-section class="font-bold text-rose-500/80 text-sm tracking-wide group-hover:text-rose-400 transition-colors duration-300">Kijelentkezés</q-item-section>
          </q-item>

        </q-list>
      </div>
    </div>

    <!-- View: ADATAIM -->
    <div v-else-if="activeView === 'adataim'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-transparent border-b border-white/10 q-py-sm z-20" style="backdrop-filter: blur(16px); background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 100%);">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-brand-primary bg-white/5 hover:bg-white/10 transition-all ml-2" />
        <q-toolbar-title class="font-black text-lg uppercase tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-sky-300 drop-shadow-lg">
          Adataim
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:scale-110 transition-transform duration-300"
          style="background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%); color: white;"
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
          <div class="grid grid-cols-1 gap-4" v-if="authStore.user">
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 q-ml-xs">Vezetéknév</div>
              <q-input 
                v-model="authStore.user.LastName" 
                dark 
                outlined 
                dense 
                color="brand-primary" 
                class="custom-input bg-[#0B0F19]/50 rounded-xl"
                input-style="font-size: 16px;" input-class="font-medium text-white"
              />
            </div>
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 q-ml-xs">Keresztnév</div>
              <q-input 
                v-model="authStore.user.FirstName" 
                dark 
                outlined 
                dense 
                color="brand-primary" 
                class="custom-input bg-[#0B0F19]/50 rounded-xl"
                input-style="font-size: 16px;" input-class="font-medium text-white"
              />
            </div>
            <div>
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 q-ml-xs">E-mail cím</div>
              <q-input 
                v-model="authStore.user.EmailAddress" 
                dark 
                outlined 
                dense 
                color="brand-primary" 
                class="custom-input bg-[#0B0F19]/50 rounded-xl"
                input-style="font-size: 16px;" input-class="font-medium text-white"
              />
            </div>
          </div>
          <div v-else class="text-slate-400 text-sm text-center py-4">Adatok betöltése...</div>
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
            
            <div class="flex flex-col gap-5 max-h-[80vh] overflow-y-auto no-scrollbar pb-6 px-1 pr-2">
              
              <!-- Toggles: IsDefault & IsCompany -->
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col items-center justify-center bg-[#0B0F19]/50 p-3 rounded-xl gap-2">
                  <div class="text-[10px] text-emerald-100 font-bold uppercase text-center w-full leading-tight">Alapértelmezett</div>
                  <q-toggle v-model="currentBillingAddress.IsDefault" color="emerald-400" dense />
                </div>
                <div class="flex flex-col items-center justify-center bg-[#0B0F19]/50 p-3 rounded-xl gap-2">
                  <div class="text-[10px] text-emerald-100 font-bold uppercase text-center w-full leading-tight">Céges</div>
                  <q-toggle v-model="currentBillingAddress.IsCompany" color="emerald-400" dense />
                </div>
              </div>
              
              <q-separator color="white" class="opacity-10 my-1" />
              
              <!-- Név / Cégnév -->
              <template v-if="currentBillingAddress.IsCompany">
                <div>
                  <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Cégnév</div>
                  <q-input v-model="currentBillingAddress.CompanyName" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Adószám</div>
                    <q-input v-model="currentBillingAddress.CompanyTaxNumber" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Közösségi adószám</div>
                    <q-input v-model="currentBillingAddress.CompanyVatNumber" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                </div>
              </template>
              
              <div>
                <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Számlázási Név (Kapcsolattartó)</div>
                <q-input v-model="currentBillingAddress.BillingName" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
              </div>

              <!-- Cím adatok -->
              <q-separator color="white" class="opacity-10 my-2" />
              <div class="grid grid-cols-4 gap-3">
                <div class="col-span-1">
                  <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Ország</div>
                  <q-input v-model="currentBillingAddress.CountryCode" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                </div>
                <div class="col-span-1">
                  <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Ir.szám</div>
                  <q-input v-model="currentBillingAddress.PostalCode" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                </div>
                <div class="col-span-2">
                  <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Város</div>
                  <q-input v-model="currentBillingAddress.City" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                </div>
              </div>
              
              <div>
                <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Utca, házszám</div>
                <q-input v-model="currentBillingAddress.AddressLine1" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
              </div>
              
              <div class="flex justify-center mt-2 mb-1">
                <q-btn 
                  flat 
                  no-caps 
                  :icon-right="showMoreBillingDetails ? 'expand_less' : 'expand_more'" 
                  :label="showMoreBillingDetails ? 'Kevesebb adat' : 'További adatok (opcionális)'" 
                  color="emerald-400" 
                  class="bg-emerald-500/10 rounded-xl text-xs font-bold px-4 py-1.5"
                  @click="showMoreBillingDetails = !showMoreBillingDetails"
                />
              </div>

              <div v-show="showMoreBillingDetails" class="flex flex-col gap-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Emelet, ajtó</div>
                    <q-input v-model="currentBillingAddress.AddressLine2" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Megye / Régió</div>
                    <q-input v-model="currentBillingAddress.StateOrRegion" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                </div>

                <!-- Elérhetőségek -->
                <q-separator color="white" class="opacity-10 my-1" />
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">E-mail</div>
                    <q-input v-model="currentBillingAddress.BillingEmail" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                  <div>
                    <div class="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider mb-1 q-ml-xs">Telefon</div>
                    <q-input v-model="currentBillingAddress.BillingPhone" dark outlined dense color="emerald-400" class="custom-input bg-[#0B0F19]/50 rounded-xl" input-style="font-size: 16px;" input-class="font-medium text-white" />
                  </div>
                </div>
              </div>
              
            </div>
          </q-card-section>

          <q-card-actions class="q-pa-md pt-2 mb-4 grid grid-cols-2 gap-3">
            <q-btn flat no-caps label="Mégsem" color="white" class="bg-white/5 hover:bg-white/10 rounded-xl font-bold py-3" v-close-popup />
            <q-btn unelevated no-caps label="Mentés" color="emerald-500" class="rounded-xl font-bold py-3 shadow-[0_4px_15px_rgba(16,185,129,0.4)]" @click="saveBillingAddress" />
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

            <div class="mb-6">
              <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 q-ml-xs">
                {{ identifierType === 'email' ? 'E-mail cím' : 'Telefonszám' }}
              </div>
              <q-input 
                v-model="newIdentifierValue" 
                :type="identifierType === 'email' ? 'email' : 'tel'"
                dark 
                outlined 
                color="amber" 
                class="custom-input bg-[#0B0F19]/50 rounded-xl"
                input-style="font-size: 16px;" input-class="font-medium text-white"
                :placeholder="identifierType === 'email' ? 'pl. pelda@email.com' : 'pl. +36 30 123 4567'"
              >
                <template v-slot:prepend>
                  <q-icon :name="identifierType === 'email' ? 'mail' : 'phone'" color="slate-400" />
                </template>
              </q-input>
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

    </div>

    <!-- View: PREFERENCIÁK -->
    <div v-else-if="activeView === 'preferenciak'" class="flex flex-col h-full relative">
      <q-toolbar class="bg-transparent border-b border-white/10 q-py-sm z-20" style="backdrop-filter: blur(16px); background: linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.5) 100%);">
        <q-btn flat round dense icon="arrow_back" @click="activeView = 'menu'" class="text-brand-primary bg-white/5 hover:bg-white/10 transition-all ml-2" />
        <q-toolbar-title class="font-black text-lg uppercase tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-sky-300 drop-shadow-lg">
          Preferenciák
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:scale-110 transition-transform duration-300"
          style="background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%); color: white;"
          @click="savePreferences"
        />
      </q-toolbar>
      <div class="flex-grow overflow-y-auto no-scrollbar q-pa-md pb-12">
        
        <!-- Esemény Típusok kártya -->
        <div class="mb-6 flex flex-col relative overflow-hidden" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 20px;">
          <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div class="flex justify-between items-center mb-4">
            <div style="font-size: 14px; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; margin: 0;">
              <q-icon name="category" size="18px" /> Eseménytípusok
              <q-btn round flat dense icon="info" size="xs" color="indigo-400">
                <q-tooltip class="bg-indigo-900 text-white shadow-4 text-xs font-bold border border-indigo-500/30" :offset="[10, 10]" style="max-width: 250px;">
                  Válaszd ki azokat az esemény típusokat és cimkéket, amelyek érdekelnek, hogy a felületen az ilyen típusú események jelenjenek meg.
                </q-tooltip>
              </q-btn>
            </div>
            <q-btn round icon="add" color="indigo-500" class="shadow-[0_8px_20px_rgba(99,102,241,0.5)] hover:scale-110 transition-transform" @click="openEventTypesDialog" />
          </div>
          
          <div v-if="authStore.eventTypePreferences && authStore.eventTypePreferences.length > 0" class="flex flex-wrap mt-2" style="gap: 8px;">
            <div 
              v-for="pref in authStore.eventTypePreferences" 
              :key="'pref_type_' + pref.EventTypeID"
              class="inline-flex items-center justify-center font-bold rounded-full text-[15px] tracking-wide cursor-pointer transition-all hover:scale-105 max-w-full"
              style="background-color: #6366f1; color: white; box-shadow: 0 4px 12px rgba(99,102,241,0.4); padding: 6px 16px;"
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
            <div class="text-xs font-bold text-indigo-400 uppercase tracking-widest">Esemény típus hozzáadása</div>
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
        <q-toolbar-title class="font-black text-lg uppercase tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-sky-300 drop-shadow-lg">
          Beállítások
        </q-toolbar-title>
        <q-btn 
          round 
          icon="save" 
          size="md"
          class="mr-2 shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:scale-110 transition-transform duration-300"
          style="background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%); color: white;"
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

  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';
import { useAuthStore } from 'src/stores/auth';
import { useMasterDataStore } from 'src/stores/masterData';
import { useEventStore } from 'src/stores/event';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

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

type ViewState = 'menu' | 'adataim' | 'preferenciak' | 'beallitasok';
const activeView = ref<ViewState>('menu');
const qrScannerOpen = ref(false);

// Számlázási cím szerkesztő állapota
const isBillingDialogVisible = ref(false);
const billingDialogMode = ref<'add' | 'edit'>('add');
const currentBillingAddress = ref<any>({});
const showMoreBillingDetails = ref(false);

function openBillingDialog(mode: 'add' | 'edit', addr?: any) {
  billingDialogMode.value = mode;
  if (mode === 'edit' && addr) {
    currentBillingAddress.value = { ...addr };
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
  }
  showMoreBillingDetails.value = false;
  isBillingDialogVisible.value = true;
}

function saveBillingAddress() {
  // TODO: Hívás a backend felé
  console.log('Mentve:', currentBillingAddress.value);
  isBillingDialogVisible.value = false;
}

function savePersonalData() {
  // TODO: Hívás a backend felé
  console.log('Személyes adatok mentve:', authStore.user);
  $q.notify({
    message: 'Személyes adatok sikeresen mentve!',
    color: 'positive',
    position: 'top',
    icon: 'check_circle'
  });
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
.profile-card {
  border-radius: 2rem;
  background: radial-gradient(circle at top, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
}

.icon-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.menu-item {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.03);
    
    .icon-wrap {
      transform: scale(1.05);
      background-color: rgba(14, 165, 233, 0.18);
    }
    
    .arrow-icon {
      transform: translateX(3px);
      color: var(--q-primary) !important;
    }
  }
}

.logout-item {
  &:hover {
    background-color: rgba(239, 68, 68, 0.05);
    
    .icon-wrap {
      background-color: rgba(239, 68, 68, 0.18);
    }
  }
}

.menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03) 10%, rgba(255, 255, 255, 0.03) 90%, transparent);
  margin: 2px 8px;
}

@keyframes scan {
  0%, 100% { top: 0; opacity: 0; }
  10%, 90% { opacity: 1; }
  50% { top: 100%; opacity: 1; }
}
.animate-scan {
  animation: scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
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
</style>
