import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Authored copy for the api_keys capability.
///
/// Keys mirror the `cloudrouter.console.apiKeys.*` fragments authored for the
/// H5 and mini-program roots. Fragment delivery follows `I18N_SPEC.md`: the
/// `.arb` projection requires the Flutter toolchain and is declared pending in
/// the app manifest; until then this record is the single source the screen
/// reads.
class ConsoleApiKeysCopy {
  const ConsoleApiKeysCopy({
    required this.title,
    required this.summary,
    required this.namePlaceholder,
    required this.create,
    required this.creating,
    required this.revoke,
    required this.revoking,
    required this.empty,
    required this.createdOnce,
    required this.statusActive,
    required this.statusDisabled,
    required this.statusRevoked,
    required this.statusUnknown,
    required this.createFailed,
    required this.revokeFailed,
    required this.createGap,
    required this.loading,
    required this.reload,
  });

  final String title;
  final String summary;
  final String namePlaceholder;
  final String create;
  final String creating;
  final String revoke;
  final String revoking;
  final String empty;
  final String createdOnce;
  final String statusActive;
  final String statusDisabled;
  final String statusRevoked;
  final String statusUnknown;
  final String createFailed;
  final String revokeFailed;

  /// Shown when the generated Dart transport cannot express the create call.
  final String createGap;
  final String loading;
  final String reload;
}

class ConsoleApiKeysMessages {
  const ConsoleApiKeysMessages._();

  static const String titleKey = 'cloudrouter.console.apiKeys.title';

  static ConsoleApiKeysCopy enUs() => const ConsoleApiKeysCopy(
        title: 'API Keys',
        summary: 'Manage the keys used to call the gateway',
        namePlaceholder: 'Key name',
        create: 'Create key',
        creating: 'Creating',
        revoke: 'Revoke',
        revoking: 'Revoking',
        empty: 'No API keys yet',
        createdOnce: 'Key created — copy it now:',
        statusActive: 'Active',
        statusDisabled: 'Disabled',
        statusRevoked: 'Revoked',
        statusUnknown: 'Unknown',
        createFailed: 'Could not create the key. Please retry.',
        revokeFailed: 'Could not revoke the key. Please retry.',
        createGap:
            'Key creation is unavailable: the generated Dart transport cannot express the create request body yet. Regenerate the Dart SDK and retry.',
        loading: 'Loading…',
        reload: 'Retry',
      );

  static ConsoleApiKeysCopy zhCn() => const ConsoleApiKeysCopy(
        title: 'API Key',
        summary: '管理调用网关使用的密钥',
        namePlaceholder: '密钥名称',
        create: '新建密钥',
        creating: '创建中',
        revoke: '吊销',
        revoking: '吊销中',
        empty: '还没有 API Key',
        createdOnce: '密钥已创建，请立即保存：',
        statusActive: '启用',
        statusDisabled: '停用',
        statusRevoked: '已吊销',
        statusUnknown: '未知',
        createFailed: '创建失败，请重试。',
        revokeFailed: '吊销失败，请重试。',
        createGap: '当前 Flutter 传输层暂不支持创建密钥：请重新生成 Dart SDK 后重试。',
        loading: '加载中…',
        reload: '重试',
      );

  static ConsoleApiKeysCopy resolve(SdkworkCloudRouterLocale locale) {
    return locale == SdkworkCloudRouterLocale.zhCn ? zhCn() : enUs();
  }
}
