import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sdkwork_agents_app_sdk/sdkwork_agents_app_sdk.dart';
import 'package:sdkwork_agents_flutter_mobile_conversation/sdkwork_agents_flutter_mobile_conversation.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_messages/sdkwork_cloudrouter_flutter_mobile_console_messages.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_playground/sdkwork_cloudrouter_flutter_mobile_console_playground.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_profile/sdkwork_cloudrouter_flutter_mobile_console_profile.dart';

/// Store and catalog media capture.
///
/// Every image under `assets/media/store/screenshots/` is rendered from a
/// shipped console screen with a deterministic in-memory repository. The
/// viewport and device pixel ratio are the canonical capture surfaces from
/// `APP_ASSETS_SPEC.md` (the same numbers `bootstrap-app-assets.mjs` emits):
///
///  - iOS / App Store shelf: 440 x 956 logical at 3x -> 1320 x 2868 px
///  - Android shelf:         540 x 960 logical at 2x -> 1080 x 1920 px
///  - HarmonyOS shelf:       540 x 960 logical at 2x -> 1080 x 1920 px
///  - Generic mobile shelf:  390 x 844 logical at 3x -> 1170 x 2532 px
///
/// Regenerate with (never run in a normal `flutter test` pass):
///   node scripts/capture-store-media.mjs
///   node scripts/promote-store-media.mjs   # after reviewing the raw captures
///
/// The capture writes raw bytes under `STORE_CAPTURE_DIR` (default
/// `.sdkwork/tmp/assets-capture`) and never into `assets/media/`: promotion is
/// a separate reviewed step, as `APP_ASSETS_SPEC.md` section 6.2 requires.
void main() {
  final String? captureDir = Platform.environment['STORE_CAPTURE_DIR'];
  final bool writeAssets = captureDir != null && captureDir.trim().isNotEmpty;

  setUpAll(() async {
    await _loadCaptureFont();
  });

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  for (final family in _captureFamilies) {
    group('${family.id} store media', () {
      for (final screen in _screens) {
        testWidgets('${family.id} ${screen.id}', (tester) async {
          await _pumpAtCaptureSize(tester, family, screen);
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(_captureKey(family)),
          );
          final ByteData? bytes = await tester.runAsync<ByteData?>(() async {
            final ui.Image image = await boundary.toImage(
              pixelRatio: family.devicePixelRatio,
            );
            try {
              expect(image.width, family.expectedWidth);
              expect(image.height, family.expectedHeight);
              return await image.toByteData(format: ui.ImageByteFormat.png);
            } finally {
              image.dispose();
            }
          });
          expect(bytes, isNotNull);
          if (writeAssets) {
            final File file = File(
              '$captureDir/screenshots/${family.id}/${screen.id}.png',
            );
            file.parent.createSync(recursive: true);
            file.writeAsBytesSync(bytes!.buffer.asUint8List());
          }
        });
      }
    });
  }
}

/// One canonical capture viewport.
class _CaptureFamily {
  const _CaptureFamily({
    required this.id,
    required this.width,
    required this.height,
    required this.devicePixelRatio,
  });

  final String id;
  final double width;
  final double height;
  final double devicePixelRatio;

  int get expectedWidth => (width * devicePixelRatio).round();
  int get expectedHeight => (height * devicePixelRatio).round();
}

/// One shipped console screen captured for the store shelves.
class _CaptureScreen {
  const _CaptureScreen({
    required this.id,
    required this.build,
    this.afterPump,
  });

  final String id;
  final Widget Function() build;
  final Future<void> Function(WidgetTester tester)? afterPump;
}

const List<_CaptureFamily> _captureFamilies = <_CaptureFamily>[
  _CaptureFamily(id: 'ios', width: 440, height: 956, devicePixelRatio: 3),
  _CaptureFamily(id: 'android', width: 540, height: 960, devicePixelRatio: 2),
  _CaptureFamily(id: 'harmony', width: 540, height: 960, devicePixelRatio: 2),
  _CaptureFamily(id: 'mobile', width: 390, height: 844, devicePixelRatio: 3),
];

final List<_CaptureScreen> _screens = <_CaptureScreen>[
  _CaptureScreen(
    id: 'home',
    build: () => Scaffold(body: ConsoleHomeScreen(onNavigate: (_) {})),
  ),
  _CaptureScreen(
    id: 'messages',
    build: () => Scaffold(body: ConsoleMessagesScreen(repository: _InboxRepository())),
  ),
  _CaptureScreen(
    id: 'playground',
    build: () => ConsolePlaygroundScreen(
      client: SdkworkAppClient.withBaseUrl(baseUrl: 'http://127.0.0.1:3905'),
      service: _PlaygroundService(),
    ),
  ),
  _CaptureScreen(
    id: 'profile',
    build: () => const Scaffold(body: ConsoleProfileScreen()),
  ),
  _CaptureScreen(
    id: 'settings',
    build: () => const Scaffold(body: ConsoleProfileScreen()),
    afterPump: (tester) async {
      await tester.tap(find.text('设置'));
      await tester.pumpAndSettle();
    },
  ),
];

