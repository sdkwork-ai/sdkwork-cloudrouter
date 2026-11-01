/**
 * auth/app copy (zh-CN): hosted sign-in for a native SDKWork application.
 * Keys are `cloudrouter.auth.app.<field>`.
 */
export const appAuthMessages: Record<string, string> = {
  'cloudrouter.auth.app.title': "登录应用",
  'cloudrouter.auth.app.description': "继续完成登录授权，登录成功后应用会自动重新打开。",
  'cloudrouter.auth.app.signInDescription': "请使用 SDKWork 账号登录以完成应用登录。",
  'cloudrouter.auth.app.invalidTitle': "此登录链接无效",
  'cloudrouter.auth.app.invalidDescription': "应用发起的授权请求无法在此平台启动。请回到应用重新发起登录以获取新的链接。",
  'cloudrouter.auth.app.hint': "请保持此页面打开直到应用返回：授权码会通过应用注册的深链交回应用。",
  'cloudrouter.auth.app.problemLabel': "原因",
  'cloudrouter.auth.app.backToConsole': "返回控制台首页",
  'cloudrouter.auth.app.completing': "正在完成登录…",
  'cloudrouter.auth.app.failed': "应用登录未能完成，请回到应用重新发起。",
  'cloudrouter.auth.app.launchTitle': "正在返回应用",
  'cloudrouter.auth.app.launchDescription': "登录已完成，应用将打开并结束登录。",
  'cloudrouter.auth.app.launchOpen': "打开应用",
  'cloudrouter.auth.app.launchLink': "手动打开登录链接",
  'cloudrouter.auth.app.launchHint': "如果应用没有自动打开，请点击上方按钮。授权码仅可使用一次，若链接已过期请回到应用重新发起登录。",
  'cloudrouter.auth.app.launchFailed': "无法自动打开应用，请点击上方按钮。",
  'cloudrouter.auth.app.missingRedirect': "缺少返回应用的交接链接，请回到应用重新发起登录。",
};
