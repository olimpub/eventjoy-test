import re

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert messages menu width to 380px
content = content.replace("width: 440px;", "width: 380px;")

# 2. Change avatar sizes in messages to match notifications (40px)
content = content.replace('size="44px"', 'size="40px"')
content = content.replace('w-[44px] h-[44px]', 'w-10 h-10')

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("Widths and avatar sizes unified.")
