<template>
  <q-page class="klubhub-page bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    <!-- Brand header: eredeti app ikon + tagline -->
    <header class="klubhub-header relative z-10 q-mb-lg mt-2">
      <div class="klubhub-header__glow" aria-hidden="true" />
      <div class="klubhub-header__logo-wrap">
        <img
          :src="klubhubLogo"
          alt="KlubHub"
          class="klubhub-header__logo"
        />
      </div>
      <div class="klubhub-header__text">
        <h1 class="klubhub-header__title">
          <span class="klubhub-header__title-klub">Klub</span><span class="klubhub-header__title-hub">Hub</span>
        </h1>
        <p class="klubhub-header__tagline">Klubok, Edzések, Közösség</p>
      </div>
    </header>

    <!-- Scrollable Feed -->
    <div class="flex-grow overflow-y-auto no-scrollbar q-pb-xl">
      <div class="flex flex-col gap-6" style="display: flex; flex-direction: column; gap: 12px;">
        
        <!-- Mock Community 1 -->
        <div class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;">
          
          <div class="flex items-center gap-4 mb-4">
            <q-avatar size="50px" class="bg-indigo-500 text-white font-black">VÚ</q-avatar>
            <div>
              <h3 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; line-height: 1.2;">Vasas Úszóklub</h3>
              <p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0 0;">Budapest, Margitsziget</p>
            </div>
          </div>

          <div style="font-size: 13px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <q-icon name="sell" size="18px" style="color: #6366f1; opacity: 0.9;" />
            <span>Aktív bérlet (Még 6 alkalom)</span>
          </div>

          <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(249, 115, 22, 0.12) 100%); margin-top: 6px;">
            <div style="background-color: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Résztvevő
            </div>
            
            <q-btn round unelevated icon="arrow_forward" style="background: linear-gradient(135deg, #F97316, #E11D48); color: white; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);" class="active:scale-95 transition-all outline-none" />
          </div>
        </div>

        <!-- Mock Community 2 -->
        <div class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;">
          
          <div class="flex items-center gap-4 mb-4">
            <q-avatar size="50px" class="bg-rose-500 text-white font-black">PS</q-avatar>
            <div>
              <h3 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; line-height: 1.2;">Pilates Stúdió</h3>
              <p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0 0;">Budapest, 13. kerület</p>
            </div>
          </div>

          <div style="font-size: 13px; color: #cbd5e1; display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <q-icon name="credit_score" size="18px" style="color: #6366f1; opacity: 0.9;" />
            <span>Havi Tagdíj (Rendezve)</span>
          </div>

          <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(249, 115, 22, 0.12) 100%); margin-top: 6px;">
            <div style="background-color: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); color: #a855f7; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Szervező
            </div>
            
            <q-btn round unelevated icon="arrow_forward" style="background: linear-gradient(135deg, #F97316, #E11D48); color: white; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);" class="active:scale-95 transition-all outline-none" />
          </div>
        </div>
        
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { KLUBHUB_BRAND } from 'src/assets/brand/klubhub';

/** Eredeti KH app ikon (gradient) — nagy méretben */
const klubhubLogo = KLUBHUB_BRAND.appIcon;
</script>

<style scoped lang="scss">
.klubhub-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 96px;
  padding: 12px 4px 8px;
}

.klubhub-header__glow {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 140px;
  height: 140px;
  background: radial-gradient(
    ellipse at center,
    rgba(249, 115, 22, 0.32) 0%,
    rgba(225, 29, 72, 0.14) 45%,
    transparent 70%
  );
  pointer-events: none;
  filter: blur(10px);
}

.klubhub-header__logo-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 8px 28px rgba(249, 115, 22, 0.35);
}

.klubhub-header__logo {
  /* Enyhe ránagyítás: levágja a PNG fehér/halo szegélyét */
  width: 112%;
  height: 112%;
  margin: -6%;
  object-fit: cover;
  display: block;
}

.klubhub-header__text {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.klubhub-header__title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.klubhub-header__title-klub {
  color: #ffffff;
}

.klubhub-header__title-hub {
  background: linear-gradient(135deg, #F97316 0%, #E11D48 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.klubhub-header__tagline {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
