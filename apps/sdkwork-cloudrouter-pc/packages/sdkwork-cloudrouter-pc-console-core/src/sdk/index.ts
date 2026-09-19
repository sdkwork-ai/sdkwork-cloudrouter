export { getCloudRouterAppSdkClient, getModelsAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
// Generated-SDK *client ports* re-exported through this core barrel so that
// capability packages (`console-*`) never import a generated SDK module
// directly (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md `Dependency direction`:
// "capability packages do not import generated SDK packages directly").
export type {
  CloudRouterAppSdkClient,
  ModelsAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
export type {
  AiUsageLogsListParams,
  AiGatewayTracesListParams,
  AppApiKeyListResponse,
  CreateApiKeyRequest,
  DashboardConfigurationDomain,
  DashboardOverviewResponse,
  GatewayTrace,
  GatewayTracesPage,
  PageInfo,
  SettingsDataResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  UpdateApiKeyRequest,
  UsageLogItem,
  UsageLogsResponse,
} from '@sdkwork/cloudrouter-app-sdk';
