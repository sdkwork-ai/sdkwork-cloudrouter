/**
 * Domain-neutral empty-state primitive.
 */
@Component
export struct EmptyState {
  @Prop message: string = '';

  build() {
    Column() {
      Text(this.message)
        .fontSize(14)
        .fontColor('#64748B')
    }
    .width('100%')
    .padding(24)
    .justifyContent(FlexAlign.Center)
  }
}
