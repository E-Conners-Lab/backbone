import { defineConfig } from "@playwright/test";

// End-to-end tests run against dist/, the folder that ships, served by a plain static server.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  fullyParallel: true,
  reporter: [["list"]],
  outputDir: "test-results",
  use: { baseURL: "http://127.0.0.1:4173", deviceScaleFactor: 1 },
  webServer: { command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory dist", url: "http://127.0.0.1:4173", reuseExistingServer: true },
  projects: [
    { name: "desktop-1920x1080", use: { viewport: { width: 1920, height: 1080 } } },
    { name: "phone-844x390", use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  ],
});
