const app = getApp();

Page({
  data: {
    loading: true,
    error: '',
    circles: [],
    visible: [],
    query: '',
    scope: 'discover',
    themeClass: '',
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
  },

  onLoad() {
    this.load();
  },

  async load() {
    const api = app.globalData.communityApi;
    if (!api) {
      this.setData({ loading: false, error: app.globalData.error || '社区服务未就绪' });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const circles = (await api.listCircles()).map((circle) => ({
        ...circle,
        initial: circle.name ? circle.name.slice(0, 1) : '圈',
      }));
      this.setData({ circles, loading: false });
      this.applyFilter();
    } catch (error) {
      this.setData({ loading: false, error: String(error && error.message ? error.message : error) });
    }
  },

  applyFilter() {
    const { circles, query, scope } = this.data;
    const keyword = String(query || '').trim().toLowerCase();
    const visible = circles.filter((circle) => {
      if (scope === 'mine' && !circle.isJoined) return false;
      if (!keyword) return true;
      return (
        String(circle.name || '').toLowerCase().includes(keyword) ||
        String(circle.description || '').toLowerCase().includes(keyword)
      );
    });
    this.setData({ visible });
  },

  onSearch(event) {
    this.setData({ query: event.detail.value });
    this.applyFilter();
  },

  onScope(event) {
    this.setData({ scope: event.currentTarget.dataset.scope });
    this.applyFilter();
  },

  onOpen(event) {
    wx.navigateTo({ url: `/pages/community/detail/index?id=${event.currentTarget.dataset.id}` });
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/community/create/index' });
  },

  onOpenFull() {
    wx.navigateTo({ url: '/pages/h5/index?route=community' });
  },

  async onJoin(event) {
    const api = app.globalData.communityApi;
    const id = event.currentTarget.dataset.id;
    if (!api || !id) return;
    try {
      await api.joinCircle(id);
      wx.showToast({ title: '已加入', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
});
