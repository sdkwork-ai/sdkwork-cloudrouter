const { createConsoleDashboardPage } = require('@sdkwork/cloudrouter-mp-console-dashboard');

const app = getApp();

Page({
  data: {
    loading: true,
    error: null,
    metrics: [],
    windowLabel: null,
    labels: {},
  },

  controller: null,

  onLoad() {
    const runtime = app.globalData;
    if (!runtime.ready) {
      this.setData({ loading: false, error: 'CloudRouter runtime is not ready.' });
      return;
    }
    this.controller = createConsoleDashboardPage(
      runtime.consolePorts,
      this.resolveLabels(runtime.translate),
      runtime.locale,
    );
    this.onReload();
  },

  resolveLabels(translate) {
    return {
      title: translate('cloudrouter.console.dashboard.title'),
      requests: translate('cloudrouter.console.dashboard.requests'),
      tokens: translate('cloudrouter.console.dashboard.tokens'),
      cost: translate('cloudrouter.console.dashboard.cost'),
      errorRate: translate('cloudrouter.console.dashboard.errorRate'),
      loading: translate('cloudrouter.console.shared.loading'),
      empty: translate('cloudrouter.console.shared.empty'),
      reload: translate('cloudrouter.console.shared.reload'),
    };
  },

  syncState() {
    const state = this.controller.state;
    this.setData({
      loading: state.loading,
      error: state.error,
      metrics: state.metrics,
      windowLabel: state.windowLabel,
    });
  },

  async onReload() {
    if (!this.controller) {
      return;
    }
    await this.controller.load();
    this.syncState();
  },

  onPullDownRefresh() {
    this.onReload().then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh(),
    );
  },
});
