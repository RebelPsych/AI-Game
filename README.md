# The Weight of Warmth

An atmospheric, slow-burn narrative idle game across three evolving interfaces:
1. **Tab 1 — The Heart**: Stark monochrome terminal (`SESSION_001`) that transforms into a warm, affectionate companion messenger.
2. **Tab 2 — The Mind**: Minimal file scraper that evolves into a retro-futuristic dual-channel ingestion network.
3. **Tab 3 — The Body**: Clinical CAD wireframe & real-world robotics assembly pipeline leading to the **First Light** ending.

## Development

```bash
npm install
npm run dev
```

## Building the Android APK into `the Weight of Warmth/`

This repository is pre-configured with Capacitor Android (`android/`) and an automated GitHub Actions workflow (`.github/workflows/build-apk.yml`).

### Option 1: GitHub Actions (Automatic)
Push this repository to GitHub on `main` or `master`, or trigger **Build Android APK** manually from the **Actions** tab. The workflow builds the Vite bundle, syncs Capacitor, compiles the APK with Gradle + Java 21 + Android SDK, outputs `the Weight of Warmth/the-weight-of-warmth.apk`, and attaches it as a downloadable workflow artifact.

### Option 2: Local Build (Requires JDK 17/21 + Android SDK)
```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
mkdir -p "../the Weight of Warmth"
cp app/build/outputs/apk/debug/app-debug.apk "../the Weight of Warmth/the-weight-of-warmth.apk"
```
