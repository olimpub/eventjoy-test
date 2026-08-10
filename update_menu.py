import re

def update_main_layout():
    with open("src/layouts/MainLayout.vue", "r", encoding="utf-8") as f:
        c = f.read()

    # 1. Update bottom tab
    c = re.sub(
        r'<q-tab\s+name="qr_scan"\s+icon="qr_code_scanner"\s+label="QR k[oó]d"[^>]*/>',
        '<q-route-tab name="communities" icon="groups" label="Közösségek" to="/communities" exact />',
        c
    )
    
    # 2. Update sidebar item
    sidebar_old = """<q-item clickable @click="openQrScanner" :active-class="$q.dark.isActive ? 'text-brand-primary' : 'text-primary'">
            <q-item-section avatar><q-icon name="qr_code_scanner" /></q-item-section>
            <q-item-section class="font-bold">QR kód beolvasó</q-item-section>
          </q-item>"""
    # handle potential encoding issues with hardcoded string, use regex for safety
    c = re.sub(
        r'<q-item clickable @click="openQrScanner"[^>]*>[\s\S]*?<q-item-section class="font-bold">QR k[oó]d beolvas[oó]</q-item-section>\s*</q-item>',
        '''<q-item clickable to="/communities" :active-class="$q.dark.isActive ? 'text-brand-primary' : 'text-primary'">
            <q-item-section avatar><q-icon name="groups" /></q-item-section>
            <q-item-section class="font-bold">Közösségek</q-item-section>
          </q-item>''',
        c
    )

    # 3. Update router watcher
    c = c.replace(
        "else if (path === '/profile') tab.value = 'profile';",
        "else if (path === '/profile') tab.value = 'profile';\n      else if (path === '/communities') tab.value = 'communities';"
    )

    with open("src/layouts/MainLayout.vue", "w", encoding="utf-8") as f:
        f.write(c)

def update_routes():
    with open("src/router/routes.ts", "r", encoding="utf-8") as f:
        c = f.read()
    
    if "pages/CommunitiesPage.vue" not in c:
        c = c.replace(
            "{ path: 'notifications', component: () => import('pages/NotificationsPage.vue') },",
            "{ path: 'notifications', component: () => import('pages/NotificationsPage.vue') },\n      { path: 'communities', component: () => import('pages/CommunitiesPage.vue') },"
        )
        with open("src/router/routes.ts", "w", encoding="utf-8") as f:
            f.write(c)

update_main_layout()
update_routes()
print("UI updated successfully.")
