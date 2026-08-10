import re

files = [
    "src/pages/IndexPage.vue",
    "src/pages/NotificationsPage.vue",
    "src/pages/MessagesPage.vue"
]

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        c = f.read()
    
    # Update horizontal scroll events border in IndexPage
    c = c.replace("'1px solid rgba(255,255,255,0.08)'", "'1px solid rgba(56, 189, 248, 0.15)'")
    
    # Update the inline styles we copied to Messages and Notifications
    c = c.replace("border: 1px solid rgba(255, 255, 255, 0.08);", "border: 1px solid rgba(56, 189, 248, 0.15);")
    
    # Update bottom vertical lists in IndexPage
    c = c.replace("border border-white/5 ", "border border-sky-500/15 ")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(c)

print("Borders upgraded to elegant sky blue.")
