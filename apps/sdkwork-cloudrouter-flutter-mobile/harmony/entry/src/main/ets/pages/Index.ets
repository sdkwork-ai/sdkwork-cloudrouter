import { FlutterPage } from '@ohos/flutter_ohos';

/**
 * The single HarmonyOS page: it hosts the Flutter view supplied by the
 * OpenHarmony Flutter engine. All navigation stays inside the Dart app.
 */
@Entry
@Component
struct Index {
  private viewId: string = 'flutter_view';

  build() {
    Stack() {
      FlutterPage({ viewId: this.viewId })
    }
    .width('100%')
    .height('100%')
  }
}
