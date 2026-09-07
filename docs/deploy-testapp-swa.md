# Teszt frontend: `testapp.eventjoy.hu` — Azure Static Web Apps + GitHub

Pontos runbook. Az API (`testapi.eventjoy.hu`) **már él**. Static Web App a frontendnek **még nincs** ebben a subscriptionben.

**Subscription:** `Pulsator - prod` (`26bb209d-f1c7-4ea6-8495-72f117d5c0c8`)  
**GitHub repo:** `https://github.com/olimpub/eventjoy-test`  
**Build kimenet:** `dist/spa` (`npm run build` → `quasar build`)  
**API a production bundle-ben:** `https://testapi.eventjoy.hu/api` (`src/boot/axios.ts`)

---

## Ki mit csinál

| # | Teendő | Hol | Ki |
|---|---|---|---|
| 0 | CORS: `https://testapp.eventjoy.hu` az API-n | Azure Function | **kész (CLI, 2026-09-07)** |
| 1 | SPA fallback + Node 20 | repo: `public/staticwebapp.config.json`, `.nvmrc` | **kész a workspaceben** (commit + push kell) |
| 2 | Kód fel a GitHubra (nem az üres `main`) | Git | **te** (vagy kérd a commitot) |
| 3 | Static Web App létrehozása + GitHub kötés | Azure Portal | **te** (GitHub OAuth, én nem tudom helyetted) |
| 4 | Workflow mezők (`dist/spa`, Node 20, API URL) | GitHub Actions yml | **te**, vagy **én** a fájl alapján |
| 5 | DNS CNAME `testapp` | ahol az `eventjoy.hu` zóna van | **te** (DNS nincs ebben a subban) |
| 6 | Custom domain + SSL a SWA-n | Azure Portal | **te** |
| 7 | Google JS origin | Google Cloud Console | **te** |
| 8 | Facebook domain / redirect | Meta Developers | **te** |
| 9 | CORS kiegészítés a `*.azurestaticapps.net` ideiglenes hosttal | Function CORS | **én**, ha megvan a SWA hostname |

Amit **nem** tudok: GitHub authorize, DNS a registrarodnál, Google/Facebook konzol, SWA custom domain validáció (TXT/CNAME nálad).

---

## 0. Amit már tudunk (ne keresd újra)

| Erőforrás | Érték |
|---|---|
| Function App | `eventjoy-test-api` / RG `eventjoy-test-api_group` / Canada Central |
| API custom domain | `testapi.eventjoy.hu` (SNI SSL fent) |
| Function default host | `eventjoy-test-api-hafefda8d6e8cqdj.canadacentral-01.azurewebsites.net` |
| SignalR | `eventjoy-test-signalr` → `eventjoy-test-signalr.service.signalr.net` (a FE a `testapi` `/api` hubot hívja, nem közvetlenül a SignalR resource-t) |
| CORS **előtte** | csak `https://portal.azure.com`, `http://localhost:9000` |
| CORS **most** | + `https://testapp.eventjoy.hu` |
| EventJoy SWA | **nincs** (a subban lévő SWA-k: PulsatorWeb, profit-ability, CargoTips, speedmeet) |
| Google client ID (kódban) | `642226178014-m2l06c2hj0uc4ak96j1inskh2nfkgjeb.apps.googleusercontent.com` |
| Facebook app ID (kódban) | `2944722095883838` |
| Helyi API | `.env.development.local` → `http://localhost:7071/api` (**ne** kerüljön a GitHub buildbe) |

Ajánlott SWA: **West Europe**, Free sku, külön RG pl. `eventjoy-test-web` (a többi webes SWA-tok is WEU).

---

## 1. GitHub: mi menjen fel

A GitHub Action **csak azt** buildeli, ami az ágon van.

Most: `main` = Initial commit. A app a `cursor/pta-event-flow` + **uncommitted** fájlok. A SWA-t **ne** a üres `main`-re kösd, amíg oda nem merge-öltek.

**Döntés (egy):**

