import { defineConfig } from "@playwright/test";

const PORT = 8765;

// End-to-end tests run against the committed build output, served as plain files.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 180_000,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}/`, browserName: "chromium" },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory dist`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1920, height: 1080 } } },
    { name: "phone", use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  ],
});
