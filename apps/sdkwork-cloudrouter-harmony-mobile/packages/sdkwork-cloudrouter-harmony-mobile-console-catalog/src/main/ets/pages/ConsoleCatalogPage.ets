import { EmptyState, ErrorState } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-commons';
import { consoleCatalogMessagesEnUs, consoleCatalogMessagesZhCn } from '../i18n/ConsoleCatalogMessages';
import { type ConsoleCatalogScreenModel } from '../models/ConsoleCatalogModels';

/**
 * Route-level capability page. Root pages mount this; business UI lives here.
 *
 * Screen bodies render loading, error, empty, and data states explicitly so a
 * missing transport surfaces as an empty state instead of fabricated data.
 */
@Component
export struct ConsoleCatalogPage {
  @Prop model: ConsoleCatalogScreenModel;
  @Prop locale: string = 'en-US';

  private get copy(): Record<string, string> {
    return this.locale.toLowerCase().startsWith('zh')
      ? consoleCatalogMessagesZhCn
      : consoleCatalogMessagesEnUs;
  }

  build() {
    Column() {
      Text(this.copy['cloudrouter.console.catalog.title'])
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 16 })
      if (this.model.loading) {
        LoadingProgress().width(32).height(32);
      } else if (this.model.errorMessage !== undefined) {
        ErrorState({ message: this.model.errorMessage })
      } else if (this.model.items.length === 0) {
        EmptyState({ message: this.copy.empty })
      } else {
        Text(this.copy.modelsLoaded + ': ' + this.model.items.length)
          .fontSize(16)
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
