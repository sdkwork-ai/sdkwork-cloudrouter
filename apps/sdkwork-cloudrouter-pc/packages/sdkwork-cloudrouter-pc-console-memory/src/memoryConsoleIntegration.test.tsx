import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MemoryConsoleEmbed,
  findMemoryConsoleModuleByRoute,
  memoryConsoleModules,
  type MemoryPcModuleDefinition,
  type MemoryResourceRegistry,
} from '@sdkwork/memory-pc-console-shell';

import {
  MEMORY_CONSOLE_BASE_PATH,
  MEMORY_CONSOLE_LOCALES,
  readMemoryConsoleModuleRoute,
  resolveMemoryConsoleLocale,
} from './memoryConsoleRoute.ts';

afterEach(cleanup);

const KNOWLEDGE_MODULE_ID = 'console-knowledge';

/**
 * The block's client is injected. These tests pass a registry directly, so the
 * client is never asked for transport — it only has to exist as a value.
 */
const stubClient = {} as Parameters<typeof MemoryConsoleEmbed>[0]['client'];

/** Minimal registry so the page has a source to load without touching the SDK. */
const stubRegistry: MemoryResourceRegistry = {
  entities: {
    kind: 'list',
    load: async () => ({ items: [], pageInfo: { mode: 'cursor', hasMore: false } }),
  },
};

/**
 * Absolute path of the directory holding this spec file.
 *
 * Source paths are never assembled with `new URL(relative, import.meta.url)`:
 * Vite's asset plugin statically rewrites that exact pattern into a dev-server
 * URL whenever it manages to resolve the target, and `fileURLToPath` then rejects
 * the `http:` result with `The URL must be of scheme file`. Routing the relative
 * path through a variable keeps the expression intact at runtime.
 */
const SPEC_FILE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Root of this package, i.e. `packages/sdkwork-cloudrouter-pc-console-memory`. */
const PACKAGE_ROOT = path.resolve(SPEC_FILE_DIR, '..');

/** Root of the Cloud Router PC portal application hosting this package. */
const PORTAL_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');

/** Reads a file addressed relative to the hosting portal root. */
function readPortalFile(relativePath: string): string {
  return readFileSync(path.resolve(PORTAL_ROOT, relativePath), 'utf8');
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

const MEMORY_CONSOLE_SHELL = '@sdkwork/memory-pc-console-shell';
const memoryConsoleShellRoot = linkedPackageRoot(MEMORY_CONSOLE_SHELL);

/** sdkwork-memory repository root, derived from its linked PC console shell package. */
const memoryRepositoryRoot = path.resolve(memoryConsoleShellRoot, '..', '..', '..', '..');

/** Reads a file addressed relative to the sdkwork-memory repository root. */
function readMemoryRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(memoryRepositoryRoot, relativePath), 'utf8');
}

/** Reads a file addressed relative to the linked Memory console shell package. */
function readMemoryConsoleShellFile(relativePath: string): string {
  return readFileSync(path.join(memoryConsoleShellRoot, relativePath), 'utf8');
}

function moduleById(moduleId: string): MemoryPcModuleDefinition {
  const module = memoryConsoleModules.find((candidate) => candidate.id === moduleId);
  if (!module) throw new Error(`Memory console module ${moduleId} is missing from the catalog`);
  return module;
}

function moduleTitle(module: MemoryPcModuleDefinition): string {
  return module.messages['zh-CN']?.[module.titleKey] ?? module.titleKey;
}

function moduleSwitcher(): HTMLElement {
  const switcher = document.querySelector<HTMLElement>('.module-nav');
  if (!switcher) throw new Error('The Memory console module switcher did not render');
  return switcher;
}

function selectedTabLabel(): string | null {
  const selected = within(moduleSwitcher())
    .getAllByRole('tab')
    .filter((tab) => tab.getAttribute('aria-selected') === 'true');
  expect(selected).toHaveLength(1);
  return selected[0].textContent;
}

