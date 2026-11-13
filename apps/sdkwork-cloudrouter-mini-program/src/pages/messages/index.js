Page({
  data: {
    autoOpened: false,
    themeClass: '',
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
    // The H5 surface renders its own five-tab shell, so opening it keeps the
    // full H5 messages experience while the native tab is the entry point.
    if (this.data.autoOpened) {
      this.setData({ autoOpened: false });
      return;
    }
    this.setData({ autoOpened: true });
    wx.navigateTo({ url: '/pages/h5/index?route=messages' });
  },

  onOpen() {
    wx.navigateTo({ url: '/pages/h5/index?route=messages' });
  },
});
