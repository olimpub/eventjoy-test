import re

with open("src/pages/NotificationsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# 1. Increase vertical gap between notifications
c = c.replace('<div class="flex flex-col gap-4 px-2">', '<div class="flex flex-col gap-6 px-2">')

# 2. Fix badge overflow
c = re.sub(r'(whitespace-nowrap">)(.*?)(</span>)', r'whitespace-nowrap mr-4">\2&nbsp;&nbsp;</span>', c)

with open("src/pages/NotificationsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("NotificationsPage patched.")
