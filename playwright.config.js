import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
  },
  webServer: {
    command: "npm run preview -- --host 0.0.0.0 --port 4173",
    url: "http://127.0.0.1:4173/marsha-puzzle/",
    reuseExistingServer: true,
  },
});
