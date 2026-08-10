<template>
  <q-page class="bg-brand-dark text-white relative overflow-hidden q-pa-md flex flex-col justify-start">
    
    <!-- Title -->
    <div class="relative z-10 q-mb-md mt-4">
      <div class="flex items-center justify-between">
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="groups" color="#38bdf8" size="16px" />
          Közösségek
        </h2>
      </div>
    </div>

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

          <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 6px;">
            <div style="background-color: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.2); color: #34d399; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Résztvevő
            </div>
            
            <q-btn round unelevated icon="arrow_forward" style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);" class="active:scale-95 transition-all outline-none" />
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

          <div class="mt-auto flex items-center justify-between rounded-xl px-4 py-3" style="background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.15) 100%); margin-top: 6px;">
            <div style="background-color: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); color: #a855f7; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
              Szervező
            </div>
            
            <q-btn round unelevated icon="arrow_forward" style="background: var(--ej-gradient); color: white; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);" class="active:scale-95 transition-all outline-none" />
          </div>
        </div>
        
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// Communities list placeholder
</script>

<style scoped lang="scss">
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
