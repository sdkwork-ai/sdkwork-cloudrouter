const app = getApp();

Page({
  data: {
    title: '',
    body: '',
    tags: '',
    submitting: false,
    error: '',
    themeClass: '',
  },

  onLoad(options) {
    this.categoryId = options.id || '';
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
  },

  onTitle(event) {
    this.setData({ title: event.detail.value });
  },

  onBody(event) {
    this.setData({ body: event.detail.value });
  },

  onTags(event) {
    this.setData({ tags: event.detail.value });
  },

  async onSubmit() {
    const api = app.globalData.communityApi;
    const body = String(this.data.body || '').trim();
    if (!api || !this.categoryId || !body || this.data.submitting) return;
    this.setData({ submitting: true, error: '' });
    try {
      const title = String(this.data.title || '').trim() || body.slice(0, 40);
      const tags = String(this.data.tags || '')
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
      const created = await api.createPost(this.categoryId, { title, body, tags });
      wx.showToast({
        title: created && created.reviewState === 'approved' ? '发布成功' : '已提交审核',
        icon: 'success',
      });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (error) {
      this.setData({ error: String(error && error.message ? error.message : error) });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
