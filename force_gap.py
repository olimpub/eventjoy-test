with open("src/pages/IndexPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# Replace flex flex-col gap-6 with inline style
c = c.replace('class="flex flex-col gap-6"', 'style="display: flex; flex-direction: column; gap: 24px;"')

# Remove mb-6 from cards as gap takes care of it
c = c.replace(' group/card mb-6"', ' group/card"')

with open("src/pages/IndexPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

with open("src/pages/MyEventsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('class="flex flex-col gap-6"', 'style="display: flex; flex-direction: column; gap: 24px;"')
c = c.replace(' group/card mb-6"', ' group/card"')

with open("src/pages/MyEventsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed spacing with inline styles.")
