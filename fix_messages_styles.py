import re

with open("src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

old_div_unread = 'rounded-[20px] bg-[#1E293B] shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden'
old_div_read = 'rounded-[20px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.3)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden'

exact_style = 'style="background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);"'
new_div = f'rounded-[24px] p-4 cursor-pointer hover:-translate-y-1 transition-all relative group overflow-hidden" {exact_style}'

c = c.replace(f'class="{old_div_unread}"', f'class="{new_div}')
c = c.replace(f'class="{old_div_read}"', f'class="{new_div}')

# Remove all absolute side stripes
c = re.sub(r'\s*<div class="absolute left-0 top-0 bottom-0 w-1\.5 bg-[a-z0-9-]+ shadow-\[0_0_15px_#[a-z0-9]+\]"></div>', '', c)
c = re.sub(r'\s*<div class="absolute left-0 top-0 bottom-0 w-1\.5 bg-[a-z0-9-]+ opacity-50"></div>', '', c)

with open("src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Messages styles perfectly matched.")
