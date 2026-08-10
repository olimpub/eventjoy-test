with open("src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# 1. Update title
c = c.replace('>Üzenetek</h1>', '>Üzeneteim</h1>')

# 2. Update names format
c = c.replace(
    '<div class="truncate min-w-0 mr-2"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">Kovács Péter</span></div>',
    '<div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-sky-400 drop-shadow-md mr-2" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Kovács Péter</div>'
)

c = c.replace(
    '<div class="truncate min-w-0 mr-2 opacity-80"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">Nagy Anna</span></div>',
    '<div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-slate-300 drop-shadow-md mr-2 opacity-80" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">Nagy Anna</div>'
)

c = c.replace(
    '<div class="truncate min-w-0 mr-2 opacity-80"><span class="font-black uppercase tracking-widest text-[15px] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 inline-block">OlimPub Kvíz Csoport</span></div>',
    '<div class="truncate min-w-0 font-black tracking-[1.5px] text-[13px] text-slate-300 drop-shadow-md mr-2 opacity-80" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;">OlimPub Kvíz Csoport</div>'
)

with open("src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("MessagesPage updated.")
