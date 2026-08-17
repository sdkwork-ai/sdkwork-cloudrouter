import {
  publicApiReferenceMessages,
  publicDocsMessages,
  publicSdkReferenceMessages,
} from '@sdkwork/documents-pc-i18n';
import { sdkworkSubscriptionCheckoutI18nBundle } from '@sdkwork/membership-pc-subscription/catalog';
import {
  upstreamAccountGroupMessages,
  upstreamAccountMessages,
  upstreamSharedMessages,
  upstreamSupplierMessages,
} from '@sdkwork/cloudrouter-pc-admin-upstream/i18n';
import { pricingAdminMessages } from '@sdkwork/cloudrouter-pc-admin-pricing/i18n';
import { adminPartnerMessages } from '@sdkwork/partner-pc-admin-partner/i18n';
import { adminCommissionMessages } from '@sdkwork/partner-pc-admin-commission/i18n';
import { adminWithdrawalMessages } from '@sdkwork/partner-pc-admin-withdrawal/i18n';
import { adminStatsMessages } from '@sdkwork/partner-pc-admin-stats/i18n';
import { partnerJoinMessages } from '@sdkwork/partner-pc-join/i18n';
import { cloudRouterIamAdminMessages } from '@sdkwork/cloudrouter-pc-admin-iam/i18n';
import { cloudRouterRtcAdminMessages } from '@sdkwork/cloudrouter-pc-admin-rtc/i18n';
import { rtcAdminMessages } from '@sdkwork/rtc-pc-admin-core/i18n';
import { adminOrdersMessages } from '@sdkwork/order-pc-admin-orders/i18n';
import { adminTradeMessages } from '@sdkwork/order-pc-admin-trade/i18n';
import { messagingNotifyAdminMessages } from '@sdkwork/messaging-pc-admin-notify/i18n';
import { logAdminI18n } from '@sdkwork/log-pc-admin-request-log/i18n';
import { mergeI18nBundles } from './merge';
import { adminAnalyticsRecordMessages } from './admin/analytics-record';
import { adminAuthSettingsMessages } from './admin/auth-settings';
import { adminBusinessManagementMessages } from './admin/business-management';
import { adminCacheMessages } from './admin/cache';
import { adminCoreColumnsMessages } from './admin/core-columns';
import { adminCoreNavigationMessages } from './admin/core-navigation';
import { adminDashboardMessages } from './admin/dashboard';
import { adminMarketingMessages } from './admin/marketing';
import { adminMarketingReferralsMessages } from './admin/marketing-referrals';
import { adminPartnerMessages as adminPartnerShellMessages } from './admin/partner';
import { adminMembershipsMessages } from './admin/memberships';
import { adminCommunityMessages } from './admin/community';
import { adminMiscMessages } from './admin/misc';
import { adminModelMessages } from './admin/model';
import { adminMonitorMessages } from './admin/monitor';
import { adminPaymentsMessages } from './admin/payments';
import { adminPaymentsHelpMessages } from './admin/payments-help';
import { adminRateLimitMessages } from './admin/rate-limit';
import { adminRuntimeRegionMessages } from './admin/runtime-region';
import { adminServiceNodesMessages } from './admin/service-nodes';
import { adminSiteSettingsMessages } from './admin/site-settings';
import { adminStorageMessages } from './admin/storage';
import { consoleAccountMessages } from './console/account';
import { consoleApiKeysMessages } from './console/api-keys';
import { consoleBillingMessages } from './console/billing';
import { consoleCoreMessages } from './console/core';
import { consoleDashboardMessages } from './console/dashboard';
import { consoleGatewayMessages } from './console/gateway';
import { consoleMembershipsMessages } from './console/memberships';
import { consoleMessagesMessages } from './console/messages';
import { consoleRechargeMessages } from './console/recharge';
import { consoleSettingsMessages } from './console/settings';
import { consoleSettlementsMessages } from './console/settlements';
import { consoleUsageMessages } from './console/usage';
import { backendErrorMessages } from './errors';
import { playgroundAssetsMessages } from './playground/assets';
import { playgroundChatMessages } from './playground/chat';
import { playgroundCoreMessages } from './playground/core';
import { playgroundFiltersMessages } from './playground/filters';
import { playgroundGenerationMessages } from './playground/generation';
import { playgroundInputMessages } from './playground/input';
import { playgroundModalitiesMessages } from './playground/modalities';
import { playgroundPreviewMessages } from './playground/preview';
import { publicModelsMessages } from './public/models';
import { publicRankingsMessages } from './public/rankings';
import { pricingMessages } from '@sdkwork/cloudrouter-pc-pricing/i18n';
import { sharedCommonMessages } from './shared/common';
import { sharedNavigationMessages } from './shared/navigation';

export const resources = mergeI18nBundles([
  messagingNotifyAdminMessages,
  adminAnalyticsRecordMessages,
  adminAuthSettingsMessages,
  adminBusinessManagementMessages,
  adminCacheMessages,
  adminCoreColumnsMessages,
  adminCoreNavigationMessages,
  adminDashboardMessages,
  adminMarketingMessages,
  adminMarketingReferralsMessages,
  adminPartnerShellMessages,
  adminPartnerMessages,
  adminCommissionMessages,
  adminWithdrawalMessages,
  adminStatsMessages,
  partnerJoinMessages,
  adminMembershipsMessages,
  adminCommunityMessages,
  adminMiscMessages,
  adminModelMessages,
  adminMonitorMessages,
  adminPaymentsMessages,
  adminPaymentsHelpMessages,
  adminRateLimitMessages,
  adminRuntimeRegionMessages,
  adminServiceNodesMessages,
  adminSiteSettingsMessages,
  adminStorageMessages,
  backendErrorMessages,
  upstreamSharedMessages,
  upstreamSupplierMessages,
  upstreamAccountMessages,
  upstreamAccountGroupMessages,
  pricingAdminMessages,
  cloudRouterIamAdminMessages,
  cloudRouterRtcAdminMessages,
  rtcAdminMessages,
  adminOrdersMessages,
  adminTradeMessages,
  logAdminI18n,
  consoleAccountMessages,
  consoleApiKeysMessages,
  consoleBillingMessages,
  consoleCoreMessages,
  consoleDashboardMessages,
  consoleGatewayMessages,
  consoleMembershipsMessages,
  consoleMessagesMessages,
  consoleRechargeMessages,
  consoleSettingsMessages,
  consoleSettlementsMessages,
  consoleUsageMessages,
  playgroundAssetsMessages,
  playgroundChatMessages,
  playgroundCoreMessages,
  playgroundFiltersMessages,
  playgroundGenerationMessages,
  playgroundInputMessages,
  playgroundModalitiesMessages,
  playgroundPreviewMessages,
  publicApiReferenceMessages,
  publicDocsMessages,
  publicModelsMessages,
  publicRankingsMessages,
  pricingMessages,
  publicSdkReferenceMessages,
  sharedCommonMessages,
  sharedNavigationMessages,
  sdkworkSubscriptionCheckoutI18nBundle,
]);
