import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchRoutes } from 'react-router-dom';
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

/**
 * The create/edit flow is a full-bleed route, which makes *route ranking* part of
 * the contract: the console branch reaches the agent list through an `agents/*`
 * splat, and that splat also matches the editor path. Both halves are pinned
 * below — that `App.tsx` declares the flow outside the console branch, and that
 * React Router really resolves it there instead of into the shell.
 */
describe('create/edit flow route composition', () => {
  /** The one module route the owner marks as the agent editor. */
  function ownerEditorModuleRoute(): string {
    const match = /route:\s*'([^']+)'[^}]*editsAgent:\s*true/u.exec(AGENTS_CONSOLE_MODULES_SOURCE);
    if (!match) throw new Error('the owner console module catalog declares no agent-editing route');
    return match[1];
  }

  /** The flow path this host must mount, derived from the owner's route segment. */
  const EDITOR_PATH = `${AGENTS_CONSOLE_BASE_PATH}/${ownerEditorModuleRoute()}/:agentId?`;

  it('declares the flow on its own route above the console branch', () => {
    const appSource = readPortalFile('src/App.tsx');
    const flowRouteIndex = appSource.indexOf(`path="${EDITOR_PATH}"`);
    const consoleBranchIndex = appSource.indexOf('path="/console" element=');

    // Declared above the console branch so a reviewer reads the two paths
    // together; React Router ranks them, so order alone does not route it.
    expect(flowRouteIndex).toBeGreaterThan(-1);
    expect(consoleBranchIndex).toBeGreaterThan(-1);
    expect(flowRouteIndex).toBeLessThan(consoleBranchIndex);
    // Lazy-route rule: the flow is reached through the same dynamic import.
    expect(appSource).toContain("'AgentsEditorPage'");
  });

  it('resolves the flow path outside the console shell while the list stays inside it', () => {
    // Mirrors the shape `App.tsx` declares: a static flow path beside a console
    // branch whose agent list is reached through a splat.
    const routes = [
      { id: 'agents-editor', path: EDITOR_PATH },
      {
        id: 'console-shell',
        path: '/console',
        children: [{ id: 'console-agents', path: 'agents/*' }],
      },
    ];

    // The deepest match is the page that actually renders; `matchRoutes` returns
    // the whole branch root-first, so a nested route's parent is not the answer.
    const leafRouteId = (pathname: string) => matchRoutes(routes, pathname)?.at(-1)?.route.id;

    for (const pathname of [
      `${AGENTS_CONSOLE_BASE_PATH}/${ownerEditorModuleRoute()}`,
      `${AGENTS_CONSOLE_BASE_PATH}/${ownerEditorModuleRoute()}/42`,
    ]) {
      expect(leafRouteId(pathname), pathname).toBe('agents-editor');
    }

    // The list — and every module the owner adds later — must keep resolving
    // inside the shell, which is the whole point of the splat.
    expect(leafRouteId(AGENTS_CONSOLE_BASE_PATH)).toBe('console-agents');
    expect(leafRouteId(`${AGENTS_CONSOLE_BASE_PATH}/mine`)).toBe('console-agents');
  });

  it('renders the flow as a viewport-height frame with no chrome of its own', () => {
    const source = readFileSync(path.join(SPEC_FILE_DIR, 'AgentsEditorPage.tsx'), 'utf8');

    expect(source).toContain('h-[100dvh]');
    expect(source).toContain('<AgentsView />');
    // A header or a switcher of its own would compete with the form's header.
    expect(source).not.toMatch(/<nav|Navbar|agents-console-nav/u);
  });

  it('keeps the owner module switcher free of flow modules', () => {
    // Cross-repository behaviour, and this side has no render test by design
    // (see vitest.config.ts), so the rule is read off the source it lives in.
    const embedSource = readFileSync(
      path.join(agentsPackageRoot, 'src', 'console', 'AgentsConsoleEmbed.tsx'),
      'utf8',
    );

    expect(embedSource).toMatch(/modules\.filter\(\(candidate\) => !candidate\.editsAgent\)/u);
    expect(embedSource).toContain('switcherModules.map');
    expect(embedSource).toMatch(/!activeModule\?\.editsAgent && switcherModules\.length > 1/u);
  });

  it('gives the module content area a flex parent so a flex-1 module root fills it', () => {
    // The two owned modules fill their content area differently — the manager page
    // with `h-full` and the editor with `flex-1` — so the content area has to be a
    // flex container, or the editor's `flex-1` is inert and the root collapses to
    // content height. That is not cosmetic: measured in Chrome, a 1440px viewport
    // left a 390px empty band above the page background, and a viewport shorter than
    // the form clipped its bottom because the host frame clips.
    const embedSource = readFileSync(
      path.join(agentsPackageRoot, 'src', 'console', 'AgentsConsoleEmbed.tsx'),
      'utf8',
    );

    const contentArea = /<div\s+className="([^"]*)"[^>]*>\s*\{\s*activeModule\.editsAgent \?/u.exec(
      embedSource,
    );
    expect(
      contentArea,
      'the content area must stay the div that wraps the module switch',
    ).toBeTruthy();

    const tokens = contentArea![1].split(/\s+/u);
    expect(tokens, 'must be a flex item that takes the space under the nav').toContain('flex-1');
    expect(tokens, 'must not let content push it past the given height').toContain('min-h-0');
    expect(tokens, 'must be a flex container so `flex-1` roots stretch').toContain('flex');
    expect(tokens, 'column, matching the editor root that fills it').toContain('flex-col');
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
