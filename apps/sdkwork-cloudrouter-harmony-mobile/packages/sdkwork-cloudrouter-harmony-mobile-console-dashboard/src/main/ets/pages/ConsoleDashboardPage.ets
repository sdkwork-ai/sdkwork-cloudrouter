import { EmptyState, ErrorState } from '@sdkwork/sdkwork-cloudrouter-harmony-mobile-commons';
import { consoleDashboardMessagesEnUs, consoleDashboardMessagesZhCn } from '../i18n/ConsoleDashboardMessages';
import { type ConsoleDashboardScreenModel } from '../models/ConsoleDashboardModels';

/**
 * Route-level capability page. Root pages mount this; business UI lives here.
 *
 * Screen bodies render loading, error, empty, and data states explicitly so a
 * missing transport surfaces as an empty state instead of fabricated data.
 */
@Component
export struct ConsoleDashboardPage {
  @Prop model: ConsoleDashboardScreenModel;
  @Prop locale: string = 'en-US';

  private get copy(): Record<string, string> {
    return this.locale.toLowerCase().startsWith('zh')
      ? consoleDashboardMessagesZhCn
      : consoleDashboardMessagesEnUs;
  }

  build() {
    Column() {
      Text(this.copy['cloudrouter.console.dashboard.title'])
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 16 })
      if (this.model.loading) {
        LoadingProgress().width(32).height(32);
      } else if (this.model.errorMessage !== undefined) {
        ErrorState({ message: this.model.errorMessage })
      } else if (this.model.overview === null) {
        EmptyState({ message: this.copy.empty })
      } else {
        Text(this.copy.totalRequests + ': ' + this.model.overview.totalRequests)
          .fontSize(16)
        Text(this.copy.requestFailed)
          .fontSize(12)
          .fontColor('#64748B')
      }
    }
    .width('100%')
    .height('100%')
    .padding(16)
  }
}
