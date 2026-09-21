# INSTALLATION

## Prerequisites

- Node.js >= 18 and npm
- Git
- A free Expo account (https://expo.dev) for EAS builds
- An Anthropic API key (https://console.anthropic.com) for real AI identification
- For Android testing: Android Studio (emulator) or a physical Android device
  with USB debugging enabled, or the **Expo Go** app for quick smoke-testing

## 1. Extract and enter the project

```bash
unzip rock-archive-pro.zip -d rock-archive-pro
cd rock-archive-pro
```

## 2. Install dependencies

```bash
npm run install:all
```

Equivalent manual steps:

```bash
cd backend && npm install && cd ..
cd mobile && npm install && cd ..
```

## 3. Configure environment variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-real-key
ANTHROPIC_MODEL=claude-sonnet-4-6
API_BASE_URL=http://10.0.2.2:4000
```

If you want live market pricing for the valuation module, also set
`MARKET_DATA_API_URL` and `MARKET_DATA_API_KEY` — otherwise valuation runs in
manual-entry-only mode (this is intentional, not a bug: the spec forbids
inventing prices).

## 4. Run the backend

```bash
cd backend
npm run dev
```

Check `http://localhost:4000/api/health` — it should report
`"aiProviderConfigured": true` once your key is set.

## 5. Point the mobile app at your backend

Edit `mobile/app.json` → `expo.extra.apiBaseUrl`:

- Android emulator: `http://10.0.2.2:4000`
- Physical device (same Wi-Fi as your computer): `http://<your-LAN-IP>:4000`
  (find it with `ipconfig` on Windows or `ifconfig`/`ip addr` on macOS/Linux)

## 6. Run the mobile app

```bash
cd mobile
npm start
```

Then press `a` (Android) in the Expo CLI, or scan the QR code with Expo Go.

> Camera capture, local SQLite, and the QR scanner require native modules that
> **Expo Go does not fully support**. For full functionality, build a
> development client once (see README.md section G) and use `expo start --dev-client`.

## 7. Run tests

```bash
npm test
```

Runs the Jest suite in `tests/backend` (scoring engine, density, hardness,
request/response validation) and `tests/mobile` (pure-logic services).

## 8. Build the Android APK

See README.md sections H and I for the full `eas build` walkthrough.

## Common first-run issues

- **"Cannot find module 'expo'"** — you're not inside `mobile/` when running
  `expo` commands, or `npm install` wasn't run there.
- **Backend starts but `/api/analyze` always 503s** — `ANTHROPIC_API_KEY` is
  empty or the `.env` file wasn't copied into `backend/`.
- **Android emulator can't reach `localhost:4000`** — emulators cannot see
  your host machine's `localhost`; always use `10.0.2.2` instead.
