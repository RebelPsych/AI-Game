# APK Output Directory (`the Weight of Warmth/`)

When you push this repository to GitHub, the **Build Android APK** workflow (`/.github/workflows/build-apk.yml`) automatically compiles the Android project and commits the playable APK directly into this folder as:

`the Weight of Warmth/test.apk`

It also attaches `test.apk` to the repository's **Releases** page (`latest`) for direct one-click download.

### Why isn't `test.apk` compiled before pushing?
This AI Studio web container only has Node.js—it does not have Java JDK, Gradle, `aapt2`, `d8`, `apksigner`, or the Android SDK, so a real, playable `.apk` binary cannot be compiled inside this sandbox.

### Steps on GitHub so `test.apk` appears in this folder:
1. Push these files to `RebelPsych/AI-Game`.
2. Go to **Settings → Actions → General → Workflow permissions** and select **Read and write permissions**, then click **Save**.
3. Open the **Actions** tab, select **Build Android APK**, and run it (or push a commit). Once it finishes (~2–3 minutes), `test.apk` will appear right inside `the Weight of Warmth/` and under **Releases**.
