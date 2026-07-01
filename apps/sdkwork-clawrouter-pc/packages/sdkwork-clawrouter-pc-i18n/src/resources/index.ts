import {
  publicApiReferenceMessages,
  publicDocsMessages,
  publicSdkReferenceMessages,
} from '@sdkwork/documents-pc-i18n';
import { mergeI18nBundles } from './merge';
import { adminAnalyticsRecordMessages } from './admin/analytics-record';
import { adminAuthSettingsMessages } from './admin/auth-settings';
import { adminCacheMessages } from './admin/cache';
import { adminChannelMessages } from './admin/channel';
import { adminChannelResourceRoutingMessages } from './admin/channel-resource-routing';
import { adminCoreColumnsMessages } from './admin/core-columns';
import { adminCoreNavigationMessages } from './admin/core-navigation';
import { adminDashboardMessages } from './admin/dashboard';
import { adminGroupUserMessages } from './admin/group-user';
import { adminMiscMessages } from './admin/misc';
import { adminModelMessages } from './admin/model';
import { adminRateLimitMessages } from './admin/rate-limit';
import { adminRuntimeRegionMessages } from './admin/runtime-region';
import { adminServiceNodesMessages } from './admin/service-nodes';
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
  adminAnalyticsRecordMessages,
  adminAuthSettingsMessages,
  adminCacheMessages,
  adminChannelMessages,
  adminChannelResourceRoutingMessages,
  adminCoreColumnsMessages,
  adminCoreNavigationMessages,
  adminDashboardMessages,
  adminGroupUserMessages,
  adminMiscMessages,
  adminModelMessages,
  adminRateLimitMessages,
  adminRuntimeRegionMessages,
  adminServiceNodesMessages,
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
