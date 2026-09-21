# ROCK ARCHIVE PRO

A real, working geological rock and mineral identification and archiving platform:
AI-assisted visual identification (never fabricated), a curated geological reference
database, a full physical-test module (density, Mohs hardness, magnetism, acid, UV),
an offline-first SQLite archive, PDF report generation, Excel export, QR codes, and
an Android app built with Expo/EAS.

The system **never invents scientific data**. Anything that cannot be determined from
a photo is explicitly labeled "Not determinable from image" or "Additional test
required," and every property shown is tagged as one of:
`DATABASE_REFERENCE` (curated mineralogy reference data), `AI_OBSERVATION`, or
`USER_MEASURED`.

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [DATABASE.md](DATABASE.md),
[INSTALLATION.md](INSTALLATION.md).

---

## Project structure

```
rock-archive-pro/
├── backend/          Node.js/Express API — AI vision proxy, geological reference
│                      service, evidence scoring, request/response validation
├── mobile/           Expo/React Native app — offline SQLite archive, camera,
│                      measurements, PDF/Excel export, i18n (FR/EN/AR)
├── database/         Canonical SQLite schema + migrations (mirrored into the app)
├── tests/            Jest tests for backend logic (scoring, density, hardness,
│                      validation) and mobile pure-logic services
├── docs/             Supplementary documentation
├── .env.example      Environment variable template — copy to backend/.env
├── .gitignore
├── package.json      Root workspace scripts
├── README.md, INSTALLATION.md, ARCHITECTURE.md, API.md, DATABASE.md
└── LICENSE
```

---

## A. Extract the ZIP

```bash
unzip rock-archive-pro.zip -d rock-archive-pro
cd rock-archive-pro
```

## B. Upload the project to GitHub

```bash
git init
git add .
git commit -m "Initial commit: ROCK ARCHIVE PRO"
git branch -M main
git remote add origin https://github.com/<your-username>/rock-archive-pro.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `node_modules/`, build artifacts, and any
generated `.db`/`.xlsx`/`.pdf` files, so nothing sensitive is uploaded.

## C. Install dependencies

From the project root:

```bash
npm run install:all
```

This runs `npm install` inside both `backend/` and `mobile/`. (Equivalent to
running `npm install` in each folder separately.)

## D. Configure the AI API key

```bash
cp .env.example backend/.env
```

Open `backend/.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

Get a key at https://console.anthropic.com/. Without this key, `/api/analyze`
and `/api/identify` return a clear `503 PROVIDER_NOT_CONFIGURED` error instead
of ever fabricating a result — the app's Settings screen also shows this status.

Also set `API_BASE_URL` in `.env` (and mirror it into `mobile/app.json`'s
`expo.extra.apiBaseUrl`) to wherever your phone/emulator can reach the backend:

- Android emulator: `http://10.0.2.2:4000` (default already set)
- Physical Android device on the same Wi-Fi: `http://<your-computer-LAN-IP>:4000`

## E. Start the backend

```bash
cd backend
npm run dev
```

Or without auto-reload:

```bash
npm start
```

Verify it's running:

```bash
curl http://localhost:4000/api/health
```

## F. Start the mobile application

```bash
cd mobile
npm start
```

This opens the Expo developer tools. Press `a` to open on a connected Android
device/emulator, or scan the QR code with the **Expo Go** app for quick testing
(camera and SQLite features require a development build for full functionality
— see below).

## G. Test it on Android

**Quick testing (Expo Go):**

```bash
cd mobile
npm run android
```

**Full-feature testing (recommended — camera, SQLite, QR scanning all need a
development build, not just Expo Go):**

```bash
cd mobile
npx eas build --profile development --platform android
```

Install the resulting `.apk` on your device/emulator, then run:

```bash
npx expo start --dev-client
```

## H. Build the APK with EAS

```bash
cd mobile
npm install -g eas-cli   # one-time
eas login                # one-time, requires a free Expo account
eas build:configure      # one-time, links this project to your EAS account
                           # (updates mobile/app.json "extra.eas.projectId")
eas build --platform android --profile preview
```

This produces a downloadable `.apk` (internal distribution profile) — the
`preview` profile is defined in `mobile/eas.json`.

## I. Generate a production build

```bash
cd mobile
eas build --platform android --profile production
```

The `production` profile builds an `.aab` (Android App Bundle) suitable for
Google Play submission. To get a directly-installable production `.apk`
instead, change `"buildType": "app-bundle"` to `"buildType": "apk"` under
`production` in `mobile/eas.json`.

## J. Troubleshooting common errors

| Symptom | Cause | Fix |
|---|---|---|
| `PROVIDER_NOT_CONFIGURED` (503) from `/api/analyze` | `ANTHROPIC_API_KEY` missing in `backend/.env` | Set the key, restart the backend |
| Mobile app can't reach the backend | Wrong `apiBaseUrl` | Use `10.0.2.2:4000` for the Android emulator, or your machine's LAN IP for a physical device — both must be on the same network |
| `PROVIDER_SCHEMA_INVALID` (502) | The AI model returned malformed/non-JSON output | The app deliberately rejects it rather than guessing — retry; if persistent, check `ANTHROPIC_MODEL` in `.env` is a valid, current model name |
| Camera/QR scanner is blank in Expo Go | Expo Go doesn't support all native modules used here | Build and install a development client: `eas build --profile development --platform android` |
| `eas build` fails with "no project ID" | `eas build:configure` wasn't run | Run it once; it patches `app.json`'s `extra.eas.projectId` |
| SQLite errors after an app update | Local schema drifted | Uninstall and reinstall the app during development, or implement a migration bump in `mobile/src/db/database.ts` (`runMigrations`) matching a new file in `database/migrations/` |
| Excel/PDF export produces an empty file | No samples in the archive yet | Create at least one sample first |
| Arabic layout doesn't flip to RTL after switching language | React Native requires a full reload for `I18nManager.forceRTL` | Restart the app after changing language in Settings (the app prompts you to) |

---

## What is real vs. what you must configure

- **Real and working out of the box:** the entire offline archive (SQLite,
  search, filters, comparison, history, QR codes), all measurement/scoring
  math (density, Mohs hardness assistant, evidence-weighted confidence),
  the curated geological reference database, PDF/Excel export, i18n
  (FR/EN/AR + RTL), and the Express backend's validation/error handling.
- **Requires your own configuration:** the AI vision call (`ANTHROPIC_API_KEY`)
  and, optionally, a live market-pricing API (`MARKET_DATA_API_URL` /
  `MARKET_DATA_API_KEY` — without it, valuation correctly reports "Market
  price unavailable" and falls back to manual entry, exactly as specified).
- **Requires your own EAS/Expo account:** producing a signed, installable
  `.apk`/`.aab` — this cannot be done without your own Expo account and a
  network connection to Expo's build servers.
