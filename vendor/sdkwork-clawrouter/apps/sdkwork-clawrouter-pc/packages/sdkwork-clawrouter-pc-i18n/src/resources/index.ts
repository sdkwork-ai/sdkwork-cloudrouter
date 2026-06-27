import {
  publicApiReferenceMessages,
  publicDocsMessages,
  publicSdkReferenceMessages,
} from '@sdkwork/documents-pc-i18n';
import { mergeI18nBundles } from './merge';
import { adminCommerceCatalogMessages } from './admin-commerce/catalog';
import { adminCommerceFinanceMessages } from './admin-commerce/finance';
import { adminCommerceInventoryMessages } from './admin-commerce/inventory';
import { adminCommerceMarketingMessages } from './admin-commerce/marketing';
import { adminCommerceMembershipsMessages } from './admin-commerce/memberships';
import { adminCommerceOrdersMessages } from './admin-commerce/orders';
import { adminCommercePaymentsMessages } from './admin-commerce/payments';
import { adminCommerceVipMessages } from './admin-commerce/vip';
import { adminCommerceWalletMessages } from './admin-commerce/wallet';
import { adminAnalyticsRecordMessages } from './admin/analytics-record';
import { adminAnnouncementMessages } from './admin/announcement';
import { adminAuthSettingsMessages } from './admin/auth-settings';
import { adminCacheMessages } from './admin/cache';
import { adminChannelMessages } from './admin/channel';
import { adminChannelResourceRoutingMessages } from './admin/channel-resource-routing';
import { adminCoreColumnsMessages } from './admin/core-columns';
import { adminCoreNavigationMessages } from './admin/core-navigation';
import { adminDashboardMessages } from './admin/dashboard';
import { adminFilePlatformMessages } from './admin/file-platform';
import { adminFinanceMessages } from './admin/finance';
import { adminGroupUserMessages } from './admin/group-user';
import { adminMiscMessages } from './admin/misc';
import { adminModelMessages } from './admin/model';
import { adminMcpMessages } from './admin/mcp';
import { adminOAuthBlueprintMessages } from './admin/oauth-blueprints';
import { adminOAuthMessages } from './admin/oauth';
import { adminOrganizationMessages } from './admin/organization';
import { adminPromptsMessages } from './admin/prompts';
import { adminRateLimitMessages } from './admin/rate-limit';
import { adminRuntimeRegionMessages } from './admin/runtime-region';
import { adminServiceNodesMessages } from './admin/service-nodes';
import { adminServiceProviderMessages } from './admin/service-provider';
import { adminSiteSettingsMessages } from './admin/site-settings';
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
import { sharedCommonMessages } from './shared/common';
import { sharedNavigationMessages } from './shared/navigation';

export const resources = mergeI18nBundles([
  adminCommerceCatalogMessages,
  adminCommerceFinanceMessages,
  adminCommerceInventoryMessages,
  adminCommerceMarketingMessages,
  adminCommerceMembershipsMessages,
  adminCommerceOrdersMessages,
  adminCommercePaymentsMessages,
  adminCommerceVipMessages,
  adminCommerceWalletMessages,
  adminAnalyticsRecordMessages,
  adminAnnouncementMessages,
  adminAuthSettingsMessages,
  adminCacheMessages,
  adminChannelMessages,
  adminChannelResourceRoutingMessages,
  adminCoreColumnsMessages,
  adminCoreNavigationMessages,
  adminDashboardMessages,
  adminFilePlatformMessages,
  adminFinanceMessages,
  adminGroupUserMessages,
  adminMiscMessages,
  adminModelMessages,
  adminMcpMessages,
  adminOAuthBlueprintMessages,
  adminOAuthMessages,
  adminOrganizationMessages,
  adminPromptsMessages,
  adminRateLimitMessages,
  adminRuntimeRegionMessages,
  adminServiceNodesMessages,
  adminServiceProviderMessages,
  adminSiteSettingsMessages,
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
  publicSdkReferenceMessages,
  sharedCommonMessages,
  sharedNavigationMessages,
]);
