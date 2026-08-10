import re

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# Define the replacement pattern
pattern = re.compile(
    r'<div class="rounded-\[16px\] bg-\[#1E293B\] shadow-\[.*?\] pl-3 py-3 pr-6 cursor-pointer hover:-translate-y-1 hover:bg-\[#2A3B54\] transition-all (?:group )?relative overflow-hidden">\s*'
    r'<div class="absolute left-0 top-0 bottom-0 w-1 (.*?)"></div>\s*'
    r'<div class="flex items-center gap-3 pl-3 w-full">\s*'
    r'(<q-avatar.*?>.*?</q-avatar>|<div class="w-\[?44px\]? h-\[?44px\]?.*?</div>|<div class="w-10 h-10.*?</div>)\s*'
    r'<div class="flex flex-col flex-1 min-w-0 w-full">\s*'
    r'<div class="flex justify-between items-center mb-0.5 w-full gap-2">\s*'
    r'<span class="text-(.*?) font-black uppercase tracking-widest text-\[12px\] truncate.*?">(.*?)</span>\s*'
    r'<span class="text-(.*?) text-\[10px\] font-black uppercase tracking-wider bg-(.*?) px-2 py-0.5 rounded-full shrink-0 .*?whitespace-nowrap">(.*?)</span>\s*'
    r'</div>\s*'
    r'<span class="text-slate-(.*?) text-\[12px\] font-medium leading-tight line-clamp-1">(.*?)</span>\s*'
    r'</div>\s*'
    r'</div>\s*'
    r'</div>', re.DOTALL)

def replacer(match):
    edge_class = match.group(1)
    avatar_html = match.group(2)
    name_color = match.group(3)
    name_text = match.group(4)
    time_color = match.group(5)
    time_bg = match.group(6)
    time_text = match.group(7)
    msg_color = match.group(8)
    msg_text = match.group(9)
    
    # We will ensure avatar_html has mr-3, but we can just use gap-3 on the parent as long as we remove w-full
    
    return f"""<div class="rounded-[16px] bg-[#1E293B] shadow-[0_8px_20px_rgba(0,0,0,0.4)] p-3 cursor-pointer hover:-translate-y-1 hover:bg-[#2A3B54] transition-all group relative overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1 {edge_class}"></div>
                  <div class="flex items-center pl-3">
                    <div class="shrink-0 mr-3">
                      {avatar_html}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                      <div class="flex items-center justify-between mb-0.5">
                        <div class="truncate min-w-0 text-{name_color} font-black uppercase tracking-wider text-[12px] mr-2">{name_text}</div>
                        <div class="shrink-0 text-{time_color} text-[10px] font-black uppercase bg-{time_bg} px-2 py-0.5 rounded-full whitespace-nowrap">{time_text}</div>
                      </div>
                      <div class="truncate text-slate-{msg_color} text-[12px] font-medium leading-tight">{msg_text}</div>
                    </div>
                  </div>
                </div>"""

new_content = pattern.sub(replacer, content)

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replacement complete.")
