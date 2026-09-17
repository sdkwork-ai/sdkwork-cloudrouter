/**
 * Package-local locale fragments.
 *
 * Authority: `I18N_SPEC.md` section 6.1 — split by locale, domain, capability,
 * and screen fragment. Platform monolithic resources are assembled from these
 * fragments and must not be hand-authored as a whole-root catalog.
 */
export const consoleApiKeysMessagesEnUs: Record<string, string> = {
  'cloudrouter.console.apiKeys.title': 'api keys',
  'cloudrouter.console.apiKeys.summary': '',
  'cloudrouter.console.apiKeys.empty': 'No data yet',
  'cloudrouter.console.apiKeys.keysLoaded': 'Keys loaded',
  'cloudrouter.console.apiKeys.loadFailed': 'Failed to load API keys',
  'cloudrouter.console.apiKeys.createdNotice': 'Copy the new secret now; it is shown once.',
};

export const consoleApiKeysMessagesZhCn: Record<string, string> = {
  'cloudrouter.console.apiKeys.title': 'API 密钥',
  'cloudrouter.console.apiKeys.summary': '',
  'cloudrouter.console.apiKeys.empty': '暂无数据',
  'cloudrouter.console.apiKeys.keysLoaded': '已加载密钥',
  'cloudrouter.console.apiKeys.loadFailed': 'API 密钥加载失败',
  'cloudrouter.console.apiKeys.createdNotice': '请立即复制新密钥，它只显示一次。',
};
