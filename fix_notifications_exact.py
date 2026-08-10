import re

with open("src/pages/NotificationsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# Increase gap
c = c.replace('<div class="flex flex-col gap-10 px-2">', '<div class="flex flex-col gap-12 px-2">')

# Match the exact container divs and replace them with the inline-styled version
old_div = 'rounded-[24px] bg-slate-900/70 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.2)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-slate-800/80 transition-all relative group overflow-hidden'
exact_style = 'style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);"'
new_div = f'rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" {exact_style}'

c = c.replace(f'class="{old_div}"', f'class="{new_div}')

# Remove all absolute side stripes
c = re.sub(r'\s*<div class="absolute left-0 top-0 bottom-0 w-1\.5 bg-[a-z0-9-]+ shadow-\[0_0_15px_#[a-z0-9]+\]"></div>', '', c)
c = re.sub(r'\s*<div class="absolute left-0 top-0 bottom-0 w-1\.5 bg-[a-z0-9-]+ opacity-50"></div>', '', c)

with open("src/pages/NotificationsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Styles perfectly matched.")
