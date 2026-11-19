const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    tags: '',
    isPaid: false,
    price: '',
    submitting: false,
    error: '',
    themeClass: '',
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
  },

  onTitle(event) {
    this.setData({ title: event.detail.value });
  },

  onDescription(event) {
    this.setData({ description: event.detail.value });
  },

  onTags(event) {
    this.setData({ tags: event.detail.value });
  },

  onPrice(event) {
    this.setData({ price: event.detail.value });
  },

  onPaid(event) {
    this.setData({ isPaid: event.detail.value });
  },

  async onSubmit() {
    const api = app.globalData.communityApi;
    const title = String(this.data.title || '').trim();
    if (!api || !title || this.data.submitting) return;
    this.setData({ submitting: true, error: '' });
    try {
      const tags = String(this.data.tags || '')
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
      const created = await api.createCircle({
        title,
        description: String(this.data.description || '').trim(),
        isPaid: Boolean(this.data.isPaid),
        price: this.data.isPaid ? Number(this.data.price) || 0 : undefined,
        tags,
        tabs: ['feeds', 'resources', 'groups'],
      });
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/community/detail/index?id=${created.id}` });
      }, 400);
    } catch (error) {
      this.setData({ error: String(error && error.message ? error.message : error) });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
