import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  AGENTS_CONSOLE_BASE_PATH,
  buildAgentsConsolePath,
  readAgentsConsoleAgentId,
  readAgentsConsoleModuleRoute,
} from './agentsConsoleRoute.ts';

/**
 * The suite is a set of contract oracles rather than a rendering test.
 *
 * Two seams are worth pinning and neither is reachable from this repository's
 * type checker alone: the *untyped* strings that cross the owner boundary (i18n
 * keys resolved with a fallback, route segments spliced into URLs) and the
 * deployment facts that justify hiding editor panels. Everything else — the prop
 * contract, the subpath export — is already enforced by `tsc` against the linked
 * `sdkwork-agents` checkout, so asserting it again here would only add a second
 * place to update.
 */

/** Absolute path of the directory holding this spec file. */
const SPEC_FILE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Root of this package, i.e. `packages/sdkwork-cloudrouter-pc-console-agents`. */
const PACKAGE_ROOT = path.resolve(SPEC_FILE_DIR, '..');

/** Root of the Cloud Router PC portal application hosting this package. */
const PORTAL_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');

/** Root of the Cloud Router repository hosting this portal. */
const CLOUDROUTER_REPOSITORY_ROOT = path.resolve(PORTAL_ROOT, '..', '..');

/** Reads a file addressed relative to the hosting portal root. */
function readPortalFile(relativePath: string): string {
  return readFileSync(path.resolve(PORTAL_ROOT, relativePath), 'utf8');
}

/** Reads a file addressed relative to the Cloud Router repository root. */
function readCloudRouterRepositoryFile(relativePath: string): string {
  return readFileSync(path.resolve(CLOUDROUTER_REPOSITORY_ROOT, relativePath), 'utf8');
}

const requireFromPackage = createRequire(path.join(PACKAGE_ROOT, 'package.json'));

/**
 * Root directory of a workspace-linked `@sdkwork/*` dependency.
 *
 * The link is what makes the cross-repository assertions below meaningful, so the
 * location comes from the package name rather than a hand-counted `../..` chain:
 * a renamed, removed, or unlinked dependency fails loudly right here instead of
 * silently reading some other file.
 */
function linkedPackageRoot(packageName: string): string {
  let directory = path.dirname(requireFromPackage.resolve(packageName));
  for (;;) {
    const manifestPath = path.join(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string };
      if (manifest.name === packageName) return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Unable to locate the root of ${packageName}`);
    directory = parent;
  }
}

const AGENTS_PACKAGE = '@sdkwork/agents-pc-agents';
const agentsPackageRoot = linkedPackageRoot(AGENTS_PACKAGE);

/** The owner's console module catalog, the source of the routes spliced into our URLs. */
const AGENTS_CONSOLE_MODULES_SOURCE = readFileSync(
  path.join(agentsPackageRoot, 'src', 'console', 'consoleModules.ts'),
  'utf8',
);

/**
 * The host i18n catalog the owner's `common` namespace copy ships in.
 *
 * Reached as a sibling of the console package rather than through a declared
 * dependency: a host adapter must not depend on the owner's internal commons
 * package, and the two sit in the same owner monorepo `packages/` directory by
 * construction. A restructure moves the file and `readFileSync` fails loudly
 * rather than reading something else.
 */
const AGENTS_COMMONS_I18N_ROOT = path.join(
  path.resolve(agentsPackageRoot, '..', 'sdkwork-agents-pc-commons'),
  'src',
  'i18n',
);

/** Reads the owner's `common` namespace catalog for a locale. */
function readAgentsCommonCatalog(locale: string): Record<string, string> {
  return JSON.parse(
    readFileSync(
      path.join(AGENTS_COMMONS_I18N_ROOT, locale, 'agents', 'workbench', 'shell.json'),
      'utf8',
    ),
  ) as Record<string, string>;
}

/** Every `route:` segment the owner's console module catalog declares. */
function declaredModuleRoutes(): string[] {
  return [...AGENTS_CONSOLE_MODULES_SOURCE.matchAll(/route:\s*'([^']*)'/gu)].map((match) => match[1]);
}

/** Every `titleKey:` the owner's console module catalog declares. */
function declaredModuleTitleKeys(): string[] {
  return [...AGENTS_CONSOLE_MODULES_SOURCE.matchAll(/titleKey:\s*'([^']+)'/gu)].map(
    (match) => match[1],
  );
}

describe('readAgentsConsoleModuleRoute', () => {
  it('reads the module segment that follows the console base path', () => {
    expect(readAgentsConsoleModuleRoute(AGENTS_CONSOLE_BASE_PATH)).toBeUndefined();
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}/`)).toBeUndefined();
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}/mine`)).toBe('mine');
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}/editor/42`)).toBe('editor');
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}/editor?tab=tools`)).toBe('editor');
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}/editor#policy`)).toBe('editor');
  });

  it('ignores pathnames outside the Agents console prefix', () => {
    expect(readAgentsConsoleModuleRoute('/console')).toBeUndefined();
    expect(readAgentsConsoleModuleRoute('/console/memory')).toBeUndefined();
    expect(readAgentsConsoleModuleRoute(`${AGENTS_CONSOLE_BASE_PATH}-keys`)).toBeUndefined();
  });
});

