import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart';

import 'bootstrap/auth_runtime_config.dart';
import 'bootstrap/iam_auth_data_source.dart';
import 'console/console_shell.dart';
import 'runtime_scope.dart';

enum _AuthStage { login, register, forgotPassword, contextSelection }

class _AuthBootstrap {
  const _AuthBootstrap({required this.messages, required this.config});

  final Map<String, String> messages;
  final IamFlutterMobileAuthRuntimeConfig config;
}

/// Root auth gate.
///
/// Renders the shared IAM Flutter auth screens when signed out and the console
/// tab host when signed in. The IAM package owns copy and validation; this host
/// supplies the data source (generated IAM/CloudRouter app SDK), the runtime
/// auth policy, and the login/register/recovery/context navigation.
class CloudRouterAuthGate extends StatefulWidget {
  const CloudRouterAuthGate({super.key});

  @override
  State<CloudRouterAuthGate> createState() => _CloudRouterAuthGateState();
}

class _CloudRouterAuthGateState extends State<CloudRouterAuthGate> {
  late CloudRouterSession _session;
  CloudRouterIamAuthDataSource? _dataSource;
  IamFlutterMobileAuthController? _authController;
  Future<_AuthBootstrap>? _bootstrap;
  _AuthStage _stage = _AuthStage.login;

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
      _bootstrap = _loadBootstrap(runtime.sdkClients);
    }
  }

  Future<_AuthBootstrap> _loadBootstrap(CloudRouterAppSdkClients clients) async {
    final messages = await _loadAuthMessages();
    final config = await fetchCloudRouterAuthRuntimeConfig(clients);
    return _AuthBootstrap(messages: messages, config: config);
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
      _stage = _AuthStage.login;
      _session = readCloudRouterSession(
        accessToken: session?.accessToken,
        authToken: session?.authToken,
        subject: session?.userId,
      );
    });
  }

  void _handleContextSelectionRequired(
    IamLoginContextSelectionChallenge _,
  ) {
    setState(() => _stage = _AuthStage.contextSelection);
  }

  void _showLogin() {
    setState(() => _stage = _AuthStage.login);
  }

  Future<void> _signOut() async {
    await _dataSource?.signOut();
    if (!mounted) return;
    setState(() {
      _stage = _AuthStage.login;
      _session = readCloudRouterSession();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_session.authenticated) {
      return ConsoleShell(session: _session, onSignOut: _signOut);
    }
    final bootstrap = _bootstrap;
    if (bootstrap == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return FutureBuilder<_AuthBootstrap>(
      future: bootstrap,
      builder: (context, snapshot) {
        final resolved = snapshot.data;
        if (resolved == null) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (resolved.messages.isEmpty) {
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
        return _buildAuthSurface(
          messages: resolved.messages,
          config: resolved.config,
        );
      },
    );
  }

  Widget _buildAuthSurface({
    required Map<String, String> messages,
    required IamFlutterMobileAuthRuntimeConfig config,
  }) {
    switch (_stage) {
      case _AuthStage.register:
        return IamFlutterMobileAuthRegisterScreen(
          controller: _authController,
          messages: messages,
          runtimeConfig: config,
          onBackToLogin: _showLogin,
          onSignedIn: _handleSignedIn,
          onContextSelectionRequired: _handleContextSelectionRequired,
        );
      case _AuthStage.forgotPassword:
        return IamFlutterMobileAuthForgotPasswordScreen(
          controller: _authController,
          messages: messages,
          onReset: _showLogin,
        );
      case _AuthStage.contextSelection:
        return IamFlutterMobileAuthContextSelectionScreen(
          controller: _authController!,
          messages: messages,
          onSignedIn: _handleSignedIn,
        );
      case _AuthStage.login:
        return IamFlutterMobileAuthScreen(
          controller: _authController,
          messages: messages,
          runtimeConfig: config,
          onSignedIn: _handleSignedIn,
          onOpenRegister: () => setState(() => _stage = _AuthStage.register),
          onOpenForgotPassword: () =>
              setState(() => _stage = _AuthStage.forgotPassword),
          onContextSelectionRequired: _handleContextSelectionRequired,
        );
    }
  }
}
