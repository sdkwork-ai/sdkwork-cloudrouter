/**
 * Package-local locale fragments.
 *
 * Authority: `I18N_SPEC.md` section 6.1 — split by locale, domain, capability,
 * and screen fragment. Platform monolithic resources are assembled from these
 * fragments and must not be hand-authored as a whole-root catalog.
 */
export const consoleDashboardMessagesEnUs: Record<string, string> = {
  'cloudrouter.console.dashboard.title': 'dashboard',
  'cloudrouter.console.dashboard.summary': '',
  'cloudrouter.console.dashboard.empty': 'No data yet',
  'cloudrouter.console.dashboard.totalRequests': 'Total requests',
  'cloudrouter.console.dashboard.loadFailed': 'Failed to load the console overview',
};

export const consoleDashboardMessagesZhCn: Record<string, string> = {
  'cloudrouter.console.dashboard.title': '控制台概览',
  'cloudrouter.console.dashboard.summary': '',
  'cloudrouter.console.dashboard.empty': '暂无数据',
  'cloudrouter.console.dashboard.totalRequests': '总请求数',
  'cloudrouter.console.dashboard.loadFailed': '控制台概览加载失败',
};
