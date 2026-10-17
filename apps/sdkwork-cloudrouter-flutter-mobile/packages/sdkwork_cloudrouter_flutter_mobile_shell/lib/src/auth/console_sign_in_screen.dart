import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

/// Sign-in screen for the Cloud Router console.
///
/// The screen owns form state and error presentation only; the session call
/// itself is injected by the root so the transport gap stays declared in one
/// place (`APP_FLUTTER_UI_SPEC.md` section 4). The route is not a tab and never
/// renders the tab bar.
class ConsoleSignInScreen extends StatefulWidget {
  const ConsoleSignInScreen({
    required this.copy,
    required this.onSubmit,
    super.key,
  });

  final SdkworkCloudRouterSignInCopy copy;

  /// Performs the sign-in; implementations surface the declared transport gap
  /// instead of failing silently.
  final Future<void> Function(String account, String password) onSubmit;

  @override
  State<ConsoleSignInScreen> createState() => _ConsoleSignInScreenState();
}

class _ConsoleSignInScreenState extends State<ConsoleSignInScreen> {
  final TextEditingController _accountController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _submitting = false;
  String _errorMessage = '';

  @override
  void dispose() {
    _accountController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final account = _accountController.text.trim();
    final password = _passwordController.text;
    if (account.isEmpty || password.isEmpty) return;
    setState(() {
      _submitting = true;
      _errorMessage = '';
    });
    try {
      await widget.onSubmit(account, password);
      if (!mounted) return;
      setState(() {
        _submitting = false;
      });
    } catch (cause) {
      if (!mounted) return;
      final isGap = cause is UnsupportedError;
      setState(() {
        _submitting = false;
        _errorMessage = isGap ? widget.copy.transportGap : widget.copy.failed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.copy.title)),
      body: ListView(
        padding: const EdgeInsets.all(SdkworkCloudRouterFlutterTokens.contentInset),
        children: [
          Text(
            widget.copy.hint,
            style: const TextStyle(
              fontSize: 12,
              color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _accountController,
            enabled: !_submitting,
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              labelText: widget.copy.email,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            enabled: !_submitting,
            obscureText: true,
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              labelText: widget.copy.password,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
            onSubmitted: (_) => _submit(),
          ),
          if (_errorMessage.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              _errorMessage,
              style: const TextStyle(
                fontSize: 12,
                color: Color(SdkworkCloudRouterFlutterTokens.colorDanger),
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? widget.copy.submitting : widget.copy.submit),
            ),
          ),
        ],
      ),
    );
  }
}
