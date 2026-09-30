# Private Core Launcher

**Private Core Launcher** is a Capacitor-powered Android shell for a curated set of HTTPS web applications. It presents a dark, touch-first dashboard and opens each selected app in a separate, immersive native `WebView`. The source lives locally; the target web applications remain hosted at their own live URLs.

## What is included

| Capability | Implementation |
|---|---|
| Editable portfolio | The root-level `launcher_config.json` is validated and bundled directly into the dashboard during each build, then copied into the Capacitor web bundle as a runtime fallback. |
| Fresh web content | The native activity uses `LOAD_NO_CACHE`, clears the WebView cache before launch, sends no-cache headers, and adds a timestamp cache buster when `webview_force_refresh_on_launch` is true. Pull down inside a live app to fetch again. |
| Clean return path | The immersive view provides a low-profile **Hub** control in the upper-left corner. Android’s system back action also returns to the launcher. |
| Transport restriction | App URLs are validated as HTTPS in both the TypeScript dashboard and Android plugin. Cleartext traffic and mixed WebView content are disabled. |
| App icons | The launcher renders each app’s configured `icon_asset_path`. A small fallback glyph is shown only if that asset is missing. |
| Android packaging | Capacitor creates a normal Gradle Android project. `pnpm build:android` synchronizes web assets and invokes `./gradlew assembleRelease`. |

## Repository layout

```text
launcher_config.json                 # Edit apps and launcher settings here
assets/icons/                        # App tile artwork; copied into the bundle at build time
client/                              # React launcher dashboard
android/                             # Capacitor-generated Android project and native WebView bridge
scripts/sync-launcher-config.mjs     # Copies config + assets into client/public
scripts/generate-android-icons.mjs   # Creates Android resource densities from one 1024px PNG
capacitor.config.ts                  # Capacitor shell identity and Android settings
```

## Configure the portfolio

Update the root-level [`launcher_config.json`](./launcher_config.json). Each entry must include a unique `app_id`, display text, a valid **HTTPS** `target_live_url`, and an icon path that resolves beneath `assets/`.

```json
{
  "app_id": "my_tool",
  "display_name": "My Tool",
  "target_live_url": "https://my-tool.example.com",
  "icon_asset_path": "assets/icons/my-tool.png",
  "description": "A short dashboard description."
}
```

The root config is the source of truth. Do not edit the generated `client/public/launcher_config.json`; it is refreshed automatically before every launcher build.

## First-time local setup

Install the following tools before building a release APK:

1. **Node.js 20+** and `pnpm`.
2. **JDK 21** (the Capacitor Android Gradle Plugin requires a modern JDK).
3. **Android Studio** with Android SDK Platform 36, Build-Tools, and Android SDK Command-line Tools. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` to the SDK directory and add `platform-tools` to `PATH`.

For Ubuntu, an example setup is:

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Install Java/Android tooling through Android Studio where possible; it will manage compatible SDK packages and the emulator for you.

## Development and Android build commands

From the repository root:

```bash
# Install JavaScript dependencies once
pnpm install

# Create the included placeholder tile icons (optional—replace them with your own PNGs)
node scripts/generate-placeholder-icons.mjs

# Start the browser dashboard for visual iteration
pnpm dev

# Type-check / bundle the web dashboard and synchronize it into Android
pnpm build:launcher

# Produce a debug APK
pnpm apk:debug

# Produce a release APK (unsigned unless you configure signing)
pnpm build:android
```

## Guided Launcher Studio

For users who do not want to edit JSON or use Gradle directly, run:

```bash
pnpm studio
```

Then open `http://127.0.0.1:4177` in a browser. Studio lets you add, edit, remove, and validate HTTPS websites, save the launcher configuration, and start a signed release build. The build status and APK output location are shown on the page. The signing key and generated passwords are kept outside the project under `~/.private-core-launcher` and are never printed into the Studio interface or included in source ZIPs.

The debug APK is written under `android/app/build/outputs/apk/debug/`. The release APK is written under `android/app/build/outputs/apk/release/`.

> **Signing note:** `assembleRelease` produces an unsigned release APK by default. Configure an Android signing key in a local, uncommitted Gradle properties file before distributing the binary outside personal testing.

## Generate Android launcher resources from one master icon

Create or export a square **1024×1024 PNG**, then run:

```bash
pnpm icons:android /absolute/path/to/master-icon-1024.png
```

The script validates dimensions and writes legacy launcher PNGs, round variants, adaptive foreground assets, and adaptive icon XML into `android/app/src/main/res/`. To use a non-default Android resources directory, provide it as a second argument.

```bash
pnpm icons:android ./my-brand-1024.png ./android/app/src/main/res
```

## Native WebView behavior

When a card is selected, the React dashboard invokes the native `LauncherWebView` Capacitor plugin. It opens `LiveAppActivity`, not the system browser. That activity clears stale cached content on each configured fresh launch, blocks HTTP and mixed content, accepts web cookies for normal authenticated web-app behavior, and exposes a pull-to-refresh gesture. The activity has no injected JavaScript bridge beyond Capacitor’s own dashboard surface.

External non-HTTPS navigation requests from the live WebView are delegated to Android rather than loaded in the app shell. This preserves the launcher’s HTTPS-only contract.

## Important operational limitations

A native WebView can request no-cache behavior, but it **cannot force a remote server or CDN to disregard its own cache rules**. To make changes visible immediately, configure each hosted app’s server/CDN to send appropriate revalidation headers (for example, `Cache-Control: no-cache` for mutable HTML) and version static assets. The launcher’s timestamp query parameter is an additional cache-busting safeguard, not a substitute for correct host configuration.

The supplied URLs that include `your-hosted-...` are placeholders. Replace them with real HTTPS endpoints before packaging.

## Open source notes

This repository includes an MIT [`LICENSE`](./LICENSE). Remove any private URLs or keys from `launcher_config.json` before publishing a fork or sharing the source.
