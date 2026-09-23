import type { MemoryLocale } from '@sdkwork/memory-pc-console-shell';

/**
 * Console route prefix owned by this integration package.
 *
 * The host route is registered as `memory/*`, so module routes such as
 * `/console/memory/retrieval` stay deep-linkable while every pixel of the
 * Memory console is still rendered by sdkwork-memory.
 */
export const MEMORY_CONSOLE_BASE_PATH = '/console/memory';

/**
 * Locales the Memory console ships message catalogs for
 * (`memory-pc-commons` plus the `memory-pc-console-*` capability packages).
 *
 * The Cloud Router portal supports seven locales, so the remaining ones degrade
 * to {@link MEMORY_CONSOLE_LOCALE_FALLBACK} instead of rendering raw keys.
 */
export const MEMORY_CONSOLE_LOCALES: readonly MemoryLocale[] = ['en-US', 'zh-CN'];

export const MEMORY_CONSOLE_LOCALE_FALLBACK: MemoryLocale = 'en-US';

/**
 * Resolves the runtime locale to a Memory console locale.
 *
 * Exact matches win; otherwise the base language is matched (`zh-Hans-CN` ->
 * `zh-CN`); otherwise the Memory default locale is used.
 */
export function resolveMemoryConsoleLocale(locale: string | undefined): MemoryLocale {
  const normalized = locale?.trim().toLowerCase() ?? '';
  if (!normalized) return MEMORY_CONSOLE_LOCALE_FALLBACK;

  const exact = MEMORY_CONSOLE_LOCALES.find((candidate) => candidate.toLowerCase() === normalized);
  if (exact) return exact;

  const language = normalized.split(/[-_]/u)[0];
  if (!language) return MEMORY_CONSOLE_LOCALE_FALLBACK;
  return (
    MEMORY_CONSOLE_LOCALES.find((candidate) => candidate.toLowerCase().startsWith(`${language}-`))
    ?? MEMORY_CONSOLE_LOCALE_FALLBACK
  );
}

/**
 * Reads the Memory module route segment out of the console pathname
 * (`/console/memory/retrieval/something` -> `retrieval`).
 *
 * Returns `undefined` for the bare console root or for any pathname outside the
 * Memory console prefix, which makes the block fall back to its first module.
 */
export function readMemoryConsoleModuleRoute(pathname: string): string | undefined {
  if (pathname !== MEMORY_CONSOLE_BASE_PATH && !pathname.startsWith(`${MEMORY_CONSOLE_BASE_PATH}/`)) {
    return undefined;
  }
  const [pathOnly] = pathname.split(/[?#]/u);
  const [segment] = pathOnly
    .slice(MEMORY_CONSOLE_BASE_PATH.length)
    .split('/')
    .filter(Boolean);
  return segment;
}
