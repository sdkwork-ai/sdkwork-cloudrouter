import { getCloudRouterHarmonySdkClients } from '../bootstrap/SdkClients';

/**
 * Root page.
 *
 * The root page stays a thin shell mount point. Real console screens are
 * contributed by capability packages
 * (`packages/sdkwork-cloudrouter-harmony-mobile-console-dashboard` and siblings).
 */
@Entry
@Component
struct Index {
  @State message: string = 'SDKWork CloudRouter';

  aboutToAppear(): void {
    getCloudRouterHarmonySdkClients();
  }

  build() {
    Column() {
      Text(this.message)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
      Text('Console shell mount point')
        .fontSize(14)
        .fontColor('#64748B')
        .margin({ top: 8 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
