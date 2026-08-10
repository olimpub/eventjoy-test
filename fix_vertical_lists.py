import re

# 1. Revert horizontal slider in IndexPage
with open("src/pages/IndexPage.vue", "r", encoding="utf-8") as f:
    c1 = f.read()

c1 = c1.replace(
    "border: event.status === 'active' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.15)',",
    "border: event.status === 'active' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)',"
)

# Fix vertical list spacing in IndexPage
c1 = c1.replace('class="space-y-4"', 'class="flex flex-col gap-6"')
c1 = c1.replace('class="space-y-2"', 'class="flex flex-col gap-6"')

# Upgrade vertical cards in IndexPage
old_card_1 = 'class="bg-white/5 border border-sky-500/15 flex flex-col hover:border-brand-primary/30 transition-all duration-300 relative overflow-hidden group/card"\n               style="border-radius: 24px; padding: 16px;"'
new_card = 'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card"\n               style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"'

# We need a regex because spacing/indentation might differ
c1 = re.sub(r'class="bg-white/5 border border-[a-z0-9-/]+ flex flex-col hover:border-brand-primary/30 transition-all duration-300 relative overflow-hidden group/card"\s*style="border-radius: 24px; padding: 16px;"', 
            r'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"', c1)


with open("src/pages/IndexPage.vue", "w", encoding="utf-8") as f:
    f.write(c1)

# 2. Update MyEventsPage
with open("src/pages/MyEventsPage.vue", "r", encoding="utf-8") as f:
    c2 = f.read()

# Fix spacing
c2 = c2.replace('class="space-y-4"', 'class="flex flex-col gap-6"')

# Upgrade vertical cards
c2 = re.sub(r'class="bg-white/5 border border-[a-z0-9-/]+ flex flex-col hover:border-brand-primary/30 transition-all duration-300 relative overflow-hidden group/card"\s*style="border-radius: 24px; padding: 16px;"', 
            r'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card" style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-radius: 24px; padding: 16px;"', c2)

with open("src/pages/MyEventsPage.vue", "w", encoding="utf-8") as f:
    f.write(c2)

print("Vertical lists upgraded and Index slider reverted.")
