import { EmptyState, ErrorState } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-commons';
import { consoleApiKeysMessagesEnUs, consoleApiKeysMessagesZhCn } from '../i18n/ConsoleApiKeysMessages';
import { type ConsoleApiKeysScreenModel } from '../models/ConsoleApiKeysModels';

/**
 * Route-level capability page. Root pages mount this; business UI lives here.
 *
 * Screen bodies render loading, error, empty, and data states explicitly so a
 * missing transport surfaces as an empty state instead of fabricated data.
 */
@Component
export struct ConsoleApiKeysPage {
  @Prop model: ConsoleApiKeysScreenModel;
  @Prop locale: string = 'en-US';

  private get copy(): Record<string, string> {
    return this.locale.toLowerCase().startsWith('zh')
      ? consoleApiKeysMessagesZhCn
      : consoleApiKeysMessagesEnUs;
  }

  build() {
    Column() {
      Text(this.copy['cloudrouter.console.apiKeys.title'])
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 16 })
      if (this.model.loading) {
        LoadingProgress().width(32).height(32);
      } else if (this.model.errorMessage !== undefined) {
        ErrorState({ message: this.model.errorMessage })
      } else if (this.model.rows.length === 0) {
        EmptyState({ message: this.copy.empty })
      } else {
        Text(this.copy.keysLoaded + ': ' + this.model.rows.length)
          .fontSize(16)
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
