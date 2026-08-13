import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pablo.cofrinho",
  appName: "Cofrinho",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: "#F7F3EA"
  }
};

export default config;
