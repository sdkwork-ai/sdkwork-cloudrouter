import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_api_keys/sdkwork_cloudrouter_flutter_mobile_console_api_keys.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_catalog/sdkwork_cloudrouter_flutter_mobile_console_catalog.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_messages/sdkwork_cloudrouter_flutter_mobile_console_messages.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_playground/sdkwork_cloudrouter_flutter_mobile_console_playground.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_profile/sdkwork_cloudrouter_flutter_mobile_console_profile.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_usage/sdkwork_cloudrouter_flutter_mobile_console_usage.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

import '../runtime_scope.dart';
import '../bootstrap/sdk_clients.dart';
import 'h5_bridge_page.dart';

/// Console tab host for the H5-aligned mobile sequence:
/// 首页 / 体验中心 / 模型与定价 / 消息 / 我的.
///
/// Usage and API Key are retained as stacked routes reachable from 首页, matching
/// the H5 policy that they are not tabs. The tab bar lives only here.
class ConsoleShell extends StatefulWidget {
  const ConsoleShell({
    required this.session,
    this.messagesRepository,
    this.playground,
    this.onSignOut,
    super.key,
  });

  final CloudRouterSession session;

  /// Test seams for capabilities that would otherwise construct a transport
  /// client during widget tests.
  final ConsoleMessagesRepository? messagesRepository;
  final Widget? playground;

  /// Host-owned sign-out; the auth gate clears the session and rebuilds the
  /// sign-in tree.
  final Future<void> Function()? onSignOut;

  @override
  State<ConsoleShell> createState() => _ConsoleShellState();
}

class _ConsoleShellState extends State<ConsoleShell> {
  int _currentIndex = 0;
  ConsoleMessagesRepository? _messagesRepository;
  Widget? _playground;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_messagesRepository != null && _playground != null) return;
    final runtime = CloudRouterRuntimeScope.of(context);
    final gateway = resolveCloudRouterTransportBaseUrl(
      runtime.sdkClients.appApiBaseUrl,
    );
    _messagesRepository ??= widget.messagesRepository ??
        ImMessagesRepository.forSession(
          gatewayBaseUrl: gateway,
          accessToken: widget.session.accessToken,
          authToken: widget.session.authToken,
          currentUserId: widget.session.subject,
        );
    _playground ??= widget.playground ??
        ConsolePlaygroundScreen(
          client: createCloudRouterPlaygroundClient(
            gatewayBaseUrl: gateway,
            accessToken: widget.session.accessToken,
            authToken: widget.session.authToken,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final runtime = CloudRouterRuntimeScope.of(context);
    final locale = normalizeSdkworkCloudRouterLocale(
      Localizations.localeOf(context).toLanguageTag(),
    );

    final usageCopy = ConsoleUsageMessages.resolve(locale);
    final apiKeysCopy = ConsoleApiKeysMessages.resolve(locale);
    final catalogCopy = ConsoleCatalogMessages.resolve(locale);

    final labels = <String, String>{
      'cloudrouter.console.dashboard.title': '首页',
      'cloudrouter.console.playground.title': '体验中心',
      'cloudrouter.console.messages.title': '消息',
      'cloudrouter.console.catalog.title': catalogCopy.title,
      'cloudrouter.console.profile.title': '我的',
    };

    final usageService = ConsoleUsageService(ports: runtime.consolePorts);
    final apiKeysService = ConsoleApiKeysService(ports: runtime.consolePorts);
    final catalogService = ConsoleCatalogService(ports: runtime.consolePorts);
    final webBaseUrl = resolveCloudRouterWebPublicHttpUrl();

    return ConsoleShellScaffold(
      tabs: consoleTabs,
      currentIndex: _currentIndex,
      onSelectTab: (index) {
        if (index == _currentIndex) return;
        setState(() {
          _currentIndex = index;
        });
      },
      labels: labels,
      children: <Widget>[
        ConsoleHomeScreen(
          onNavigate: (destination) => _onHomeNavigate(
            destination,
            usageService: usageService,
            usageCopy: usageCopy,
            apiKeysService: apiKeysService,
            apiKeysCopy: apiKeysCopy,
            webBaseUrl: webBaseUrl,
          ),
        ),
        _playground!,
        ConsoleCatalogScreen(service: catalogService, copy: catalogCopy),
        ConsoleMessagesScreen(repository: _messagesRepository!),
        ConsoleProfileScreen(onSignOut: widget.onSignOut),
      ],
    );
  }

  void _onHomeNavigate(
    String destination, {
    required ConsoleUsageService usageService,
    required ConsoleUsageCopy usageCopy,
    required ConsoleApiKeysService apiKeysService,
    required ConsoleApiKeysCopy apiKeysCopy,
    required String webBaseUrl,
  }) {
    switch (destination) {
      case 'apiKeys':
        Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder: (_) => Scaffold(
              appBar: AppBar(title: Text(apiKeysCopy.title)),
              body:
                  ConsoleApiKeysScreen(service: apiKeysService, copy: apiKeysCopy),
            ),
          ),
        );
      case 'usage':
        Navigator.of(context).push<void>(
          MaterialPageRoute<void>(
            builder: (_) => Scaffold(
              appBar: AppBar(title: Text(usageCopy.title)),
              body: ConsoleUsageScreen(service: usageService, copy: usageCopy),
            ),
          ),
        );
      case 'playground':
        _selectTab(1);
      case 'catalog':
        _selectTab(2);
      case 'profile':
        _selectTab(4);
      case 'membership':
        _openH5(webBaseUrl, 'membership', '会员中心');
      case 'recharge':
        _openH5(webBaseUrl, 'recharge', '快速充值');
      case 'orders':
        _openH5(webBaseUrl, 'orders', '订单中心');
    }
  }

  void _openH5(String baseUrl, String route, String title) {
    final base = baseUrl.replaceFirst(RegExp(r'/+$'), '');
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => ConsoleH5BridgePage(
          url: '$base/#/$route',
          title: title,
        ),
      ),
    );
  }

  void _selectTab(int index) {
    if (index == _currentIndex) return;
    setState(() {
      _currentIndex = index;
    });
  }
}
