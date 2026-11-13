const app = getApp();

Page({
  data: {
    activeSection: null,
    activeSectionId: '',
    dirtyCount: 0,
    navigation: [],
    query: '',
    readOnly: true,
    savebarVisible: false,
    status: 'idle',
    view: 'list',
    themeClass: '',
  },

  binding: null,

  onShow() {
    this.applyTheme();
  },

  applyTheme() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
  },

  onLoad() {
    const binding = app.globalData.settingsBinding;
    if (!binding) {
      this.setData({ status: 'error' });
      return;
    }
    this.binding = binding;
    binding.attach((data) => this.setData(data));
  },

  onUnload() {
    this.binding?.detach();
    this.binding = null;
  },

  onBack() {
    if (this.data.view === 'list') {
      wx.navigateBack();
      return;
    }
    this.binding?.onBack();
  },

  onSelectSection(event) {
    this.binding?.onSelectSection(event.currentTarget.dataset.sectionId);
  },

  onToggle(event) {
    this.binding?.onToggle(event.currentTarget.dataset.settingId, event.detail.value);
  },

  onChoice(event) {
    this.binding?.onChoice(event.currentTarget.dataset.settingId, event.detail.value);
    this.applyTheme();
  },

  onInput(event) {
    this.binding?.onInput(event.currentTarget.dataset.settingId, event.detail.value);
  },

  onSearch(event) {
    this.binding?.onSearch(event.detail.value);
  },

  onSave() {
    const pending = this.binding?.onSave();
    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      });
    }
  },

  onDiscard() {
    this.binding?.onDiscard();
  },

  onAction(event) {
    const settingId = event.currentTarget.dataset.settingId;
    if (settingId === 'about.terms') {
      wx.showModal({ title: '服务条款', content: '服务条款以运营方站点配置为准。', showCancel: false });
      return;
    }
    if (settingId === 'about.privacy') {
      wx.showModal({ title: '隐私政策', content: '隐私政策以运营方站点配置为准。', showCancel: false });
    }
  },
});
