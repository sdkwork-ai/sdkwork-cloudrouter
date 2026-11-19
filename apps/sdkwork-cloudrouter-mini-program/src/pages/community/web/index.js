const app = getApp();

Page({
  data: {
    src: '',
  },

  onLoad(options) {
    const base = (app.globalData.webPublicHttpUrl || '').replace(/\/+$/, '');
    const path = decodeURIComponent(options.path || '/community');
    if (!base) return;
    wx.setNavigationBarTitle({ title: '圈子社群' });
    this.setData({ src: `${base}${path.startsWith('/') ? path : `/${path}`}` });
  },
});
