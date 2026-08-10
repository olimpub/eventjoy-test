import re

with open("src/pages/NotificationsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# 1. Increase gap
c = c.replace('<div class="flex flex-col gap-8 px-2">', '<div class="flex flex-col gap-10 px-2">')

# 2. Update background and border styling
old_style = 'rounded-[20px] bg-[#1E293B] shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden'
# Read ones have a slightly different shadow maybe? No, in the file I used the same for all except opacity inside. Wait, let me check.
# Unread 1 & 2: shadow-[0_8px_30px_rgba(0,0,0,0.5)]
# Read 3, 4, 5: shadow-[0_8px_20px_rgba(0,0,0,0.3)]

# Replace Unread
c = c.replace(
    'rounded-[20px] bg-[#1E293B] shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden',
    'rounded-[24px] bg-slate-900/70 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.2)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-slate-800/80 transition-all relative group overflow-hidden'
)

# Replace Read
c = c.replace(
    'rounded-[20px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.3)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all relative group overflow-hidden',
    'rounded-[24px] bg-slate-900/70 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.2)] p-4 cursor-pointer hover:-translate-y-1 hover:bg-slate-800/80 transition-all relative group overflow-hidden'
)

with open("src/pages/NotificationsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Notifications styles updated.")
