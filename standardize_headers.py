import re

# 1. Update MyEventsPage
with open("src/pages/MyEventsPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    '<h2 style="font-size: 20px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; margin: 0;">',
    '<h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">'
)
c = c.replace(
    '<q-icon name="emoji_events" color="brand-primary" size="26px" />',
    '<q-icon name="emoji_events" color="#38bdf8" size="16px" />'
)

with open("src/pages/MyEventsPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

# 2. Update IndexPage
with open("src/pages/IndexPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    '<q-icon name="bookmark" color="brand-primary" size="16px" />',
    '<q-icon name="bookmark" color="#38bdf8" size="16px" />'
)
with open("src/pages/IndexPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

# 3. Update NewsfeedPage
with open("src/pages/NewsfeedPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    '<h2 style="font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.2; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px;">',
    '<h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">'
)
with open("src/pages/NewsfeedPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("Standardized all headers.")
