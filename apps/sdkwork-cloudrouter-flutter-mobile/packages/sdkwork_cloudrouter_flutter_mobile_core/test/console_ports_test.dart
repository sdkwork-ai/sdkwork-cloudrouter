import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

void main() {
  test('normalizes an app api base url and strips the app api prefix', () {
    const configured = 'http://127.0.0.1:3905/app/v3/api';
    expect(normalizeCloudRouterAppApiBaseUrl(configured), configured);
    expect(
      resolveCloudRouterTransportBaseUrl(configured),
      'http://127.0.0.1:3905',
    );
  });

  test('rejects a base url without the app api prefix', () {
    expect(
      () => normalizeCloudRouterAppApiBaseUrl('http://127.0.0.1:3905'),
      throwsArgumentError,
    );
  });

  test('rejects a base url repeating the app api prefix', () {
    expect(
      () => normalizeCloudRouterAppApiBaseUrl(
        'http://127.0.0.1:3905/app/v3/api/app/v3/api',
      ),
      throwsArgumentError,
    );
  });

  test('session snapshot matches the shared identity shape', () {
    final session = readCloudRouterSession(
      accessToken: 'access',
      authToken: 'auth',
    );
    expect(session.authenticated, isTrue);
    expect(session.tenantId, '100001');
    expect(session.organizationId, '0');
  });

  test('key creation is blocked until the generated transport accepts a body', () {
    final ports = createCloudRouterConsolePorts(
      sdkClients: createCloudRouterAppSdkClients(
        appApiBaseUrl: 'http://127.0.0.1:3905/app/v3/api',
      ),
    );
    expect(
      () => ports.createApiKey(),
      throwsA(isA<UnsupportedError>()),
    );
    expect(defaultApiKeyQuota, '0.000000');
    expect(defaultApiKeyModalitiesAreComplete(), isTrue);
  });
}

/// Guards the modality default used once creation is enabled.
bool defaultApiKeyModalitiesAreComplete() => defaultApiKeyModalities.length == 5;