describe('readAgentsConsoleAgentId', () => {
  it('reads the agent id an editor deep link carries', () => {
    expect(readAgentsConsoleAgentId(`${AGENTS_CONSOLE_BASE_PATH}/editor/42`)).toBe('42');
    // Create and edit share one form, so a bare editor route must read as "no id"
    // rather than as a malformed link.
    expect(readAgentsConsoleAgentId(`${AGENTS_CONSOLE_BASE_PATH}/editor`)).toBeUndefined();
    expect(readAgentsConsoleAgentId(AGENTS_CONSOLE_BASE_PATH)).toBeUndefined();
    expect(readAgentsConsoleAgentId('/console/memory/editor/42')).toBeUndefined();
  });

  it('round-trips an id through path building', () => {
    expect(readAgentsConsoleAgentId(buildAgentsConsolePath('editor', 'agent 42/β'))).toBe('agent 42/β');
  });

  it('keeps a hand-edited escape sequence instead of throwing during a render', () => {
    expect(readAgentsConsoleAgentId(`${AGENTS_CONSOLE_BASE_PATH}/editor/%E0%A4%A`)).toBe('%E0%A4%A');
  });
});

describe('buildAgentsConsolePath', () => {
  it('builds the module and editor routes below the console base path', () => {
    expect(buildAgentsConsolePath('')).toBe(AGENTS_CONSOLE_BASE_PATH);
    expect(buildAgentsConsolePath('mine')).toBe(`${AGENTS_CONSOLE_BASE_PATH}/mine`);
    expect(buildAgentsConsolePath('editor')).toBe(`${AGENTS_CONSOLE_BASE_PATH}/editor`);
    expect(buildAgentsConsolePath('editor', '42')).toBe(`${AGENTS_CONSOLE_BASE_PATH}/editor/42`);
  });

  it('is the inverse of the route readers for every route the owner declares', () => {
    for (const route of declaredModuleRoutes()) {
      const editorId = route === 'editor' ? '42' : undefined;
      const built = buildAgentsConsolePath(route, editorId);
      expect(readAgentsConsoleModuleRoute(built)).toBe(route);
      expect(readAgentsConsoleAgentId(built)).toBe(editorId);
    }
  });
});

describe('owner console entry contract', () => {
  it('publishes the console block through a declared subpath export', () => {
    for (const subpath of ['console', 'console/i18n']) {
      const resolved = requireFromPackage.resolve(`${AGENTS_PACKAGE}/${subpath}`);
      expect(existsSync(resolved), `${AGENTS_PACKAGE}/${subpath} must resolve to a real file`).toBe(true);
    }
  });

  it('keeps every module route a bare URL segment the host can append', () => {
    const routes = declaredModuleRoutes();
    expect(routes.length).toBeGreaterThan(1);
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of routes) {
      // A leading slash, whitespace, a traversal segment, or a reserved character
      // would be spliced into a host URL verbatim by `buildAgentsConsolePath`.
      expect(route, route).toMatch(/^[a-z0-9][a-z0-9-]*$/u);
    }
  });

  it('exposes exactly one agent-editing module for the deep-linked editor', () => {
    const editingRoutes = [
      ...AGENTS_CONSOLE_MODULES_SOURCE.matchAll(/route:\s*'([^']+)'[^}]*editsAgent:\s*true/gu),
    ].map((match) => match[1]);
    // Two editing modules would make `/console/agents/<route>/<agentId>` ambiguous;
    // none would detach the deep link from the module that reads the agent id.
    expect(editingRoutes).toHaveLength(1);
  });

  it('ships every module title in the catalog the portal registers, in both locales', () => {
    const titleKeys = declaredModuleTitleKeys();
    expect(titleKeys.length).toBeGreaterThan(0);
    for (const locale of ['en-US', 'zh-CN']) {
      const catalog = readAgentsCommonCatalog(locale);
      for (const titleKey of titleKeys) {
        // The block renders `t(titleKey, moduleId)`, so a missing catalog entry
        // degrades a tab to a raw key without any type error.
        expect(catalog[titleKey], `${titleKey} missing from the ${locale} catalog`).toBeTruthy();
      }
      expect(catalog.agentsConsoleNavLabel, `nav label missing from ${locale}`).toBeTruthy();
    }
  });
});

