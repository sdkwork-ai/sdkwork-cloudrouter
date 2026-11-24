import type { ReactNode } from 'react';

/**
 * Cross-bundle seam for the API-key table's "导入到" hover menu.
 *
 * The menu is owned by this console package, but the sixteen tool rows and
 * their import flows live in a separate client plugin
 * (`@deepseek-ai/dsh-client-ui-sdkwork-import-to`) that ships with the
 * BirdCoder shell. Client plugins are bundled independently, so their module
 * state is not shared with this package; the extension is published on
 * `globalThis` under a namespaced symbol and read here on every render.
 *
 * With no extension registered the menu keeps its built-in three rows, so a
 * deployment without the plugin behaves exactly as before.
 */
export interface QuickImportExtensionTarget {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
}

/** Endpoints of the gateway the console is talking to, absolute. */
export interface QuickImportExtensionEndpoints {
  readonly anthropicBaseUrl: string;
  readonly openAiBaseUrl: string;
  readonly geminiBaseUrl: string;
}

/** The key being imported. */
export interface QuickImportExtensionKey {
  readonly id: string;
  readonly displayName: string;
  readonly maskedKey: string;
  readonly rawKey: string;
}

/** One menu click, described by everything the plugin needs. */
export interface QuickImportExtensionSelection {
  readonly targetId: string;
  readonly key: QuickImportExtensionKey;
  readonly endpoints: QuickImportExtensionEndpoints;
  readonly homepage?: string;
}

/** The extension the plugin registers. */
export interface QuickImportExtension {
  readonly targets: readonly QuickImportExtensionTarget[];
  readonly onSelect: (selection: QuickImportExtensionSelection) => void;
}

const REGISTRY_KEY = Symbol.for('sdkwork.cloudrouter.quick-import-extension');

function isQuickImportExtension(value: unknown): value is QuickImportExtension {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'targets' in value
    && Array.isArray(value.targets)
    && 'onSelect' in value
    && typeof value.onSelect === 'function'
  );
}

/**
 * The extension the shell plugin registered, if any.
 *
 * Read on each call rather than cached: the plugin bundle may finish loading
 * after this package's first render.
 */
export function getQuickImportExtension(): QuickImportExtension | null {
  const value: unknown = Reflect.get(globalThis, REGISTRY_KEY);
  return isQuickImportExtension(value) ? value : null;
}

/**
 * Publish (or clear) the menu extension.
 *
 * Exported so the plugin's tests can drive the console without a browser
 * shell; production registration goes through the plugin's own installer.
 */
export function configureQuickImportExtension(next: QuickImportExtension | null): void {
  Reflect.set(globalThis, REGISTRY_KEY, next);
}
