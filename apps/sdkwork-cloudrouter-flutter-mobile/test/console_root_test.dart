import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_api_keys/sdkwork_cloudrouter_flutter_mobile_console_api_keys.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_catalog/sdkwork_cloudrouter_flutter_mobile_console_catalog.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_usage/sdkwork_cloudrouter_flutter_mobile_console_usage.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

import 'package:sdkwork_cloudrouter_flutter_mobile/sdkwork_cloudrouter_flutter_mobile.dart'
    show CloudRouterFlutterRuntime, CloudRouterRuntimeScope, ConsoleShell, createRoutes, verifyConsoleRouteAlignment;

void main() {
  group('console route assembly', () {
    test('contributes exactly the four console tabs', () {
      final routes = createRoutes();
      expect(routes.length, 4);
      expect(
        routes.map((route) => route.routeName).toList(),
        <String>['/dashboard', '/usage', '/api-keys', '/catalog'],
      );
    });

    test('alignment check passes for the assembled registry', () {
      expect(() => verifyConsoleRouteAlignment(createRoutes()), returnsNormally);
    });

    test('alignment check fails on a title-key drift', () {
      final drifted = createRoutes()
          .map(
            (route) => SdkworkCloudRouterRouteRegistration(
              id: route.id,
              routeName: route.routeName,
              titleKey: 'cloudrouter.console.usage.drifted',
              authRequired: route.authRequired,
              screen: route.screen,
            ),
          )
          .toList();
      expect(() => verifyConsoleRouteAlignment(drifted), throwsStateError);
    });
  });

  group('generated app sdk clients', () {
    test('normalizes an app api base url and strips the app api prefix', () {
      const configured = 'http://127.0.0.1:3905/app/v3/api';
      expect(normalizeCloudRouterAppApiBaseUrl(configured), configured);
      expect(resolveCloudRouterTransportBaseUrl(configured), 'http://127.0.0.1:3905');
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

    test('key creation is blocked until the generated transport accepts a body', () {
      final ports = createCloudRouterConsolePorts(
        sdkClients: createCloudRouterAppSdkClients(
          appApiBaseUrl: 'http://127.0.0.1:3905/app/v3/api',
        ),
      );
      expect(() => ports.createApiKey(), throwsA(isA<UnsupportedError>()));
    });
  });

  group('read-model projections mirror the browser roots', () {
    test('usage records normalize aliases and totals', () {
      final record = toConsoleUsageRecord(<String, Object?>{
        'id': 'log-1',
        'model': 'gpt-5',
        'inputTokens': 120,
        'outputTokens': 30,
        'totalCost': 250,
        'status': 'ok',
        'createdAt': '2026-10-16T09:30:00Z',
      });
      expect(record.id, 'log-1');
      expect(record.promptTokens, 120);
      expect(record.completionTokens, 30);
      expect(record.totalTokens, 150);
      expect(record.costMinorUnits, 250);
      expect(record.status, ConsoleUsageStatus.succeeded);
      expect(record.occurredAt, '2026-10-16T09:30:00Z');
    });

    test('catalog rows normalize prices and defaults', () {
      final row = toConsoleCatalogRateRow(<String, Object?>{
        'id': 'rate-1',
        'provider': 'openai',
        'modelName': 'gpt-5',
        'promptPrice': 0.5,
      });
      expect(row.id, 'rate-1');
      expect(row.vendor, 'openai');
      expect(row.model, 'gpt-5');
      expect(row.inputPricePerMillionTokens, 0.5);
      expect(row.outputPricePerMillionTokens, null);
      expect(row.currency, 'CNY');
      expect(row.unit, '1M tokens');
    });

    test('api key summaries mask raw keys and map status aliases', () {
      final summary = toConsoleApiKeySummary(<String, Object?>{
        'id': 'key-1',
        'name': 'primary',
        'key': 'sk-abcdefghijklmnop',
        'state': 'enabled',
      });
      expect(summary.id, 'key-1');
      expect(summary.name, 'primary');
      expect(summary.maskedKey, 'sk-a********mnop');
      expect(summary.status, ConsoleApiKeyStatus.active);
    });

    test('create responses expose the one-time plaintext secret', () {
      expect(
        readCreatedApiKeySecret(<String, Object?>{'key': 'sk-plaintext-value'}),
        'sk-plaintext-value',
      );
      expect(
        readCreatedApiKeySecret(<String, Object?>{
          'data': <String, Object?>{'secret': 'sk-nested-secret'},
        }),
        'sk-nested-secret',
      );
      expect(readCreatedApiKeySecret(<String, Object?>{}), null);
    });

    test('dashboard projection reads the overview envelope', () {
      final snapshot = projectConsoleDashboardSnapshot(<String, Object?>{
        'totalRequests': 12,
        'totalTokens': 2048,
        'costMinorUnits': 990,
        'currency': 'CNY',
        'errorRate': 0.25,
        'windowLabel': 'Last 24 hours',
      });
      expect(snapshot.totalRequests, 12);
      expect(snapshot.totalTokens, 2048);
      expect(snapshot.costMinorUnits, 990);
      expect(snapshot.currency, 'CNY');
      expect(snapshot.errorRate, 0.25);
      expect(snapshot.windowLabel, 'Last 24 hours');
    });
  });

  group('console shell composition', () {
    testWidgets('renders the app bar, four tab destinations, and the first tab', (tester) async {
      final sdkClients = createCloudRouterAppSdkClients(
        appApiBaseUrl: 'http://127.0.0.1:3905/app/v3/api',
      );
      final runtime = CloudRouterFlutterRuntime(
        sdkClients: sdkClients,
        consolePorts: createCloudRouterConsolePorts(sdkClients: sdkClients),
        session: readCloudRouterSession(accessToken: 'access-token'),
        routes: createRoutes(),
      );

      await tester.pumpWidget(
        CloudRouterRuntimeScope(
          runtime: runtime,
          child: MaterialApp(
            theme: buildSdkworkCloudRouterTheme(),
            home: const ConsoleShell(),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(4));
      // The active tab title appears in the app bar and as the tab label.
      expect(find.text('Overview'), findsNWidgets(2));
      expect(find.byType(ConsoleDashboardScreen), findsOneWidget);
    });
  });
}
