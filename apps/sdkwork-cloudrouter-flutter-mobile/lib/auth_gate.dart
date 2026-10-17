import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

import 'console/console_shell.dart';
import 'runtime_scope.dart';

/// Root auth gate.
///
/// Route guards are shell/runtime responsibilities: this widget evaluates the
/// session once and either renders the console tab host or the sign-in screen.
/// The sign-in screen is not a tab and renders no tab bar. Capability packages
/// declare auth requirements and never redirect.
class CloudRouterAuthGate extends StatefulWidget {
  const CloudRouterAuthGate({super.key});

  @override
  State<CloudRouterAuthGate> createState() => _CloudRouterAuthGateState();
}

class _CloudRouterAuthGateState extends State<CloudRouterAuthGate> {
  late CloudRouterSession _session;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _session = CloudRouterRuntimeScope.of(context).session;
  }

  Future<void> _signIn(String account, String password) async {
    final runtime = CloudRouterRuntimeScope.of(context);
    final session = await requestCloudRouterConsoleSession(
      clients: runtime.sdkClients,
      account: account,
      password: password,
    );
    if (!mounted) return;
    setState(() {
      _session = session;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_session.authenticated) {
      final locale = normalizeSdkworkCloudRouterLocale(
        Localizations.localeOf(context).toLanguageTag(),
      );
      return ConsoleSignInScreen(
        copy: SdkworkCloudRouterMessages.signInCopy(locale),
        onSubmit: _signIn,
      );
    }
    return const ConsoleShell();
  }
}
