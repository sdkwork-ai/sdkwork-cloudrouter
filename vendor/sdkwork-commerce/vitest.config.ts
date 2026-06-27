import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
const workspacePnpmStore = path.join(workspaceNodeModules, ".pnpm");
const appbaseRoot = path.resolve(
  workspaceRoot,
  "../sdkwork-appbase",
);
const uiRoot = path.resolve(
  workspaceRoot,
  "../sdkwork-ui",
);
const sdkRoot = path.resolve(workspaceRoot, "..");

const sharedUiRuntimePackages = [
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-popover",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "@tanstack/react-table",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "react-day-picker",
  "react-hook-form",
  "react-resizable-panels",
  "sonner",
  "tailwind-merge",
];

function packageStorePrefix(packageName: string): string {
  const [scope, name] = packageName.startsWith("@")
    ? packageName.split("/")
    : ["", packageName];
  return scope ? `${scope}+${name}@` : `${name}@`;
}

function resolveWorkspacePackage(packageName: string): string {
  const directPath = path.join(workspaceNodeModules, packageName);
  if (existsSync(directPath)) {
    return directPath;
  }

  if (!existsSync(workspacePnpmStore)) {
    return packageName;
  }

  const pnpmEntry = readdirSync(workspacePnpmStore)
    .filter((entry) => {
      const packagePath = path.join(workspacePnpmStore, entry, "node_modules", packageName);
      return entry.startsWith(packageStorePrefix(packageName)) || existsSync(packagePath);
    })
    .sort()
    .at(-1);

  if (!pnpmEntry) {
    return packageName;
  }

  return path.join(workspacePnpmStore, pnpmEntry, "node_modules", packageName);
}

function loadWorkspaceRuntimeAliases() {
  return sharedUiRuntimePackages.map((packageName) => ({
    find: packageName,
    replacement: resolveWorkspacePackage(packageName),
  }));
}

function loadTsconfigAliases() {
  const tsconfigBasePath = path.join(workspaceRoot, "tsconfig.base.json");
  const tsconfigBase = JSON.parse(readFileSync(tsconfigBasePath, "utf8"));
  const pathMappings = tsconfigBase?.compilerOptions?.paths ?? {};
  const runtimeAliases = new Set([
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
  ]);

  return Object.entries(pathMappings).flatMap(([find, replacements]) => {
    if (runtimeAliases.has(find)) {
      return [];
    }

    const replacement = Array.isArray(replacements) ? replacements[0] : undefined;
    if (typeof replacement !== "string") {
      return [];
    }

    return [{
      find: find.endsWith("/*") ? find.slice(0, -2) : find,
      replacement: path.resolve(
        workspaceRoot,
        replacement.endsWith("/*") ? replacement.slice(0, -2) : replacement,
      ),
    }];
  }).sort((left, right) => right.find.length - left.find.length);
}

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "react",
        replacement: path.join(workspaceNodeModules, "react"),
      },
      {
        find: "react-dom",
        replacement: path.join(workspaceNodeModules, "react-dom"),
      },
      {
        find: "react-router",
        replacement: path.join(
          workspaceNodeModules,
          "react-router-dom",
          "node_modules",
          "react-router",
        ),
      },
      {
        find: "react-router-dom",
        replacement: path.join(workspaceNodeModules, "react-router-dom"),
      },
      {
        find: "react-i18next",
        replacement: path.join(workspaceNodeModules, "react-i18next"),
      },
      {
        find: "lucide-react",
        replacement: path.join(workspaceNodeModules, "lucide-react"),
      },
      ...loadWorkspaceRuntimeAliases(),
      ...loadTsconfigAliases(),
    ],
    dedupe: [
      "react",
      "react-dom",
      "react-router",
      "react-router-dom",
      "react-i18next",
      "lucide-react",
      ...sharedUiRuntimePackages,
    ],
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      "sdks/sdkwork-commerce-*/**/generated/**",
    ],
    environment: "jsdom",
    include: [
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "sdks/sdkwork-sdk-downloader/**/*.test.ts",
    ],
    setupFiles: [path.join(workspaceRoot, "vitest.setup.ts")],
  },
  server: {
    fs: {
      allow: [workspaceRoot, appbaseRoot, uiRoot, sdkRoot],
    },
  },
});

