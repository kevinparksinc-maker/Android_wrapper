import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.privatecore.launcher",
  appName: "Private Core Launcher",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
