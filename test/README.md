# APK Output Directory (`test/`)

The Android Capacitor project has been scaffolded in `/android` and configured in `/.github/workflows/build-apk.yml` to output the compiled APK here at:

`test/the-weight-of-warmth.apk`

> **Note:** A compiled `.apk` binary cannot be generated directly inside the web-only preview sandbox because Java JDK, Gradle, and the Android SDK are not installed in this container. Pushing to GitHub (via the included GitHub Actions workflow) or running `./gradlew assembleDebug` locally with Android SDK / JDK 21 installed will produce the signed debug APK in this folder.
