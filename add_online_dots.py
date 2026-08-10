import re

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# Add relative to the wrapper of avatars
content = content.replace('<div class="shrink-0 mr-3">', '<div class="shrink-0 mr-3 relative">')

# Add green dot to Kovács Péter (he has peter avatar)
peter_avatar = '<q-avatar size="40px" class="bg-slate-800 shrink-0"><img src="https://i.pravatar.cc/150?u=peter" /></q-avatar>'
peter_with_dot = peter_avatar + '\n                      <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1E293B] shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>'
content = content.replace(peter_avatar, peter_with_dot)

# Add green dot to Nagy Anna (she has anna avatar)
anna_avatar = '<q-avatar size="40px" class="bg-slate-800 shrink-0 opacity-70"><img src="https://i.pravatar.cc/150?u=anna" /></q-avatar>'
anna_with_dot = anna_avatar + '\n                      <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1E293B] shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>'
content = content.replace(anna_avatar, anna_with_dot)

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("Added online dots to MainLayout")
