/**
 * Package-local locale fragments.
 *
 * Authority: `I18N_SPEC.md` section 6.1 — split by locale, domain, capability,
 * and screen fragment. Platform monolithic resources are assembled from these
 * fragments and must not be hand-authored as a whole-root catalog.
 */
export const consoleUsageMessagesEnUs: Record<string, string> = {
  'cloudrouter.console.usage.title': 'usage',
  'cloudrouter.console.usage.summary': '',
  'cloudrouter.console.usage.empty': 'No data yet',
  'cloudrouter.console.usage.rowsLoaded': 'Rows loaded',
  'cloudrouter.console.usage.loadFailed': 'Failed to load usage records',
};

export const consoleUsageMessagesZhCn: Record<string, string> = {
  'cloudrouter.console.usage.title': '用量记录',
  'cloudrouter.console.usage.summary': '',
  'cloudrouter.console.usage.empty': '暂无数据',
  'cloudrouter.console.usage.rowsLoaded': '已加载记录',
  'cloudrouter.console.usage.loadFailed': '用量记录加载失败',
};
