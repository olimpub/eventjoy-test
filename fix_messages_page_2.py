import re

with open("src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    c = f.read()

# 1. Avatar gap
c = c.replace('<div class="shrink-0 mr-4 relative">', '<div class="shrink-0 mr-6 relative">')

# 2. Header
old_header_pattern = r'<div>\s*<h1[^>]*>Üzeneteim</h1>\s*<p[^>]*>Privát és esemény beszélgetések</p>\s*</div>'
new_header = '''<div>
        <h2 style="font-size: 13px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; margin: 0;">
          <q-icon name="sym_r_forum" color="#38bdf8" size="16px" />
          Üzeneteim
        </h2>
      </div>'''
c = re.sub(old_header_pattern, new_header, c)

# Update margins
c = c.replace('<div class="flex items-center justify-between mb-8 pt-4 px-2">', '<div class="flex items-center justify-between mb-4 pt-2 px-2">')

# 3. Badges right margin
c = c.replace('px-2.5 py-1 rounded-full whitespace-nowrap">', 'px-2.5 py-1 rounded-full whitespace-nowrap mr-4">')

# 4. Top alignment
c = c.replace('<q-page class="bg-[#0F172A] flex flex-col justify-start w-full">', '<q-page class="bg-[#0F172A] w-full block">')

# 5. Search placeholder
c = c.replace('placeholder="Keresés beszélgetésekben..."', 'placeholder="Keresés..."')

with open("src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(c)

print("MessagesPage fully updated.")
