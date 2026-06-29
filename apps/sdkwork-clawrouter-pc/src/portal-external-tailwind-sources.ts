/**
 * Tailwind v4 @source paths for workspace packages integrated into the Claw Router portal.
 * Keep in sync with ./index.css @source directives.
 */
export const PORTAL_EXTERNAL_TAILWIND_SOURCES = [
  '../packages',
  '../src',
  '../../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react/src',
  '../../../../sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-iam-react/src',
  '../../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src',
  '../../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src',
  '../../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-commons/src',
  '../../../../sdkwork-appbase/packages/pc-react/foundation/sdkwork-i18n-pc-react/src',
  '../../../../sdkwork-appbase/packages/pc-react/foundation/sdkwork-appbase-pc-react/src',
  '../../../../sdkwork-appbase/packages/pc-react/notification/sdkwork-notification-pc-react/src',
  '../../../../sdkwork-appbase/packages/pc-react/host/sdkwork-host-pc-react/src',
  '../../../../sdkwork-ui/sdkwork-ui-pc-react/src',
  '../../../../sdkwork-core/sdkwork-core-pc-react/src',
  '../../../packages/pc-react/commerce/*/src',
  '../../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/*/src',
  '../../../../sdkwork-image/apps/sdkwork-image-pc/packages/*/src',
  '../../../../sdkwork-models/apps/sdkwork-models-pc/packages/*/src',
  '../../../packages/pc-react/file/sdkwork-file-platform-pc-react/src',
] as const;
