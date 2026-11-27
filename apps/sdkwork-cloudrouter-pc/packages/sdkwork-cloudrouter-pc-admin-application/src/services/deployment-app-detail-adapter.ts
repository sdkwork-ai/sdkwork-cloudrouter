/**
 * Cloud Router host adapter for the deployment-application detail surface.
 *
 * The surface belongs to the `deployment` domain repository
 * (`@sdkwork/deployments-pc-admin-app-detail`), because a deployment application
 * is that domain's resource. This module is the only place in the Cloud Router
 * console that knows *which* SDK clients back it: the surface defines call
 * shapes, and this adapter supplies them from the portal's own injected clients
 * (`@sdkwork/cloudroutes-pc-commons/runtime`), which resolve base URLs,
 * credentials, and locale for this application.
 *
 * Keeping the mapping here — rather than inside the surface — is what lets a
 * second console reuse the same page: it implements the same port against its own
 * clients and passes it in.
 */
import {
  getCloudRouterAppSdkClient,
  getCloudRouterBackendSdkClient,
  getSdkworkDeploymentsAppSdkClient,
} from "@sdkwork/cloudroutes-pc-commons/runtime";
import {
  loadApplicationUsage,
  loadDeployApplicationDetail,
  type ApplicationUsageTransport,
  type DeploymentApplicationDetailDataSource,
  type DeploymentApplicationDetailReadQuery,
  type DeployApplicationDetailTransport,
} from "@sdkwork/deployments-pc-admin-app-detail";

/**
 * The transport graph both reads share.
 *
 * One object carries both shapes because they address the same deploy app client;
 * the surface splits them into the delivery read and the usage read, which is
 * where their semantics differ.
 */
type CloudRouterDetailTransport = DeployApplicationDetailTransport & ApplicationUsageTransport;

function createCloudRouterDetailTransport(): CloudRouterDetailTransport {
  return {
    async listDeployments(appId, input) {
      return getSdkworkDeploymentsAppSdkClient().deployment.list(appId, input);
    },
    async listDomains(appId) {
      return getSdkworkDeploymentsAppSdkClient().app.domains.list(appId);
    },
    async listPackages(appId, input) {
      return getSdkworkDeploymentsAppSdkClient().package.list(appId, input);
    },
    async listReleases(appId, input) {
      return getSdkworkDeploymentsAppSdkClient().release.list(appId, input);
    },
    async listStorageQuotas(input) {
      return getCloudRouterBackendSdkClient().storage.oss.quotas.list({ pageSize: input.pageSize });
    },
    async listStorageUsage(input) {
      return getCloudRouterBackendSdkClient().storage.oss.usage.list({ pageSize: input.pageSize });
    },
    async listUsageEvents(input) {
      return getSdkworkDeploymentsAppSdkClient().usage.usageEvents.list(input);
    },
    async retrieveApp(appId) {
      return getSdkworkDeploymentsAppSdkClient().app.retrieve(appId);
    },
    async retrieveReadiness(appId) {
      return getSdkworkDeploymentsAppSdkClient().app.readiness.retrieve(appId);
    },
    async retrieveRoutingUsage() {
      return getCloudRouterAppSdkClient().ai.routing.usage.retrieve();
    },
  };
}

/**
 * The data source the detail surface renders from.
 *
 * The fact sheet and the metering are two different reads on purpose: one is
 * independent of the selected window, the other is not, so the page can refresh
 * either without re-reading the other.
 */
export function createCloudRouterDeploymentApplicationDetailDataSource(): DeploymentApplicationDetailDataSource {
  return {
    async loadDetail({ appId }) {
      return loadDeployApplicationDetail({ appId, transport: createCloudRouterDetailTransport() });
    },
    async loadUsage(query: DeploymentApplicationDetailReadQuery) {
      return loadApplicationUsage({ ...query, transport: createCloudRouterDetailTransport() });
    },
  };
}