- **A)** SWA branch = `cursor/pta-event-flow` (gyors teszt), vagy  
- **B)** merge `main`-re, SWA = `main` (tisztább).

Commitolandó deploy-fájlok (már a workspaceben):

- `public/staticwebapp.config.json` — Vue history (`/profile` ne 404), Google popup COOP  
- `.nvmrc` — `20`

`.env.development.local` **tilos** commitolni (gitignore).

Ha kéred, megcsinálom a commitot; push-hoz GitHub írás kell nálad.

---

## 2. Azure Portal — Static Web App + GitHub

1. [portal.azure.com](https://portal.azure.com) → subscription **Pulsator - prod**.  
2. **Create a resource** → kereső: **Static Web App** → Create.

| Mező | Érték |
|---|---|
| Subscription | Pulsator - prod |
| Resource group | új: `eventjoy-test-web` (Location: West Europe) |
| Name | `eventjoy-testapp` |
| Plan type | Free |
| Region | **West Europe** |
| Deployment details | **GitHub** → Sign in az `olimpub` orgra (engedélyezd a Portal appot) |
| Organization | `olimpub` |
| Repository | `eventjoy-test` |
| Branch | a 1. lépés döntése (`cursor/pta-event-flow` vagy `main`) |
| Build Presets | **Custom** |
| App location | `/` |
| Api location | **üresen hagy** (az API nem SWA Functions) |
| Output location | `dist/spa` |

3. Review + create → Create.  
4. Overview: másold ki a **URL**-t, pl. `https://….azurestaticapps.net` — ideiglenes cím, amíg a custom domain nincs kész.

A Portal berakja: `.github/workflows/azure-static-web-apps-<véletlen>.yml` + GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_…`.

---

## 3. GitHub Actions workflow — ezt írd át

Repo → **Actions** / vagy a yml a `.github/workflows/` alatt. A `Azure/static-web-apps-deploy` lépésben:

```yaml
app_location: "/"
api_location: ""
output_location: "dist/spa"
app_build_command: "npm ci && npm run build"
```

Ugyanennél a jobnál `env:` (a `with:` fölött vagy a step `env:`-jében, a **build** lépésen — Vite buildkor kell):

```yaml
env:
  NODE_VERSION: "20"
  VITE_API_URL: "https://testapi.eventjoy.hu/api"
```

Oryx Node: a repo gyökerében van `.nvmrc` = `20`. Ha a build Node 16-tal elszáll, a workflow `env.NODE_VERSION` kötelező.

**Api location üres** maradjon. Ha `/api` vagy `api` kerül bele, a SWA saját Functions-t keres, és a teszt API-t összekeveri.

Commit + push az ágra → Actions zöld → a `*.azurestaticapps.net` URL-en megjelenik a login.

---

## 4. DNS — `testapp.eventjoy.hu`

A `eventjoy.hu` zóna **nincs** ebben az Azure subscriptionben (a `testapi` DNS-ét máshol állítottátok). Ugyanott, ahol a `testapi` CNAME van:

1. SWA Overview → **Custom domains** → másold a default hostot: `xxxx.azurestaticapps.net`.  
2. DNS (Cloudflare / registrar / másik Azure DNS):

| Típus | Név / host | Cél |
|---|---|---|
| CNAME | `testapp` | `xxxx.azurestaticapps.net` |

Ne A-recordot, ne a Function hostot (`…azurewebsites.net`).

Cloudflare: CNAME **DNS only** (szürke felhő), amíg az Azure ki nem adja a certet; utána lehet proxy.

---

## 5. Custom domain a SWA-n

Portal → a SWA → **Custom domains** → **Add** → `testapp.eventjoy.hu`.

- CNAME-es validáció: a 4. lépés rekordja.  
- Ha TXT-t kér: a Portal megadja a hostot (`asuid.testapp` vagy hasonló) és a tokent — másold a DNS-be, Save, várj 1–15 percet.  
- **Add managed certificate** (ingyenes). Kész: `https://testapp.eventjoy.hu`.

---

## 6. CORS kiegészítés (ideiglenes SWA host)

Amíg csak a `*.azurestaticapps.net` megy, az API CORS-ban **az is** kell, különben login/boot 403/CORS.

Portal → Function App `eventjoy-test-api` → **CORS** → Add  
`https://<a-swa-default-host>.azurestaticapps.net`  
vagy szólj, és CLI-ból hozzáadom, ha megvan a hostname.

`https://testapp.eventjoy.hu` már fent van.

---

## 7. Google — Authorized JavaScript origins

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**.  
2. OAuth 2.0 Client ID: `642226178014-m2l06c2hj0uc4ak96j1inskh2nfkgjeb` (Web client).  
3. **Authorized JavaScript origins** — Add:

```
https://testapp.eventjoy.hu
https://<swa-default>.azurestaticapps.net
```

4. Authorized redirect URIs: a `vue3-google-login` token flowhoz általában **nem** kell redirect; ha a Console kötelezővé teszi, ugyanazok a origin-ek.  
5. Save. 5 perc után teszteld a Google gombot HTTPS-en (HTTP origin nem elég).

---

## 8. Facebook

1. [developers.facebook.com](https://developers.facebook.com/) → app `2944722095883838`.  
2. Settings → Basic → **App Domains:** `testapp.eventjoy.hu`  
3. Facebook Login → Settings → **Valid OAuth Redirect URIs:**

```
https://testapp.eventjoy.hu/
https://testapp.eventjoy.hu/login
https://<swa-default>.azurestaticapps.net/
https://<swa-default>.azurestaticapps.net/login
```

4. Ha a app **Development** módban van, csak tesztuserek lépnek be. Teszt publikus URL-hez: **Live** + Privacy Policy URL, vagy maradjon Dev és csak tesztelők.

---

## 9. Ellenőrzőlista (éles teszt)

1. `https://testapp.eventjoy.hu/login` betölt (nem 404).  
2. F12 → Network: XHR `https://testapi.eventjoy.hu/api/...`, **soha** `localhost:7071`.  
3. Email OTP belépés működik.  
4. Refresh: `https://testapp.eventjoy.hu/profile` → app, nem Azure 404 (ez a `staticwebapp.config.json`).  
5. Google gomb: nincs `origin_mismatch` / `idpiframe_initialization_failed`.  
6. Facebook popup: nincs `Can't load URL`.  
7. Esemény élő nézet: SignalR a `testapi` originre megy, Console-ban nincs CORS a websocketre.

---

## Gyakori hibák

| Tünet | Ok |
|---|---|
| Actions: build ok, site üres / régi | rossz `output_location` (nem `dist/spa`) |
| `/profile` 404 refreshre | nincs `staticwebapp.config.json` a `dist/spa`-ban (`public/`-ból kell másolódnia) |
| API hívás localhost-ra | a CI-ben bekerült a `.env.development.local`, vagy nincs `VITE_API_URL` és a fallback sem buildelődött |
| CORS piros a Networkön | hiányzik a pontos `https://` origin a Function CORS-ból (trailing slash nélkül) |
| SignalR `Failed to complete negotiation: Failed to fetch` | a JS kliens `withCredentials: true` (alap), a Function CORS **nem** küld `Access-Control-Allow-Credentials`. A FE `withCredentials: false` (token az `Authorization` headerben). Azure SignalR CORS-ba vedd fel a SWA origint is (`nice-mud-…` + `testapp.eventjoy.hu`) |
| Google origin_mismatch | a JS origin listából hiányzik a **pontos** host |
| Workflow `api_location: api` | SWA Functions conflict — töröld |

---

## Ha a Portal helyett CLI-t kérsz

Én meg tudom csinálni (még nem futott):

```bash
az group create -n eventjoy-test-web -l westeurope
az staticwebapp create -n eventjoy-testapp -g eventjoy-test-web -l westeurope --sku Free
```

A GitHub-kötéshez **GitHub PAT** (repo + workflow) kell tőled — a Portal OAuth ezt kiváltja, ezért a 2. lépés Portalos.
