import re

def update_gap(filepath, new_gap):
    with open(filepath, "r", encoding="utf-8") as f:
        c = f.read()
    
    # regex to find `<div class="flex flex-col gap-... px-2">`
    c = re.sub(r'<div class="flex flex-col gap-[a-zA-Z0-9\[\]\-]+ px-2">', f'<div class="flex flex-col {new_gap} px-2">', c)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(c)

# Set an even larger gap for both pages
update_gap("src/pages/NotificationsPage.vue", "gap-[48px]")
update_gap("src/pages/MessagesPage.vue", "gap-[48px]")

print("Gaps increased.")
