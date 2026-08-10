with open("src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace('<div class="shrink-0 mr-3 relative">', '<div class="shrink-0 mr-4 relative">')

with open("src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Done.")
