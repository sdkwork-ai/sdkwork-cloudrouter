import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

void main() {
  group('console tab descriptors', () {
    test('mirror the canonical console route order', () {
      expect(
        consoleTabs.map((tab) => tab.routeKey).toList(),
        <String>['dashboard', 'usage', 'apiKeys', 'catalog'],
      );
      expect(
        consoleTabs.map((tab) => tab.path).toList(),
        <String>['/dashboard', '/usage', '/api-keys', '/catalog'],
      );
      expect(
        consoleTabs.map((tab) => tab.glyph).toList(),
        <ConsoleTabGlyph>[
          ConsoleTabGlyph.dashboard,
          ConsoleTabGlyph.receipt,
          ConsoleTabGlyph.key,
          ConsoleTabGlyph.barChart,
        ],
      );
    });

    test('every tab title key is namespaced under cloudrouter.console', () {
      for (final tab in consoleTabs) {
        expect(tab.titleKey, startsWith('cloudrouter.console.'));
      }
    });

    test('the sign-in route is not a tab', () {
      expect(consoleTabs.where((tab) => tab.path == '/sign-in'), isEmpty);
    });
  });

  group('route registry', () {
    test('keeps only entries with an id and a route name', () {
      final registry = createSdkworkCloudRouterRouteRegistry(<SdkworkCloudRouterRouteRegistration>[
        const SdkworkCloudRouterRouteRegistration(
          id: 'console.router.dashboard.overview',
          routeName: '/dashboard',
          titleKey: 'cloudrouter.console.dashboard.title',
          authRequired: true,
          screen: 'ConsoleDashboardScreen',
        ),
        const SdkworkCloudRouterRouteRegistration(
          id: '',
          routeName: '/usage',
          titleKey: 'cloudrouter.console.usage.title',
          authRequired: true,
          screen: 'ConsoleUsageScreen',
        ),
        const SdkworkCloudRouterRouteRegistration(
          id: 'console.router.catalog.pricing',
          routeName: '',
          titleKey: 'cloudrouter.console.catalog.title',
          authRequired: true,
          screen: 'ConsoleCatalogScreen',
        ),
      ]);
      expect(registry.length, 1);
      expect(registry.single.routeName, '/dashboard');
    });
  });

  group('auth gate decision', () {
    test('allows public routes and authenticated sessions', () {
      expect(
        evaluateSdkworkCloudRouterAuthGate(authRequired: false, isAuthenticated: false).allowed,
        isTrue,
      );
      expect(
        evaluateSdkworkCloudRouterAuthGate(authRequired: true, isAuthenticated: true).allowed,
        isTrue,
      );
    });

    test('blocks protected routes for anonymous sessions with a reason', () {
      final decision = evaluateSdkworkCloudRouterAuthGate(
        authRequired: true,
        isAuthenticated: false,
      );
      expect(decision.allowed, isFalse);
      expect(decision.reason, 'authentication-required');
    });
  });

  group('ConsoleTabBar', () {
    testWidgets('renders one destination per tab with outline and filled glyphs', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConsoleTabBar(
              tabs: consoleTabs,
              currentIndex: 1,
              onSelect: (_) {},
              labels: <String, String>{
                'cloudrouter.console.dashboard.title': '概览',
                'cloudrouter.console.usage.title': '用量',
                'cloudrouter.console.apiKeys.title': 'API Key',
                'cloudrouter.console.catalog.title': '模型与定价',
              },
            ),
          ),
        ),
      );

      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(4));
      expect(find.text('用量'), findsOneWidget);

      // Every destination carries an outline/filled pair of the same glyph;
      // the selected destination (usage, index 1) renders the filled variant.
      final destinations = tester
          .widgetList<NavigationDestination>(find.byType(NavigationDestination))
          .toList();
      for (final destination in destinations) {
        final outline = destination.icon as ConsoleTabGlyphIcon;
        final filled = destination.selectedIcon as ConsoleTabGlyphIcon;
        expect(outline.filled, isFalse);
        expect(filled.filled, isTrue);
        expect(outline.glyph, filled.glyph);
      }
      final rendered = tester.widgetList<ConsoleTabGlyphIcon>(find.byType(ConsoleTabGlyphIcon)).toList();
      expect(rendered.length, 4);
      expect(rendered.where((icon) => icon.filled).length, 1);
      expect(rendered.where((icon) => !icon.filled).length, 3);
      expect(rendered.firstWhere((icon) => icon.filled).glyph, ConsoleTabGlyph.receipt);
    });
  });

  group('ConsoleSignInScreen', () {
    testWidgets('surfaces the declared transport gap verbatim', (tester) async {
      final copy = SdkworkCloudRouterMessages.signInCopy(SdkworkCloudRouterLocale.enUs);
      await tester.pumpWidget(
        MaterialApp(
          home: ConsoleSignInScreen(
            copy: copy,
            onSubmit: (account, password) async {
              throw UnsupportedError('declared transport gap');
            },
          ),
        ),
      );

      await tester.enterText(find.byType(TextField).first, 'user@example.com');
      await tester.enterText(find.byType(TextField).last, 'secret');
      await tester.tap(find.byType(FilledButton));
      await tester.pump();

      expect(find.text(copy.transportGap), findsOneWidget);
    });
  });
}
