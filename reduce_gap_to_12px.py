with open("src/pages/IndexPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('gap: 24px;"', 'gap: 12px;"')

with open("src/pages/IndexPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

with open("src/pages/MyEventsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('gap: 24px;"', 'gap: 12px;"')

with open("src/pages/MyEventsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Changed gap to 12px.")
