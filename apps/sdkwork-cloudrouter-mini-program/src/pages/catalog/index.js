const { createConsoleCatalogPage } = require('@sdkwork/cloudrouter-mp-console-catalog');

const app = getApp();

Page({
  data: {
    loading: true,
    error: null,
    rows: [],
    labels: {},
  },

  controller: null,

  onLoad() {
    const runtime = app.globalData;
    if (!runtime.ready) {
      this.setData({ loading: false, error: 'CloudRouter runtime is not ready.' });
      return;
    }
    this.controller = createConsoleCatalogPage(
      runtime.consolePorts,
      this.resolveLabels(runtime.translate),
      runtime.locale,
    );
    this.onReload();
  },

  resolveLabels(translate) {
    return {
      title: translate('cloudrouter.console.catalog.title'),
      columnVendor: translate('cloudrouter.console.catalog.columnVendor'),
      columnModel: translate('cloudrouter.console.catalog.columnModel'),
      columnInput: translate('cloudrouter.console.catalog.columnInput'),
      columnOutput: translate('cloudrouter.console.catalog.columnOutput'),
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
      rows: state.displayRows,
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
