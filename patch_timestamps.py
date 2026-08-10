with open("src/pages/NotificationsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('mr-4">', 'mr-8">')
c = c.replace('&nbsp;&nbsp;</span>', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>')

with open("src/pages/NotificationsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

with open("src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    c2 = f.read()

c2 = c2.replace('mr-4">', 'mr-8">')
c2 = c2.replace('&nbsp;&nbsp;</div>', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>')

with open("src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(c2)

print("Timestamps patched in both files.")
