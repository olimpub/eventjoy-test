import re

# 1. Update ChatDetailPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "r", encoding="utf-8") as f:
    chat = f.read()

# Update Header Name
chat = chat.replace(
    '<span class="text-white font-black uppercase tracking-wider text-[15px] drop-shadow-sm leading-tight">Kovács Péter</span>',
    '<span class="font-black uppercase tracking-widest text-[16px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 drop-shadow-sm leading-tight">Kovács Péter</span>'
)

# Add name above "Their Message" bubbles
# We find:
#       <!-- Their Message -->
#       <div class="flex flex-col gap-1 items-start max-w-[85%]">
#         <div class="flex items-end gap-2">
chat = chat.replace(
    '''<!-- Their Message -->
      <div class="flex flex-col gap-1 items-start max-w-[85%]">
        <div class="flex items-end gap-2">''',
    '''<!-- Their Message -->
      <div class="flex flex-col gap-1 items-start max-w-[85%]">
        <span class="ml-[36px] font-black uppercase tracking-widest text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mb-0.5">Kovács Péter</span>
        <div class="flex items-end gap-2">'''
)

with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "w", encoding="utf-8") as f:
    f.write(chat)


# 2. Update MessagesPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    msgs = f.read()

msgs = msgs.replace(
    '<div class="truncate min-w-0 text-white font-black uppercase tracking-wider text-[14px] mr-2">Kovács Péter</div>',
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2 drop-shadow-sm">Kovács Péter</div>'
)

msgs = msgs.replace(
    '<div class="truncate min-w-0 text-slate-300 font-black uppercase tracking-wider text-[14px] mr-2">Nagy Anna</div>',
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2 drop-shadow-sm opacity-80">Nagy Anna</div>'
)

msgs = msgs.replace(
    '<div class="truncate min-w-0 text-slate-300 font-black uppercase tracking-wider text-[14px] mr-2">OlimPub Kvíz Csoport</div>',
    '<div class="truncate min-w-0 font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 mr-2 drop-shadow-sm opacity-80">OlimPub Kvíz Csoport</div>'
)

with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(msgs)

print("Names redesigned successfully.")