describe('console integration wiring', () => {
  it('places the Agents entry directly above Memory in the console sidebar', () => {
    const layoutSource = readPortalFile(
      'packages/sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx',
    );
    const agentsGroupIndex = layoutSource.indexOf("groupBlock('console.menu.group.agents'");
    const memoryGroupIndex = layoutSource.indexOf("groupBlock('console.menu.group.memory'");

    expect(agentsGroupIndex).toBeGreaterThan(-1);
    expect(memoryGroupIndex).toBeGreaterThan(-1);
    expect(agentsGroupIndex).toBeLessThan(memoryGroupIndex);
    expect(layoutSource).toContain(`path: '${AGENTS_CONSOLE_BASE_PATH}'`);
    expect(layoutSource).toContain("labelKey: 'console.menu.agents'");
  });

  it('keeps sidebar navigation and the console route on the shared base path', () => {
    const appSource = readPortalFile('src/App.tsx');

    // Navigation and routing must agree, otherwise the sidebar entry appears
    // active while the route falls through to the console default redirect.
    expect(appSource).toContain("import('@sdkwork/cloudrouter-pc-console-agents')");
    expect(appSource).toContain('path="agents/*"');
    expect(AGENTS_CONSOLE_BASE_PATH).toBe('/console/agents');
  });

  it('declares the adapter as a portal dependency and names it in the verification plan', () => {
    const portalPackage = JSON.parse(readPortalFile('package.json')) as {
      dependencies?: Record<string, string>;
    };
    expect(portalPackage.dependencies?.['@sdkwork/cloudrouter-pc-console-agents']).toBe('workspace:*');

    // The plan enumerates portal test entrypoints and never globs
    // `packages/**/*.test.tsx`, so a package that is not named here is not run.
    expect(readCloudRouterRepositoryFile('scripts/verify-cloud-router-application.mjs')).toContain(
      '@sdkwork/cloudrouter-pc-console-agents',
    );
  });

  it('localizes the console navigation entry in every shipped catalog', () => {
    const coreSource = readPortalFile(
      'packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts',
    );
    // One English plus one Chinese entry each; a single hit means a half-translated menu.
    expect(coreSource.match(/"console\.menu\.agents":/gu) ?? []).toHaveLength(2);
    expect(coreSource.match(/"console\.menu\.group\.agents":/gu) ?? []).toHaveLength(2);
  });

  it('registers the owner workbench catalogs in the portal i18n provider', () => {
    // Without this the block's `common` namespace is empty and every tab renders
    // its raw key, so the registration is part of the integration contract.
    expect(readPortalFile('src/main.tsx')).toMatch(
      /catalogs=\{\[cloudRouterI18nCatalog,\s*\.\.\.agentsWorkbenchI18nCatalogs\s*\]\}/u,
    );
  });

  it('binds every runtime the console renders with', () => {
    const viewSource = readFileSync(path.join(SPEC_FILE_DIR, 'AgentsView.tsx'), 'utf8');
    // The three catalog clients are required by the owner runtime type, so `tsc`
    // catches dropping them; the skills client is optional and would instead
    // degrade the editor's extended-capability panel at runtime.
    for (const factory of [
      'getSdkworkAgentAppSdkClient',
      'getSdkworkAssetsAppSdkClient',
      'getSdkworkDriveAppSdkClient',
      'getSdkworkSkillsAppSdkClient',
    ]) {
      expect(viewSource).toContain(factory);
    }
    expect(viewSource).toContain('configureAgentsConsoleRuntime');
  });
});

describe('deployment capability honesty', () => {
  /** Editor panels this adapter hides, keyed by the app-api assembly that serves them. */
  const PANEL_ASSEMBLY = {
    knowledgebase: 'sdkwork-api-knowledgebase-assembly',
    voice: 'sdkwork-api-voice-assembly',
  } as const;

  it('hides exactly the editor panels this composition does not assemble', () => {
    const composition = readCloudRouterRepositoryFile('generated/composition.resolved.json');
    const viewSource = readFileSync(path.join(SPEC_FILE_DIR, 'AgentsView.tsx'), 'utf8');
    const hiddenMatch = /HIDDEN_AGENT_CAPABILITIES[^=]*=\s*\[([^\]]*)\]/u.exec(viewSource);
    expect(hiddenMatch, 'HIDDEN_AGENT_CAPABILITIES must stay a literal list').toBeTruthy();
    const hidden = [...hiddenMatch![1].matchAll(/'([^']+)'/gu)].map((match) => match[1]);

    for (const [panel, assembly] of Object.entries(PANEL_ASSEMBLY)) {
      if (composition.includes(`"${assembly}"`)) {
        // The direction flips automatically once the assembly lands, so the list
        // cannot silently keep hiding a panel the deployment can now serve.
        expect(hidden, `${panel} is assembled, so it must not be hidden`).not.toContain(panel);
      } else {
        expect(hidden, `${panel} is not assembled, so it must be hidden`).toContain(panel);
      }
    }
  });

  it('serves the agents app-api surface through the dependency assembly contribution', () => {
    // The console is only honest about what it hides if the panels it *does*
    // render are actually served: the agents catalog and/or its assets backing
    // must be present in the same composition the panels are judged against.
    const composition = readCloudRouterRepositoryFile('generated/composition.resolved.json');
    expect(composition).toContain('"sdkwork-api-agents-assembly"');
    expect(composition).toContain('"sdkwork-api-skills-assembly"');
  });
});
