/**
 * Cloud Router H5 Messages adapter.
 *
 * Uses the SDKWork IM generated SDK (`@sdkwork/im-sdk`) conversation inbox and
 * message APIs with the Cloud Router dual-token session. The Cloud Router
 * mobile list/detail UI is kept so Messages follows the console theme; the IM
 * capability (inbox, history, send) is owned by `sdkwork-im`.
 */

export { MessagesScreen } from "./MessagesScreen";
export { MessagesDetailScreen } from "./MessagesDetailScreen";
export type { MessagesDetailScreenProps } from "./MessagesDetailScreen";
export {
  configureCloudRouterIm,
  getCloudRouterImClient,
  resetCloudRouterIm,
  resolveCloudRouterImBaseUrls,
} from "./configure";
