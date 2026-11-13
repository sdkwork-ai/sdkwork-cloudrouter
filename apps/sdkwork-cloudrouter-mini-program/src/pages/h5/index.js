const app = getApp();

const ROUTES = {
  membership: { title: '会员中心', path: '/#/membership' },
  recharge: { title: '快速充值', path: '/#/recharge' },
  orders: { title: '订单中心', path: '/#/orders' },
  messages: { title: '消息', path: '/#/messages' },
  playground: { title: '体验中心', path: '/#/playground' },
  signIn: { title: '登录', path: '/#/sign-in' },
  help: { title: '帮助中心', path: '/#/help' },
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