describe('resolveMemoryConsoleLocale', () => {
  it('keeps the locales the Memory console ships catalogs for', () => {
    expect(resolveMemoryConsoleLocale('zh-CN')).toBe('zh-CN');
    expect(resolveMemoryConsoleLocale('en-US')).toBe('en-US');
    expect(resolveMemoryConsoleLocale('ZH-cn')).toBe('zh-CN');
  });

  it('maps a base language onto the matching catalog', () => {
    expect(resolveMemoryConsoleLocale('zh')).toBe('zh-CN');
    expect(resolveMemoryConsoleLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(resolveMemoryConsoleLocale('en-GB')).toBe('en-US');
  });

  it('degrades the portal locales without a Memory catalog to the Memory default', () => {
    for (const locale of ['de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', '', '   ', undefined]) {
      expect(resolveMemoryConsoleLocale(locale)).toBe('en-US');
    }
  });
});

describe('readMemoryConsoleModuleRoute', () => {
  it('reads the module segment that follows the console base path', () => {
    expect(readMemoryConsoleModuleRoute(MEMORY_CONSOLE_BASE_PATH)).toBeUndefined();
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}/`)).toBeUndefined();
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}/retrieval`)).toBe('retrieval');
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}/retrieval/42`)).toBe('retrieval');
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}/retrieval?spaceId=1`)).toBe('retrieval');
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}/retrieval#trace`)).toBe('retrieval');
  });

  it('ignores pathnames outside the Memory console prefix', () => {
    expect(readMemoryConsoleModuleRoute('/console')).toBeUndefined();
    expect(readMemoryConsoleModuleRoute('/console/api-keys')).toBeUndefined();
    expect(readMemoryConsoleModuleRoute(`${MEMORY_CONSOLE_BASE_PATH}-keys`)).toBeUndefined();
  });
});

describe('memory console catalog', () => {
  it('exposes unique module ids and routes on the user-console surface', () => {
    expect(memoryConsoleModules.length).toBeGreaterThan(1);
    expect(new Set(memoryConsoleModules.map((module) => module.id)).size).toBe(memoryConsoleModules.length);
    expect(new Set(memoryConsoleModules.map((module) => module.route)).size).toBe(memoryConsoleModules.length);
    for (const module of memoryConsoleModules) {
      expect(module.surface).toBe('app-console');
      expect(module.permission).toMatch(/^memory\./u);
      expect(module.resources.length).toBeGreaterThan(0);
      expect(moduleTitle(module)).not.toBe(module.titleKey);
    }
  });

  it('resolves the module a console route points at', () => {
    for (const module of memoryConsoleModules) {
      expect(findMemoryConsoleModuleByRoute(module.route)?.id).toBe(module.id);
    }
    expect(findMemoryConsoleModuleByRoute(undefined)).toBeUndefined();
    expect(findMemoryConsoleModuleByRoute('not-a-memory-module')).toBeUndefined();
  });

  it('only gates modules behind permission codes sdkwork-memory declares in its IAM manifest', () => {
    // Cross-repository oracle: the memory app owns its permission catalog, so a
    // typo or a renamed code inside the module definitions is caught here instead
    // of silently denying the module at runtime.
    const manifest = JSON.parse(
      readMemoryRepositoryFile('specs/iam.module.manifest.json'),
    ) as {
      permissions?: { catalog?: { code?: string }[] };
    };
    const declaredCodes = new Set(
      (manifest.permissions?.catalog ?? [])
        .map((entry) => entry.code)
        .filter((code): code is string => typeof code === 'string'),
    );
    expect(declaredCodes.size).toBeGreaterThan(0);

    const undeclared = memoryConsoleModules
      .map((module) => module.permission)
      .filter((permission) => !declaredCodes.has(permission));

    expect(undeclared).toEqual([]);
  });

  it('ships a localized title and description for every module', () => {
    for (const module of memoryConsoleModules) {
      for (const locale of MEMORY_CONSOLE_LOCALES) {
        const catalog = module.messages[locale];
        expect(catalog, `${module.id} is missing the ${locale} catalog`).toBeTruthy();
        expect(catalog?.[module.titleKey], `${module.id} ${locale} title`).toBeTruthy();
        expect(catalog?.[module.descriptionKey], `${module.id} ${locale} description`).toBeTruthy();
      }
    }
  });
});

