# APK Output Directory (`test/`)

When pushed to GitHub, the **Build Android APK** workflow (`/.github/workflows/build-apk.yml`) compiles the Android Capacitor project and commits the installable APK directly here as:

`test/test.apk`

It also attaches `test.apk` to the repository's **Releases** page (`latest`) for one-click download on Android.

### Why isn't `test.apk` compiled inside this preview sandbox?
This web sandbox only has Node.js—it does not include Java JDK, Gradle, `aapt2`, `d8`, `apksigner`, or the Android SDK, so a real Android `.apk` binary cannot be compiled inside the container.

### To ensure `test.apk` builds and commits automatically on GitHub:
1. Push this repository to GitHub (`main` or `master`).
2. In your GitHub repository, open **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, and click **Save**.
3. Open the **Actions** tab and run **Build Android APK** (it also runs automatically on push). Once finished, download `test/test.apk` directly from the `test/` folder or from **Releases**.
