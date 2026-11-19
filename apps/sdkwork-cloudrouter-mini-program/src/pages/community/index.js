const app = getApp();

/**
 * Community (圈子社群) entry.
 *
 * The community capability is owned by the H5 renderer, which ships the
 * complete circle/group workspace (discovery, feed, posts, comments, members,
 * groups, membership tiers, and the circle cashier). The mini program opens
 * that workspace in the shared H5 bridge instead of maintaining a second,
 * diverging implementation. The route is a real pathname because the H5
 * renderer uses the History API.
 */
Page({
  data: {
    src: '',
  },

  onLoad() {
    const base = (app.globalData.webPublicHttpUrl || '').replace(/\/+$/, '');
    if (!base) {
      return;
    }
    wx.setNavigationBarTitle({ title: '圈子社群' });
    this.setData({ src: `${base}/community` });
  },
});
