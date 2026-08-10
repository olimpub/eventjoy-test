with open("src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'font-black uppercase tracking-widest text-[14px] text-sky-400 drop-shadow-md mr-2" style="text-shadow: 0px 0px 1px currentColor;"',
    'font-black tracking-[1.5px] text-[15px] text-sky-400 drop-shadow-md mr-2" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;"'
)

c = c.replace(
    'font-black uppercase tracking-widest text-[14px] text-slate-300 drop-shadow-md mr-2" style="text-shadow: 0px 0px 1px currentColor;"',
    'font-black tracking-[1.5px] text-[15px] text-slate-300 drop-shadow-md mr-2" style="-webkit-text-stroke: 0.5px currentColor; text-shadow: 0px 0px 2px currentColor;"'
)

with open("src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Done.")
