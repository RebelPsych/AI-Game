# APK Output Directory (`the Weight of Warmth/`)

When you push this repository to GitHub, the **Build Android APK** workflow (`/.github/workflows/build-apk.yml`) automatically compiles the Android project and commits the playable APK directly into this folder:

`the Weight of Warmth/the-weight-of-warmth.apk`

It also attaches `the-weight-of-warmth.apk` to the repository's **Releases** page (`latest`) for direct one-click download.

### Why isn't the `.apk` binary committed before pushing?
This web-based development container only has Node.js—it does not include Java JDK, Gradle, or the Android SDK, so a valid signed `.apk` binary cannot be compiled inside the preview sandbox.

### If the `.apk` doesn't appear automatically after pushing:
1. Open the **Actions** tab in your GitHub repository (`RebelPsych/AI-Game`).
2. Verify **Build Android APK** ran (if not, click **Run workflow**).
3. Under **Settings → Actions → General → Workflow permissions**, ensure **Read and write permissions** is selected so GitHub Actions can commit `the-weight-of-warmth.apk` into this folder and publish the Release.
