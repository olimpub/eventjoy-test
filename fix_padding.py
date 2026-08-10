import re

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add &nbsp; to all time badges text
content = re.sub(r'(<div class="shrink-0 text-[a-zA-Z0-9-]+ text-\[10px\] font-black uppercase bg-[a-zA-Z0-9-/]+ px-2 py-0\.5 rounded-full whitespace-nowrap">)(.*?)(</div>)', r'\1\2&nbsp;\3', content)

# 2. Add extra mr-4 to the badge itself
content = re.sub(r'(<div class="shrink-0 text-[a-zA-Z0-9-]+ text-\[10px\] font-black uppercase bg-[a-zA-Z0-9-/]+ px-2 py-0\.5 rounded-full whitespace-nowrap)', r'\1 mr-4', content)

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("Padding applied.")