describe('MemoryConsoleEmbed', () => {
  it('renders one switcher tab per catalog module and marks the host selection', () => {
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        moduleId={KNOWLEDGE_MODULE_ID}
        modules={memoryConsoleModules}
        permissionScope={['memory.app.entities.read']}
        registry={stubRegistry}
      />,
    );

    expect(within(moduleSwitcher()).getAllByRole('tab')).toHaveLength(memoryConsoleModules.length);
    expect(selectedTabLabel()).toBe(moduleTitle(moduleById(KNOWLEDGE_MODULE_ID)));
    expect(document.querySelector('.module-page')).not.toBeNull();
    expect(document.querySelector('.permission-state')).toBeNull();
  });

  it('hands module selection to the host when a change callback is provided', () => {
    const onModuleChange = vi.fn();
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        moduleId={memoryConsoleModules[0].id}
        modules={memoryConsoleModules}
        onModuleChange={onModuleChange}
        permissionScope={['*']}
        registry={stubRegistry}
      />,
    );

    fireEvent.click(within(moduleSwitcher()).getAllByRole('tab')[1]);

    expect(onModuleChange).toHaveBeenCalledTimes(1);
    expect(onModuleChange).toHaveBeenCalledWith(memoryConsoleModules[1].id);
    // Controlled mode must not move the selection by itself; the host owns routing.
    expect(selectedTabLabel()).toBe(moduleTitle(memoryConsoleModules[0]));
  });

  it('owns module selection locally when the host provides no callback', async () => {
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        modules={memoryConsoleModules}
        permissionScope={['*']}
        registry={stubRegistry}
      />,
    );

    expect(selectedTabLabel()).toBe(moduleTitle(memoryConsoleModules[0]));
    fireEvent.click(within(moduleSwitcher()).getAllByRole('tab')[1]);
    await waitFor(() => {
      expect(selectedTabLabel()).toBe(moduleTitle(memoryConsoleModules[1]));
    });
  });

  it('denies a module the session scope does not grant', () => {
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        moduleId={KNOWLEDGE_MODULE_ID}
        modules={memoryConsoleModules}
        permissionScope={['memory.spaces.read']}
        registry={stubRegistry}
      />,
    );

    const permissionState = document.querySelector<HTMLElement>('.permission-state');
    expect(permissionState).not.toBeNull();
    expect(document.querySelector('.module-page')).toBeNull();
    // The denied module is named on the state panel, and the switcher tab carries
    // the same label, so the lookup has to be scoped to the panel.
    expect(within(permissionState as HTMLElement).getByRole('heading').textContent).toBe(
      moduleTitle(moduleById(KNOWLEDGE_MODULE_ID)),
    );
  });

  it('honours a prefix-wildcard permission grant', () => {
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        moduleId={KNOWLEDGE_MODULE_ID}
        modules={memoryConsoleModules}
        permissionScope={['memory.app.*']}
        registry={stubRegistry}
      />,
    );

    expect(document.querySelector('.module-page')).not.toBeNull();
  });

  it('reports an empty data source instead of failing when a resource has no binding', () => {
    render(
      <MemoryConsoleEmbed
        client={stubClient}
        locale="zh-CN"
        modules={[moduleById(KNOWLEDGE_MODULE_ID)]}
        permissionScope={['*']}
        registry={{}}
      />,
    );

    // A single-module catalog renders no switcher, so the page is the whole block.
    expect(document.querySelector('.module-nav')).toBeNull();
    expect(document.querySelector('.module-page')).not.toBeNull();
    expect(document.querySelector('.status-state')).not.toBeNull();
  });
});

describe('console integration wiring', () => {
  it('keeps sidebar navigation and the console route on the shared base path', () => {
    const layoutSource = readPortalFile(
      'packages/sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx',
    );
    const appSource = readPortalFile('src/App.tsx');

    // Navigation and routing must agree, otherwise the sidebar entry appears
    // active while the route falls through to the console default redirect.
    expect(layoutSource).toContain(`path: '${MEMORY_CONSOLE_BASE_PATH}'`);
    expect(layoutSource).toContain("labelKey: 'console.menu.memory'");
    expect(appSource).toContain("import('@sdkwork/cloudrouter-pc-console-memory')");
    expect(appSource).toContain('path="memory/*"');
    expect(MEMORY_CONSOLE_BASE_PATH).toBe('/console/memory');
  });

  it('ships the Memory console stylesheet with the block', () => {
    // The host imports one package; the block carries its own presentation rules.
    const embedSource = readMemoryConsoleShellFile('src/MemoryConsoleEmbed.tsx');

    expect(embedSource).toContain('import "@sdkwork/memory-pc-commons/styles.css";');
  });

  it('localizes the console navigation entry in every shipped catalog', () => {
    const coreSource = readPortalFile(
      'packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts',
    );
    const occurrences = coreSource.match(/"console\.menu\.memory":/gu) ?? [];
    const groupOccurrences = coreSource.match(/"console\.menu\.group\.memory":/gu) ?? [];

    // One English plus one Chinese entry each; a single hit means a half-translated menu.
    expect(occurrences).toHaveLength(2);
    expect(groupOccurrences).toHaveLength(2);
  });
});
