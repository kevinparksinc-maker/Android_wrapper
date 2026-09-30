import { Capacitor, registerPlugin } from "@capacitor/core";

export interface LauncherWebViewPlugin {
  open(options: {
    url: string;
    title: string;
    forceRefresh: boolean;
    capabilities: {
      allow_file_uploads: boolean;
      allow_downloads: boolean;
      persist_session: boolean;
      external_links: "in_app" | "system";
      refresh_mode: "always" | "standard" | "manual";
    };
  }): Promise<void>;
  close(): Promise<void>;
  reload(): Promise<void>;
}

export const LauncherWebView = registerPlugin<LauncherWebViewPlugin>(
  "LauncherWebView",
);

export const isNativeLauncher = () => Capacitor.isNativePlatform();
