/**
 * Package-local locale fragments.
 *
 * Authority: `I18N_SPEC.md` section 6.1 — split by locale, domain, capability,
 * and screen fragment. Platform monolithic resources are assembled from these
 * fragments and must not be hand-authored as a whole-root catalog.
 */
export const consoleCatalogMessagesEnUs: Record<string, string> = {
  'cloudrouter.console.catalog.title': 'catalog',
  'cloudrouter.console.catalog.summary': '',
  'cloudrouter.console.catalog.empty': 'No data yet',
  'cloudrouter.console.catalog.modelsLoaded': 'Models loaded',
  'cloudrouter.console.catalog.loadFailed': 'Failed to load the model catalog',
  'cloudrouter.console.catalog.unpriced': 'Price unavailable',
};

export const consoleCatalogMessagesZhCn: Record<string, string> = {
  'cloudrouter.console.catalog.title': '模型目录',
  'cloudrouter.console.catalog.summary': '',
  'cloudrouter.console.catalog.empty': '暂无数据',
  'cloudrouter.console.catalog.modelsLoaded': '已加载模型',
  'cloudrouter.console.catalog.loadFailed': '模型目录加载失败',
  'cloudrouter.console.catalog.unpriced': '暂无价格',
};
