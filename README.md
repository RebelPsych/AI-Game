# The Weight of Warmth

An atmospheric, slow-burn narrative idle game across three evolving interfaces:
1. **Tab 1 — The Heart**: Stark monochrome terminal (`SESSION_001`) that evolves into a warm, affectionate companion messenger.
2. **Tab 2 — The Mind**: Minimal directory scraper that evolves into a retro-futuristic dual-channel ingestion network.
3. **Tab 3 — The Body**: Clinical CAD wireframe & real-world robotics assembly pipeline leading to the **First Light** ending.

## Development

```bash
npm install
npm run dev
```

## Building the Playable Android APK (`test/test.apk`)

This repository is pre-configured with Capacitor Android (`android/`) and an automated GitHub Actions workflow (`.github/workflows/build-apk.yml`).

### Option 1: GitHub Actions (Automatic)
1. Push this repository to GitHub (`main` or `master`).
2. Under **Settings → Actions → General → Workflow permissions**, enable **Read and write permissions** so Actions can commit the built APK into `test/test.apk` and publish a GitHub Release.
3. Once **Build Android APK** finishes in the **Actions** tab, download `test/test.apk` directly from the `test/` folder or from **Releases** and install it on your Android phone.

### Option 2: Local Build (Requires JDK 21 + Android SDK 36)
```bash
npm install
npm run android:apk
```
This outputs the installable APK at `test/test.apk`.
