// Loads the project's TypeScript modules into Node through Vite, so the tools can use the real
// simulation without a build step. Returns the module and a function that shuts Vite down.
import { createServer } from "vite";

export async function loadTs(...paths) {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
  const modules = [];
  for (const p of paths) modules.push(await vite.ssrLoadModule(p));
  return { modules, close: () => vite.close() };
}
