# APK Output Directory (`the Weight of Warmth/`)

The Android Capacitor project in `/android` and the GitHub Actions workflow in `/.github/workflows/build-apk.yml` are configured to output the compiled APK here at:

`the Weight of Warmth/the-weight-of-warmth.apk`

> **Note:** A compiled `.apk` binary cannot be generated directly inside this web preview container because Java JDK, Gradle, and the Android SDK are not installed here. Push this repository to GitHub (to run the included **Build Android APK** workflow) or run `npm run android:apk` locally with JDK 17/21 and Android SDK installed to generate the signed debug APK in this folder.
