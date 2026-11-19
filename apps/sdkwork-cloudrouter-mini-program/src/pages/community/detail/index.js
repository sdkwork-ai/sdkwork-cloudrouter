const app = getApp();

const TAB_LABELS = {
  feed: '动态',
  resources: '资源',
  groups: '群组',
  news: '新闻',
  docs: '文档',
  repos: '开源',
  software: '软件',
  members: '成员',
  about: '关于',
};

Page({
  data: {
    loading: true,
    error: '',
    circle: null,
    tabs: [],
    activeTab: 'feed',
    posts: [],
    tabPosts: [],
    resources: [],
    members: [],
    groups: [],
    tiers: [],
    commentPostId: '',
    commentText: '',
    comments: [],
    commentsLoading: false,
    showComments: false,
    themeClass: '',
  },

  onLoad(options) {
    this.categoryId = options.id || '';
    this.load();
  },

  onShow() {
    this.setData({ themeClass: app.themeClass() });
    app.applyChrome();
  },

  async load() {
    const api = app.globalData.communityApi;
    if (!api || !this.categoryId) {
      this.setData({ loading: false, error: '社区服务未就绪' });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const [circle, posts, resources, members, groups, tiers] = await Promise.all([
        api.getCircle(this.categoryId),
        api.listPosts(this.categoryId).catch(() => []),
        api.listResources(this.categoryId).catch(() => []),
        api.listMembers(this.categoryId).catch(() => []),
        api.listGroups(this.categoryId).catch(() => []),
        api.listTiers(this.categoryId).catch(() => []),
      ]);
      if (!circle) {
        this.setData({ loading: false, error: '圈子不存在' });
        return;
      }
      this.setData({
        circle,
        posts,
        resources,
        members,
        groups,
        tiers,
        tabs: this.buildTabs(circle),
        loading: false,
      });
    } catch (error) {
      this.setData({ loading: false, error: String(error && error.message ? error.message : error) });
    }
  },

  buildTabs(circle) {
    const configured = Array.isArray(circle.tabs) && circle.tabs.length
      ? circle.tabs
      : ['feeds', 'resources', 'groups'];
    const tabs = [{ id: 'feed', label: TAB_LABELS.feed }];
    for (const id of configured) {
      if (id !== 'feeds' && TAB_LABELS[id]) {
        tabs.push({ id, label: TAB_LABELS[id] });
      }
    }
    tabs.push({ id: 'members', label: TAB_LABELS.members });
    tabs.push({ id: 'about', label: TAB_LABELS.about });
    return tabs;
  },

  async onTab(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ activeTab: id });
    if (['news', 'docs', 'repos', 'software'].includes(id)) {
      const api = app.globalData.communityApi;
      if (!api) return;
      try {
        const tabPosts = await api.listTabPosts(this.categoryId, id);
        this.setData({ tabPosts });
      } catch {
        this.setData({ tabPosts: [] });
      }
    }
  },

  async onJoin() {
    const api = app.globalData.communityApi;
    const circle = this.data.circle;
    if (!api || !circle) return;
    if (circle.isPaid) {
      const tiers = this.data.tiers;
      const itemList = tiers.length
        ? tiers.map((tier) => `${tier.name} ¥${tier.price}`)
        : ['查看会员等级'];
      wx.showActionSheet({
        itemList,
        success: () => {
          wx.navigateTo({
            url: `/pages/community/web/index?path=${encodeURIComponent(`/community/${circle.id}`)}`,
          });
        },
      });
      return;
    }
    try {
      await api.joinCircle(circle.id);
      wx.showToast({ title: '已加入', icon: 'success' });
      await this.load();
    } catch {
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  onCompose() {
    wx.navigateTo({ url: `/pages/community/post/index?id=${this.categoryId}` });
  },

  onManage() {
    wx.navigateTo({
      url: `/pages/community/web/index?path=${encodeURIComponent(`/community/${this.categoryId}/profile`)}`,
    });
  },

  async onLike(event) {
    const api = app.globalData.communityApi;
    const id = event.currentTarget.dataset.id;
    if (!api || !id) return;
    try {
      await api.setReaction(id, true);
      wx.showToast({ title: '已点赞', icon: 'none' });
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async onOpenComments(event) {
    const postId = event.currentTarget.dataset.id;
    this.setData({ commentPostId: postId, showComments: true, comments: [], commentsLoading: true });
    const api = app.globalData.communityApi;
    if (!api) return;
    try {
      const comments = await api.listComments(postId);
      this.setData({ comments, commentsLoading: false });
    } catch {
      this.setData({ commentsLoading: false });
    }
  },

  onCommentInput(event) {
    this.setData({ commentText: event.detail.value });
  },

  async onSendComment() {
    const api = app.globalData.communityApi;
    const postId = this.data.commentPostId;
    const text = String(this.data.commentText || '').trim();
    if (!api || !postId || !text) return;
    try {
      await api.addComment(postId, text);
      this.setData({ commentText: '' });
      const comments = await api.listComments(postId);
      this.setData({ comments });
      wx.showToast({ title: '评论成功', icon: 'success' });
    } catch {
      wx.showToast({ title: '评论失败', icon: 'none' });
    }
  },

  onCloseComments() {
    this.setData({ showComments: false, commentPostId: '' });
  },

  onOpenFull() {
    wx.navigateTo({
      url: `/pages/community/web/index?path=${encodeURIComponent(`/community/${this.categoryId}`)}`,
    });
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
});
