import re

def update_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        c = f.read()

    # 1. Update Interface
    c = c.replace(
        "roles?: string[];",
        "roles?: { name: string; type: 'organizer' | 'contributor' | 'participant' }[];"
    )

    # 2. Add helper function at the end of <script setup> just before </script>
    helper_fn = """
// Role type color mapping
function getRoleTypeStyle(type: string) {
  switch(type) {
    case 'organizer': 
      return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)' };
    case 'contributor': 
      return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)' };
    case 'participant':
    default:
      return { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)' };
  }
}
</script>"""
    if "getRoleTypeStyle(" not in c:
        c = c.replace("</script>", helper_fn)

    # 3. Update Template bindings
    # Replace v-for="role in event.roles" :key="role" with key="role.name"
    c = c.replace(':key="role"', ':key="role.name"')
    # Replace {{ role }} with {{ role.name }} inside the spans
    c = c.replace('>\n                {{ role }}\n', '>\n                {{ role.name }}\n')
    c = c.replace('>\n                {{ role }}\n', '>\n                {{ role.name }}\n') # Just in case
    
    # 3a. IndexPage horizontal slider roles
    old_span_index = 'style="font-size: 10px; font-weight: 800; color: #38bdf8; background-color: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(56, 189, 248, 0.2);"'
    new_span_index = 'class="font-bold px-[10px] py-[4px] rounded-[12px] text-[10px] uppercase tracking-wider"\n                :style="{ color: getRoleTypeStyle(role.type).color, backgroundColor: getRoleTypeStyle(role.type).bg, border: \'1px solid \' + getRoleTypeStyle(role.type).border }"'
    c = c.replace(old_span_index, new_span_index)

    # 3b. MyEventsPage roles
    old_span_my = 'style="font-size: 11px; font-weight: 800; color: #38bdf8; background-color: rgba(56, 189, 248, 0.1); padding: 5px 12px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(56, 189, 248, 0.2);"'
    new_span_my = 'class="font-bold px-[12px] py-[5px] rounded-[12px] text-[11px] uppercase tracking-wider"\n                :style="{ color: getRoleTypeStyle(role.type).color, backgroundColor: getRoleTypeStyle(role.type).bg, border: \'1px solid \' + getRoleTypeStyle(role.type).border }"'
    c = c.replace(old_span_my, new_span_my)

    # Replace specific role arrays with objects
    c = c.replace("roles: ['Szervező', 'Játékmester']", "roles: [{name: 'Szervező', type: 'organizer'}, {name: 'Játékmester', type: 'contributor'}]")
    c = c.replace("roles: ['Résztvevő']", "roles: [{name: 'Résztvevő', type: 'participant'}]")
    c = c.replace("roles: ['Előadó', 'Résztvevő']", "roles: [{name: 'Előadó', type: 'contributor'}, {name: 'Résztvevő', type: 'participant'}]")
    c = c.replace("roles: ['Résztvevő', 'Előadó']", "roles: [{name: 'Résztvevő', type: 'participant'}, {name: 'Előadó', type: 'contributor'}]")
    c = c.replace("roles: ['Játékos', 'Csapatkapitány']", "roles: [{name: 'Játékos', type: 'participant'}, {name: 'Csapatkapitány', type: 'contributor'}]")
    c = c.replace("roles: ['Kiállító']", "roles: [{name: 'Kiállító', type: 'contributor'}]")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(c)

update_file("src/pages/IndexPage.vue")
update_file("src/pages/MyEventsPage.vue")

print("Roles updated successfully.")
