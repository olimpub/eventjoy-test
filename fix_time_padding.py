import re

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# For messages which are div
def repl_div(match):
    cls = match.group(1)
    text = match.group(2).replace("&nbsp;", "").strip()
    cls = re.sub(r'\s*mr-\d+', '', cls)
    return f'{cls} mr-6">{text}&nbsp;&nbsp;&nbsp;</div>'

content = re.sub(
    r'(<div class="shrink-0 text-[^"]+ text-\[10px\] font-black uppercase[^"]*?rounded-full[^"]*?whitespace-nowrap[^"]*)">(.*?)</div>',
    repl_div,
    content
)

# For notifications which are span
def repl_span(match):
    cls = match.group(1)
    text = match.group(2).replace("&nbsp;", "").strip()
    cls = re.sub(r'\s*mr-\d+', '', cls)
    return f'{cls} mr-6">{text}&nbsp;&nbsp;&nbsp;</span>'

content = re.sub(
    r'(<span class="text-[^"]+ text-\[10px\] font-black uppercase[^"]*?rounded-full shrink-0[^"]*?whitespace-nowrap[^"]*)">(.*?)</span>',
    repl_span,
    content
)

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("Added mr-6 and 3 nbsps to all time badges")
