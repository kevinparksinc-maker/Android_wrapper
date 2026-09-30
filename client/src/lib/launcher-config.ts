import bundledConfigSource from "../../../launcher_config.json?raw";

export type LauncherApp = {
  app_id: string;
  display_name: string;
  target_live_url: string;
  icon_asset_path: string;
  description: string;
  webview_settings?: WebViewSettings;
};

export type WebViewSettings = {
  allow_file_uploads: boolean;
  allow_downloads: boolean;
  persist_session: boolean;
  external_links: "in_app" | "system";
  refresh_mode: "always" | "standard" | "manual";
};

export const defaultWebViewSettings: WebViewSettings = {
  allow_file_uploads: true,
  allow_downloads: true,
  persist_session: true,
  external_links: "in_app",
  refresh_mode: "always",
};

export type LauncherConfig = {
  launcher_settings: {
    hub_title: string;
    theme: "dark_minimal" | string;
    webview_force_refresh_on_launch: boolean;
    allow_native_bridge_permissions: boolean;
  };
  my_portfolio_apps: LauncherApp[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidApp(value: unknown): value is LauncherApp {
  if (!isRecord(value)) return false;
  return [
    "app_id",
    "display_name",
    "target_live_url",
    "icon_asset_path",
    "description",
  ].every((key) => typeof value[key] === "string");
}

function validateConfig(value: unknown): LauncherConfig {
  if (!isRecord(value) || !isRecord(value.launcher_settings)) {
    throw new Error("launcher_config.json is missing launcher_settings.");
  }

  const settings = value.launcher_settings;
  if (
    typeof settings.hub_title !== "string" ||
    typeof settings.theme !== "string" ||
    typeof settings.webview_force_refresh_on_launch !== "boolean" ||
    typeof settings.allow_native_bridge_permissions !== "boolean" ||
    !Array.isArray(value.my_portfolio_apps) ||
    !value.my_portfolio_apps.every(isValidApp)
  ) {
    throw new Error("launcher_config.json does not match the required schema.");
  }

  for (const app of value.my_portfolio_apps) {
    const url = new URL(app.target_live_url);
    if (url.protocol !== "https:") {
      throw new Error(`${app.display_name} must use an HTTPS target_live_url.`);
    }
    app.webview_settings = { ...defaultWebViewSettings, ...app.webview_settings };
  }

  return value as LauncherConfig;
}

export async function loadLauncherConfig(): Promise<LauncherConfig> {
  // Native Capacitor builds can expose bundled assets through a version-specific
  // local URL. The raw import is the reliable source in that environment; the
  // fetch remains useful for browser preview overrides and local debugging.
  try {
    const response = await fetch(`/launcher_config.json?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });

    if (response.ok) {
      return validateConfig(await response.json());
    }
  } catch {
    // Fall through to the build-time source below.
  }

  try {
    return validateConfig(JSON.parse(bundledConfigSource));
  } catch {
    throw new Error("Unable to load launcher configuration from the app bundle.");
  }
}

export function withCacheBuster(url: string): string {
  const target = new URL(url);
  target.searchParams.set("_launcher_refresh", String(Date.now()));
  return target.toString();
}
