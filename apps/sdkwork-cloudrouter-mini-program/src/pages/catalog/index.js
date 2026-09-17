const { createConsoleCatalogPage } = require('@sdkwork/cloudrouter-mp-console-catalog');

const app = getApp();

Page({
  data: {
    loading: true,
    error: null,
    rows: [],
    labels: {},
    primaryField: 'label',
    secondaryField: 'value',
  },

  controller: null,

  onLoad() {
    const runtime = app.globalData;
    if (!runtime.ready) {
      this.setData({ loading: false, error: 'CloudRouter runtime is not ready.' });
      return;
    }
    this.controller = createConsoleCatalogPage(runtime.consolePorts, this.resolveLabels(runtime.translate));
    this.onReload();
  },

  resolveLabels(translate) {
    return {
      title: translate('cloudrouter.console.catalog.title'),
      loading: translate('cloudrouter.console.shared.loading'),
      empty: translate('cloudrouter.console.shared.empty'),
      reload: translate('cloudrouter.console.shared.reload'),
    };
  },

  async onReload() {
    await this.controller.load();
    this.setData({ loading: false, rows: [] });
  },

  onPullDownRefresh() {
    this.onReload().then(() => wx.stopPullDownRefresh());
  },
});
