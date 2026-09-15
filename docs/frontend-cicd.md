# Frontend branching + CI/CD

Quasar/Vite: a beégetett API **`VITE_API_URL`**, nem `VUE_APP_API_URL`.

## Ágak

| Ág | Frontend | API a buildben |
|---|---|---|
| `test` | `https://testapp.eventjoy.hu` | `https://testapi.eventjoy.hu/api` |
| `main` | `https://app.eventjoy.hu` | GitHub variable `VITE_API_URL_PROD` |

`main`-re **nem** pusholunk. Élesítés: PR `test` → `main`.

## Fejlesztés

```bash
git checkout test
git pull
git checkout -b feature/valami
# …kód, commit…
git push -u origin HEAD
```

PR a **`test`** ágra. Merge után kint van a teszt SWA-n.

Ha a teszt OK: PR **`test` → `main`**. A GitHub Action preview URL-t rak a PR-re (Azure SWA). Merge után `app.eventjoy.hu` frissül, a preview törlődik.

## GitHub beállítások

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Név | Érték |
|---|---|
| `VITE_API_URL_TEST` | opcionális, default `https://testapi.eventjoy.hu/api` |
| `VITE_API_URL_PROD` | **kötelező** a `main` buildhez, pl. `https://api.eventjoy.hu/api` |

**Secrets:**

| Név | Honnan |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | teszt SWA (testapp) deployment token |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` | éles SWA (app) deployment token |

A teszt SWA **Production branch** = `test`. Az éles SWA **Production branch** = `main`.

Preview: a SWA-n legyen bekapcsolva a PR environment. A Function CORS-ba kell a `*.azurestaticapps.net` preview host is.

## Workflow fájlok

- `.github/workflows/azure-static-web-apps-testapp.yml` — `test` + PR a `test`-re
- `.github/workflows/azure-static-web-apps-app.yml` — `main` + PR a `main`-re (`test` → `main` preview)
