import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_settings_flutter/sdkwork_settings_flutter.dart';

import '../settings/localized_settings_catalog.dart';

/// Cloud Router mobile profile tab.
///
/// The profile screen owns account/help/privacy rows and opens the shared
/// Flutter settings center. It never redefines settings: appearance, voice,
/// notifications, and about come from `sdkwork_settings_flutter` and the shared
/// appbase catalog.
class ConsoleProfileScreen extends StatelessWidget {
  const ConsoleProfileScreen({this.onSignOut, super.key});

  /// Host-owned sign-out; omitted in tests and embedded compositions.
  final Future<void> Function()? onSignOut;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: <Widget>[
        Row(
          children: <Widget>[
            CircleAvatar(
              radius: 28,
              backgroundColor: const Color(0xFFEDE9FE),
              child: Text(
                'C',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF7C3AED),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('CloudRouter 用户', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    '账户、设置与帮助',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          margin: EdgeInsets.zero,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Text(
                      '余额(元)',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const Spacer(),
                    OutlinedButton(
                      onPressed: () =>
                          _showNotice(context, '充值', '充值服务由 H5 商业页提供。'),
                      child: const Text('充值'),
                    ),
                  ],
                ),
                Text(
                  '--',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Divider(height: 20),
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.account_balance_wallet_outlined),
                  title: const Text('设置自动充值'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () =>
                      _showNotice(context, '自动充值', '自动充值由 H5 商业页提供。'),
                ),
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          '优惠券(张)  --',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          '可开发票(元)  --',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: <Widget>[
              _ProfileRow(
                icon: Icons.history,
                label: '操作记录',
                onTap: () => _showNotice(context, '操作记录', '暂无操作记录。'),
              ),
              const Divider(height: 1),
              _ProfileRow(
                icon: Icons.settings_outlined,
                label: '设置',
                onTap: () => _openSettings(context),
              ),
              const Divider(height: 1),
              _ProfileRow(
                icon: Icons.help_outline,
                label: '帮助中心',
                onTap: () => _showNotice(context, '帮助中心', '如需帮助，请联系 SDKWork 支持。'),
              ),
              const Divider(height: 1),
              _ProfileRow(
                icon: Icons.privacy_tip_outlined,
                label: '隐私政策',
                onTap: () => _showNotice(context, '隐私政策', '隐私政策以运营方站点配置为准。'),
              ),
              const Divider(height: 1),
              _ProfileRow(
                icon: Icons.info_outline,
                label: '关于 CloudRouter',
                onTap: () => showAboutDialog(
                  context: context,
                  applicationName: 'CloudRouter',
                  applicationVersion: '0.1.0',
                  applicationLegalese: '统一模型路由与 AI 算力平台',
                ),
              ),
            ],
          ),
        ),
        if (onSignOut != null) ...<Widget>[
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: ListTile(
              leading: Icon(
                Icons.logout,
                color: Theme.of(context).colorScheme.error,
              ),
              title: Text(
                '退出登录',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              onTap: () => _confirmSignOut(context),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _confirmSignOut(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出当前账户吗？'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('退出'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await onSignOut?.call();
    }
  }

  void _openSettings(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const _ProfileSettingsPage()),
    );
  }

  void _showNotice(BuildContext context, String title, String message) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

class _ProfileSettingsPage extends StatefulWidget {
  const _ProfileSettingsPage();

  @override
  State<_ProfileSettingsPage> createState() => _ProfileSettingsPageState();
}

class _ProfileSettingsPageState extends State<_ProfileSettingsPage> {
  late final SdkworkSettingsController _controller;

  @override
  void initState() {
    super.initState();
    _controller = SdkworkSettingsController(
      catalog: createCloudRouterSettingsCatalog(),
      store: const SdkworkSharedPreferencesSettingsStore(),
      initialValues: <String, Object?>{
        'appearance.theme':
            cloudRouterThemePreferenceFromMode(cloudRouterThemeMode.value),
      },
      query: const SdkworkSettingsQuery(
        appId: 'sdkwork-cloudrouter-flutter',
        scope: SdkworkSettingsScope.user,
        userId: 'local',
      ),
    );
    _controller.addListener(_syncTheme);
    _syncTheme();
  }

  void _syncTheme() {
    final preference =
        _controller.values['appearance.theme']?.toString() ?? 'system';
    cloudRouterThemeMode.value =
        cloudRouterThemeModeFromPreference(preference);
    SharedPreferences.getInstance()
        .then((preferences) =>
            preferences.setString(cloudRouterThemeStorageKey, preference))
        .catchError((Object error) {
      debugPrint('[cloudrouter-settings] theme persist failed: $error');
      return false;
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_syncTheme);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkSettingsScreen(
      controller: _controller,
      strings: SdkworkSettingsStrings.chinese,
      showSearch: false,
      onBack: () => Navigator.of(context).pop(),
    );
  }
}
