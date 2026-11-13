import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

import 'bootstrap/iam_auth_data_source.dart';
import 'console/console_shell.dart';
import 'runtime_scope.dart';

/// Root auth gate.
///
/// Renders the shared IAM Flutter auth screen when signed out and the console
/// tab host when signed in. The IAM screen owns form validation and copy; this
/// host supplies the data source (generated IAM/CloudRouter app SDK) and swaps
/// the tree on sign-in/sign-out.
class CloudRouterAuthGate extends StatefulWidget {
  const CloudRouterAuthGate({super.key});

  @override
  State<CloudRouterAuthGate> createState() => _CloudRouterAuthGateState();
}

class _CloudRouterAuthGateState extends State<CloudRouterAuthGate> {
  late CloudRouterSession _session;
  CloudRouterIamAuthDataSource? _dataSource;
  IamFlutterMobileAuthController? _authController;
  Future<Map<String, String>>? _authMessages;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final runtime = CloudRouterRuntimeScope.of(context);
    if (_dataSource == null) {
      _session = runtime.session;
      _dataSource = CloudRouterIamAuthDataSource(runtime.sdkClients);
      _authController = IamFlutterMobileAuthController(
        service: IamFlutterMobileAuthService(dataSource: _dataSource),
      );
      _authMessages = _loadAuthMessages();
    }
  }

  Future<Map<String, String>> _loadAuthMessages() async {
    final locale =
        WidgetsBinding.instance.platformDispatcher.locale.languageCode == 'zh'
            ? 'zh-CN'
            : 'en-US';
    final encoded = await rootBundle.loadString(
      'packages/sdkwork_iam_flutter_mobile_auth/lib/src/i18n/$locale/iam/auth/auth.arb',
    );
    final decoded = jsonDecode(encoded);
    if (decoded is! Map) return const <String, String>{};
    return <String, String>{
      for (final entry in decoded.entries)
        if (!entry.key.toString().startsWith('@'))
          entry.key.toString(): entry.value.toString(),
    };
  }

  void _handleSignedIn() {
    final session = _authController?.state.session;
    if (!mounted) return;
    setState(() {
      _session = readCloudRouterSession(
        accessToken: session?.accessToken,
        authToken: session?.authToken,
        subject: session?.userId,
      );
    });
  }

  Future<void> _signOut() async {
    await _dataSource?.signOut();
    if (!mounted) return;
    setState(() {
      _session = readCloudRouterSession();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_session.authenticated) {
      return ConsoleShell(session: _session, onSignOut: _signOut);
    }
    final messages = _authMessages;
    if (messages == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return FutureBuilder<Map<String, String>>(
      future: messages,
      builder: (context, snapshot) {
        final copy = snapshot.data;
        if (copy == null || copy.isEmpty) {
          // Missing package assets must not lock the user out: keep the compact
          // host form as a fallback while the shared screen is unavailable.
          final locale = normalizeSdkworkCloudRouterLocale(
            Localizations.localeOf(context).toLanguageTag(),
          );
          return ConsoleSignInScreen(
            copy: SdkworkCloudRouterMessages.signInCopy(locale),
            onSubmit: (account, password) async {
              await _authController?.signIn(
                username: account,
                password: password,
              );
              _handleSignedIn();
            },
          );
        }
        return IamFlutterMobileAuthScreen(
          controller: _authController,
          messages: copy,
          onSignedIn: _handleSignedIn,
        );
      },
    );
  }
}
