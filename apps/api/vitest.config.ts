import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

// The source uses explicit ".js" specifiers (ESM via tsx) but the files are ".ts".
// Vite doesn't rewrite that by default, so map "./foo.js" -> "./foo.ts" when the
// .ts file exists. tsx does the equivalent at runtime.
function resolveTsFromJs(): Plugin {
  return {
    name: "resolve-ts-from-js",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer && source.startsWith(".") && source.endsWith(".js")) {
        const candidate = resolve(dirname(importer), source.replace(/\.js$/, ".ts"));
        if (existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
