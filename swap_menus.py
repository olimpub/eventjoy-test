import sys

with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
    content = f.read()

msgs_start = content.find("          <!-- Üzenetek -->")
notifs_start = content.find("          <!-- Értesítések -->")
notifs_end = content.find("        </div>\n      </q-toolbar>")

if msgs_start != -1 and notifs_start != -1 and notifs_end != -1:
    msgs_block = content[msgs_start:notifs_start]
    notifs_block = content[notifs_start:notifs_end]
    
    new_content = content[:msgs_start] + notifs_block + msgs_block + content[notifs_end:]
    
    with open("C:/Dev/Vue/EventJoy App/src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Swapped successfully.")
else:
    print(f"Could not find boundaries: {msgs_start}, {notifs_start}, {notifs_end}")
