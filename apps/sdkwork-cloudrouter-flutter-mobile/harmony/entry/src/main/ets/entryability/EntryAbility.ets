import { FlutterAbility, FlutterEngine } from '@ohos/flutter_ohos';
import { GeneratedPluginRegistrant } from '../plugins/GeneratedPluginRegistrant';

/**
 * HarmonyOS entry ability.
 *
 * `flutter build hap` (OpenHarmony Flutter fork) compiles the Dart bundle and
 * embeds the Flutter engine as `ohos/har/flutter.har`. This class is the
 * device-side host: it configures the engine and lets the generated plugin
 * registrant attach the plugins declared in `pubspec.yaml`.
 */
export default class EntryAbility extends FlutterAbility {
  configureFlutterEngine(flutterEngine: FlutterEngine): void {
    super.configureFlutterEngine(flutterEngine);
    GeneratedPluginRegistrant.registerWith(flutterEngine);
  }
}
