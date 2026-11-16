const app = getApp();

// The Cloud Router H5 renderer routes with the History API, so deep links are
// real pathnames. Older builds opened `/#/<route>`; the H5 bootstrap still
// normalizes those legacy hash links, so a mini-program release that lags this
// table keeps working.
const ROUTES = {
  membership: { title: '会员中心', path: '/membership' },
  recharge: { title: '快速充值', path: '/recharge' },
  orders: { title: '订单中心', path: '/orders' },
  messages: { title: '消息', path: '/messages' },
  playground: { title: '体验中心', path: '/playground' },
  signIn: { title: '登录', path: '/sign-in' },
  help: { title: '帮助中心', path: '/help' },
};

Page({
  data: {
    src: '',
  },

  onLoad(options) {
    const route = ROUTES[options.route];
    const base = (app.globalData.webPublicHttpUrl || '').replace(/\/+$/, '');
    if (!route || !base) {
      this.setData({ src: '' });
      return;
    }
    wx.setNavigationBarTitle({ title: route.title });
    this.setData({ src: `${base}${route.path}` });
  },
});
