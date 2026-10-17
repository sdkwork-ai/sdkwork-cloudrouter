const { createConsoleUsagePage } = require('@sdkwork/cloudrouter-mp-console-usage');

const app = getApp();

Page({
  data: {
    loading: true,
    loadingMore: false,
    error: null,
    rows: [],
    hasMore: false,
    labels: {},
  },

  controller: null,

  onLoad() {
    const runtime = app.globalData;
    if (!runtime.ready) {
      this.setData({ loading: false, error: 'CloudRouter runtime is not ready.' });
      return;
    }
    this.controller = createConsoleUsagePage(
      runtime.consolePorts,
      this.resolveLabels(runtime.translate),
      runtime.locale,
    );
    this.onReload();
  },

  resolveLabels(translate) {
    return {
      title: translate('cloudrouter.console.usage.title'),
      columnModel: translate('cloudrouter.console.usage.columnModel'),
      columnTokens: translate('cloudrouter.console.usage.columnTokens'),
      columnCost: translate('cloudrouter.console.usage.columnCost'),
      columnStatus: translate('cloudrouter.console.usage.columnStatus'),
      columnTime: translate('cloudrouter.console.usage.columnTime'),
      statusSucceeded: translate('cloudrouter.console.usage.statusSucceeded'),
      statusFailed: translate('cloudrouter.console.usage.statusFailed'),
      statusProcessing: translate('cloudrouter.console.usage.statusProcessing'),
      statusUnknown: translate('cloudrouter.console.usage.statusUnknown'),
      loading: translate('cloudrouter.console.shared.loading'),
      empty: translate('cloudrouter.console.shared.empty'),
      reload: translate('cloudrouter.console.shared.reload'),
      loadMore: translate('cloudrouter.console.shared.loadMore'),
    };
  },

  syncState() {
    const state = this.controller.state;
    this.setData({
      loading: state.loading,
      loadingMore: state.loadingMore,
      error: state.error,
      rows: state.displayRows,
      hasMore: state.hasMore,
    });
  },

  async onReload() {
    if (!this.controller) {
      return;
    }
    await this.controller.load();
    this.syncState();
  },

  async onLoadMore() {
    if (!this.controller || this.data.loadingMore || !this.data.hasMore) {
      return;
    }
    await this.controller.loadMore();
    this.syncState();
  },

  onPullDownRefresh() {
    this.onReload().then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh(),
    );
  },

  onReachBottom() {
    this.onLoadMore();
  },
});
