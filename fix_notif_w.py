import re
with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# Replace <div class="flex items-center gap-3 pl-3 w-full"> with <div class="flex items-center gap-3 pl-3"> for notifications
content = content.replace('<div class="flex items-center gap-3 pl-3 w-full">', '<div class="flex items-center gap-3 pl-3">')

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(content)
