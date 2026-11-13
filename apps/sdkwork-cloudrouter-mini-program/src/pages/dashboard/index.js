const app = getApp();

const PRIMARY_ACTIONS = [
  { action: 'membership', icon: '💎', label: '会员中心', background: '#fef3c7', color: '#d97706' },
  { action: 'recharge', icon: '⚡', label: '快速充值', background: '#dcfce7', color: '#16a34a' },
  { action: 'apiKeys', icon: '🔑', label: 'API 密钥', background: '#dbeafe', color: '#2563eb' },
  { action: 'usage', icon: '📊', label: '用量账单', background: '#ede9fe', color: '#7c3aed' },
];

const SERVICES = [
  { action: 'orders', icon: '🧾', label: '订单中心' },
  { action: 'usage', icon: '📈', label: '用量明细' },
  { action: 'coupons', icon: '🎟️', label: '优惠券' },
  { action: 'ledger', icon: '📒', label: '账单流水' },
  { action: 'invoices', icon: '🧮', label: '发票管理' },
  { action: 'help', icon: '❓', label: '帮助中心' },
  { action: 'news', icon: '📰', label: '新闻动态' },
  { action: 'membership', icon: '💎', label: '会员中心' },
  { action: 'catalog', icon: '🧠', label: '模型与定价' },
  { action: 'more', icon: '⋯', label: '更多服务' },
];

Page({
  data: {
    primaryActions: PRIMARY_ACTIONS,
    services: SERVICES,
    searchValue: '',
    themeClass: '',
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
  },

  onSearchInput(event) {
    this.setData({ searchValue: event.detail.value });
  },

  onSearch() {
    wx.switchTab({ url: '/pages/catalog/index' });
  },

  onOpenCatalog() {
    wx.switchTab({ url: '/pages/catalog/index' });
  },

  onOpenProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  openH5(route) {
    wx.navigateTo({ url: `/pages/h5/index?route=${route}` });
  },

  onAction(event) {
    const action = event.currentTarget.dataset.action;
    switch (action) {
      case 'membership':
        this.openH5('membership');
        return;
      case 'recharge':
        this.openH5('recharge');
        return;
      case 'orders':
        this.openH5('orders');
        return;
      case 'coupons':
        this.openH5('recharge');
        return;
      case 'ledger':
      case 'invoices':
        this.openH5('orders');
        return;
      case 'apiKeys':
        wx.navigateTo({ url: '/pages/api-keys/index' });
        return;
      case 'usage':
        wx.navigateTo({ url: '/pages/usage/index' });
        return;
      case 'catalog':
        wx.switchTab({ url: '/pages/catalog/index' });
        return;
      case 'profile':
        wx.switchTab({ url: '/pages/profile/index' });
        return;
      case 'help':
        wx.showModal({
          title: '帮助中心',
          content: '如需帮助，请联系 SDKWork 支持。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      case 'news':
        wx.showModal({
          title: '新闻动态',
          content: '暂无新的平台公告。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      case 'more':
        wx.showActionSheet({
          itemList: ['会员中心', '发票管理', '账单流水', '设置'],
          success: (result) => {
            if (result.tapIndex === 2) {
              wx.navigateTo({ url: '/pages/usage/index' });
              return;
            }
            if (result.tapIndex === 3) {
              wx.switchTab({ url: '/pages/profile/index' });
              return;
            }
            this.onAction({
              currentTarget: { dataset: { action: result.tapIndex === 0 ? 'membership' : 'invoices' } },
            });
          },
        });
        return;
      default:
        wx.showModal({
          title: '服务接入中',
          content: '该服务正在与当前端对齐，敬请期待。',
          showCancel: false,
          confirmText: '知道了',
        });
    }
  },
});
