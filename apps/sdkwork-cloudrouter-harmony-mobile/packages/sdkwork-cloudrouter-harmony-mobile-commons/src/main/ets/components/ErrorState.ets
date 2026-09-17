/**
 * Domain-neutral error-state primitive with an optional retry action.
 */
@Component
export struct ErrorState {
  @Prop message: string = '';
  @Prop retryLabel: string = '';
  onRetry?: () => void = undefined;

  build() {
    Column() {
      Text(this.message)
        .fontSize(14)
        .fontColor('#B91C1C')
      if (this.retryLabel.length > 0) {
        Button(this.retryLabel)
          .margin({ top: 8 })
          .onClick(() => {
            if (this.onRetry !== undefined) {
              this.onRetry();
            }
          })
      }
    }
    .width('100%')
    .padding(24)
    .justifyContent(FlexAlign.Center)
  }
}
