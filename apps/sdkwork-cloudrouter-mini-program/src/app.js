const { bootstrapMiniProgramApplication } = require('./bootstrap/runtime.js');

App({
  globalData: {
    consolePorts: null,
    translate: null,
    locale: 'zh-CN',
    ready: false,
  },

  onLaunch() {
    const runtime = bootstrapMiniProgramApplication();
    this.globalData.consolePorts = runtime.consolePorts;
    this.globalData.translate = runtime.translate;
    this.globalData.locale = runtime.locale;
    this.globalData.ready = true;
  },
});
