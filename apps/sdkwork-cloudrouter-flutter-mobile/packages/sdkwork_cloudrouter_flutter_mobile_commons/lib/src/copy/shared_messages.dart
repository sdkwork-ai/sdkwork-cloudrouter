/// Shared console copy for the SDKWork CloudRouter Flutter mobile family.
///
/// Keys mirror the `cloudrouter.console.shared.*` and `cloudrouter.auth.signIn.*`
/// fragments authored for the H5 and mini-program roots, so the same workflow
/// shows the same copy on every client root. Placement note
/// (`I18N_SPEC.md` section 6.1): the authored `.arb` fragment projection
/// requires the Flutter toolchain and is declared pending in the app manifest;
/// until then these records are the single source the shell and capability
/// packages read.
library;

import 'locale_helpers.dart';

/// Cross-capability console strings (`cloudrouter.console.shared.*`).
class SdkworkCloudRouterSharedCopy {
  const SdkworkCloudRouterSharedCopy({
    required this.appTitle,
    required this.appSubtitle,
    required this.signOut,
    required this.reload,
    required this.empty,
    required this.loading,
    required this.loadMore,
    required this.errorTitle,
    required this.errorMessage,
  });

  final String appTitle;
  final String appSubtitle;
  final String signOut;
  final String reload;
  final String empty;
  final String loading;
  final String loadMore;
  final String errorTitle;
  final String errorMessage;
}

/// Sign-in screen strings (`cloudrouter.auth.signIn.*`).
class SdkworkCloudRouterSignInCopy {
  const SdkworkCloudRouterSignInCopy({
    required this.title,
    required this.hint,
    required this.email,
    required this.password,
    required this.submit,
    required this.submitting,
    required this.failed,
    required this.transportGap,
  });

  final String title;
  final String hint;
  final String email;
  final String password;
  final String submit;
  final String submitting;
  final String failed;

  /// Shown when the generated Dart transport cannot express the session
  /// bootstrap call yet; the gap is declared instead of patched with raw HTTP.
  final String transportGap;
}

/// Resolves the shared and sign-in copy for a locale.
class SdkworkCloudRouterMessages {
  const SdkworkCloudRouterMessages._();

  static SdkworkCloudRouterSharedCopy sharedCopy(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? _sharedZhCn : _sharedEnUs;
  }

  static SdkworkCloudRouterSignInCopy signInCopy(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? _signInZhCn : _signInEnUs;
  }

  static const SdkworkCloudRouterSharedCopy _sharedZhCn = SdkworkCloudRouterSharedCopy(
    appTitle: 'CloudRouter 控制台',
    appSubtitle: '移动端模型路由控制台',
    signOut: '退出登录',
    reload: '重试',
    empty: '暂无数据',
    loading: '加载中…',
    loadMore: '加载更多',
    errorTitle: '页面出现问题',
    errorMessage: '页面渲染出现异常，请重试。',
  );

  static const SdkworkCloudRouterSharedCopy _sharedEnUs = SdkworkCloudRouterSharedCopy(
    appTitle: 'CloudRouter Console',
    appSubtitle: 'Mobile model routing console',
    signOut: 'Sign out',
    reload: 'Retry',
    empty: 'No data',
    loading: 'Loading…',
    loadMore: 'Load more',
    errorTitle: 'Something went wrong',
    errorMessage: 'This page failed to render. Please retry.',
  );

  static const SdkworkCloudRouterSignInCopy _signInZhCn = SdkworkCloudRouterSignInCopy(
    title: '登录 CloudRouter 控制台',
    hint: '使用 SDKWork 账号登录，移动端仅提供控制台只读与密钥管理能力。',
    email: '账号',
    password: '密码',
    submit: '登录',
    submitting: '登录中…',
    failed: '登录失败，请检查账号与密码。',
    transportGap: '当前 Flutter 传输层暂不支持登录：请重新生成 Dart SDK 后重试。',
  );

  static const SdkworkCloudRouterSignInCopy _signInEnUs = SdkworkCloudRouterSignInCopy(
    title: 'Sign in to CloudRouter Console',
    hint: 'Sign in with your SDKWork account. Mobile clients expose console read and key management only.',
    email: 'Account',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    failed: 'Sign-in failed. Check the account and password.',
    transportGap:
        'Sign-in is unavailable: the generated Dart transport cannot express the session bootstrap call yet. Regenerate the Dart SDK and retry.',
  );
}
