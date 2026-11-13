const app = getApp();

Page({
  data: {
    displayName: '未登录',
    subtitle: '登录后查看账户与余额',
    themeClass: '',
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
  },

  onOpenSettings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },

  onOpenSignIn() {
    wx.navigateTo({ url: '/pages/h5/index?route=signIn' });
  },

  onOpenRecharge() {
    wx.navigateTo({ url: '/pages/h5/index?route=recharge' });
  },

  onOpenAutoRecharge() {
    wx.navigateTo({ url: '/pages/h5/index?route=recharge' });
  },

  onOpenRecords() {
    wx.showModal({
      title: '操作记录',
      content: '暂无操作记录。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onOpenOther() {
    wx.showModal({
      title: '其他',
      content: 'CloudRouter · 统一模型路由与 AI 算力平台',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onOpenHelp() {
    wx.showModal({
      title: '帮助中心',
      content: '如需帮助，请联系 SDKWork 支持。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onOpenPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '隐私政策以运营方站点配置为准。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  onOpenAbout() {
    const runtime = app.globalData;
    wx.showModal({
      title: '关于 CloudRouter',
      content: `统一模型路由与 AI 算力平台\n版本 ${runtime.profileId || '0.1.0'}`,
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
