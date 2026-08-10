with open("src/pages/IndexPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card"',
    'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card mb-6"'
)

with open("src/pages/IndexPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

with open("src/pages/MyEventsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card"',
    'class="flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card mb-6"'
)

with open("src/pages/MyEventsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Added mb-6 directly to cards.")
