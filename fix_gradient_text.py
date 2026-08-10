import re

# 1. Update ChatDetailPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "r", encoding="utf-8") as f:
    chat = f.read()

chat = chat.replace(
    '<span class="font-black uppercase tracking-widest text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 leading-tight">Kovács Péter</span>',
    '<span class="font-black uppercase tracking-widest text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 leading-tight inline-block">Kovács Péter</span>'
)

chat = chat.replace(
    '<span class="ml-[36px] font-black uppercase tracking-widest text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mb-0.5">Kovács Péter</span>',
    '<span class="ml-[36px] font-black uppercase tracking-widest text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mb-0.5 inline-block">Kovács Péter</span>'
)

with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "w", encoding="utf-8") as f:
    f.write(chat)


# 2. Update MessagesPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    msgs = f.read()

msgs = msgs.replace(
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2">Kovács Péter</div>',
    '<div class="truncate min-w-0 mr-2"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">Kovács Péter</span></div>'
)

msgs = msgs.replace(
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2 opacity-80">Nagy Anna</div>',
    '<div class="truncate min-w-0 mr-2 opacity-80"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">Nagy Anna</span></div>'
)

msgs = msgs.replace(
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2 opacity-80">OlimPub Kvíz Csoport</div>',
    '<div class="truncate min-w-0 mr-2 opacity-80"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">OlimPub Kvíz Csoport</span></div>'
)

with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(msgs)

print("Robust gradient texts applied.")
