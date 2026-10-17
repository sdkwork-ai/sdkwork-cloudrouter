const { createConsoleApiKeysPage } = require('@sdkwork/cloudrouter-mp-console-api-keys');

const app = getApp();

Page({
  data: {
    loading: true,
    error: null,
    rows: [],
    createdSecret: null,
    draftName: '',
    submitting: false,
    labels: {},
  },

  controller: null,

  onLoad() {
    const runtime = app.globalData;
    if (!runtime.ready) {
      this.setData({ loading: false, error: 'CloudRouter runtime is not ready.' });
      return;
    }
    this.controller = createConsoleApiKeysPage(
      runtime.consolePorts,
      this.resolveLabels(runtime.translate),
      runtime.locale,
    );
    this.onReload();
  },

  resolveLabels(translate) {
    return {
      title: translate('cloudrouter.console.apiKeys.title'),
      namePlaceholder: translate('cloudrouter.console.apiKeys.namePlaceholder'),
      create: translate('cloudrouter.console.apiKeys.create'),
      creating: translate('cloudrouter.console.apiKeys.creating'),
      revoke: translate('cloudrouter.console.apiKeys.revoke'),
      statusActive: translate('cloudrouter.console.apiKeys.statusActive'),
      statusDisabled: translate('cloudrouter.console.apiKeys.statusDisabled'),
      statusRevoked: translate('cloudrouter.console.apiKeys.statusRevoked'),
      createdOnce: translate('cloudrouter.console.apiKeys.createdOnce'),
      loading: translate('cloudrouter.console.shared.loading'),
      empty: translate('cloudrouter.console.apiKeys.empty'),
      reload: translate('cloudrouter.console.shared.reload'),
    };
  },

  syncState() {
    const state = this.controller.state;
    this.setData({
      loading: state.loading,
      error: state.error,
      rows: state.displayRows,
      createdSecret: state.createdSecret,
    });
  },

  onDraftName(event) {
    this.setData({ draftName: event.detail.value });
  },

  async onReload() {
    if (!this.controller) {
      return;
    }
    await this.controller.load();
    this.syncState();
  },

  async onCreate() {
    if (!this.controller || this.data.submitting) {
      return;
    }
    const name = this.data.draftName.trim();
    if (!name) {
      return;
    }
    this.setData({ submitting: true });
    try {
      await this.controller.create(name);
      this.setData({ draftName: '' });
    } finally {
      this.setData({ submitting: false });
    }
    this.syncState();
  },

  async onRevoke(event) {
    if (!this.controller) {
      return;
    }
    const apiKeyId = event.currentTarget.dataset.id;
    if (!apiKeyId) {
      return;
    }
    await this.controller.revoke(apiKeyId);
    this.syncState();
  },

  onPullDownRefresh() {
    this.onReload().then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh(),
    );
  },
});