Key _captureKey(_CaptureFamily family) => ValueKey<String>('store-capture-${family.id}');

bool _captureFontLoaded = false;

/// Loads a real CJK font as the Material fallback.
///
/// `flutter test` ships a glyph-less test font, so a raw widget-test capture
/// renders every character as a box. The capture shelf must show the shipped
/// copy, so the biggest available Noto Sans SC face is registered as the
/// Material family; on a host without it the test still runs and only the
/// reprojection of already-authored assets is blocked.
Future<void> _loadCaptureFont() async {
  if (_captureFontLoaded) {
    return;
  }
  await _registerFontFamily(
    family: 'Roboto',
    candidates: const <String>[
      r'C:\Windows\Fonts\Noto Sans SC (TrueType).otf',
      r'C:\Windows\Fonts\NotoSansSC-VF.ttf',
      r'C:\Windows\Fonts\simhei.ttf',
      '/System/Library/Fonts/PingFang.ttc',
    ],
  );
  await _registerFontFamily(
    family: 'MaterialIcons',
    candidates: _materialIconFontCandidates(),
  );
  _captureFontLoaded = true;
}

/// Registers the first available candidate as one font family.
Future<void> _registerFontFamily({
  required String family,
  required List<String> candidates,
}) async {
  final String path = candidates.firstWhere(
    (String candidate) => File(candidate).existsSync(),
    orElse: () => '',
  );
  if (path.isEmpty) {
    // ignore: avoid_print
    print('store media capture: no $family font found');
    return;
  }
  final Uint8List bytes = File(path).readAsBytesSync();
  final FontLoader loader = FontLoader(family)
    ..addFont(Future<ByteData>.value(ByteData.view(bytes.buffer)));
  await loader.load();
}

/// The Material icon font shipped with the active Flutter SDK.
List<String> _materialIconFontCandidates() {
  final String? flutterRoot = Platform.environment['FLUTTER_ROOT'];
  return <String>[
    if (flutterRoot != null && flutterRoot.isNotEmpty)
      '$flutterRoot/bin/cache/artifacts/material_fonts/materialicons-regular.otf',
    r'D:\programs\flutter\bin\cache\artifacts\material_fonts\materialicons-regular.otf',
    '/opt/flutter/bin/cache/artifacts/material_fonts/materialicons-regular.otf',
  ];
}

Future<void> _pumpAtCaptureSize(
  WidgetTester tester,
  _CaptureFamily family,
  _CaptureScreen screen,
) async {
  tester.view.devicePixelRatio = family.devicePixelRatio;
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.binding.setSurfaceSize(Size(family.width, family.height));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    // The boundary wraps the whole app, so a captured screen that pushes a
    // route (Settings) is still painted inside it.
    RepaintBoundary(
      key: _captureKey(family),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: buildSdkworkCloudRouterTheme(),
        home: screen.build(),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await screen.afterPump?.call(tester);
}

class _InboxRepository implements ConsoleMessagesRepository {
  @override
  Future<List<ConsoleConversation>> loadConversations() async =>
      const <ConsoleConversation>[
        ConsoleConversation(id: '1', title: '设计助手', summary: '方案已更新', unreadCount: 2),
        ConsoleConversation(id: '2', title: '运维告警', summary: 'CPU 使用率 82%', unreadCount: 0),
        ConsoleConversation(id: '3', title: '产品讨论', summary: '明天同步', unreadCount: 1),
      ];

  @override
  Future<List<ConsoleMessage>> loadMessages(String conversationId) async =>
      const <ConsoleMessage>[];

  @override
  Future<void> sendText(String conversationId, String text) async {}
}

class _PlaygroundService implements AgentsConversationService {
  @override
  Future<String> resolveDefaultModel({String? preferred}) async => 'gpt-5';

  @override
  Future<List<AgentsConversationSession>> listSessions() async =>
      const <AgentsConversationSession>[];

  @override
  Future<AgentsConversationSession> createSession(String title) async {
    throw UnimplementedError();
  }

  @override
  Future<void> renameSession(String sessionId, String title) async {}

  @override
  Future<void> deleteSession(String sessionId) async {}

  @override
  Future<AgentsConversationMessagePage> listMessages(
    String sessionId, {
    String? cursor,
  }) async {
    return const AgentsConversationMessagePage(items: [], hasMore: false);
  }

  @override
  Future<AgentsConversationTurnResult> streamTurn(
    AgentsConversationTurnInput input,
    AgentsConversationStreamHandlers handlers,
  ) async {
    throw UnimplementedError();
  }
}
