import { useCallback, useMemo, useState, type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DeploymentApplicationDetailPage,
  type DeploymentApplicationDetailCapabilityPort,
  type DeploymentApplicationDetailDataSource,
  type DeployApplicationDetail,
} from "@sdkwork/deployments-pc-admin-app-detail";

import { ApplicationIntegrationDrawer } from "../components/ApplicationIntegrationDrawer";
import { AppSourceRemixDrawer } from "../components/AppSourceRemixDrawer";
import { useApplicationCatalogMessages } from "../i18n";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import { normalizeDeployOwnershipScope } from "../services/deploy-application-filter";
import { createCloudRouterDeploymentApplicationDetailDataSource } from "../services/deployment-app-detail-adapter";
import { getApplicationIntegrationService } from "../services/application-integrations";
import type { ApplicationRecord } from "../types/application-catalog";
import type {
  ApplicationIntegrationKind,
  ApplicationIntegrationSaveResult,
} from "../types/application-integrations";

const APPLICATION_CENTER_LIST = "/admin/applications/deploy";

/**
 * Map the domain surface's fact sheet onto this console's application record.
 *
 * The surface is console-neutral on purpose; this is the one place that ties it
 * back to the record shape the two Cloud Router drawers already consume.
 */
function toCatalogRecord(detail: DeployApplicationDetail): ApplicationRecord {
  const ownershipScope = normalizeDeployOwnershipScope(detail.ownershipScope ?? detail.ownerType);
  return {
    ...(detail.defaultEnvironment ? { environment: detail.defaultEnvironment } : {}),
    groupId: "deploy",
    id: detail.id,
    kind: detail.appKind,
    metadata: { ...detail.metadata },
    name: detail.name,
    ...(detail.organizationId ? { organizationId: detail.organizationId } : {}),
    ...(ownershipScope ? { ownershipScope } : {}),
    ...(detail.slug ? { reference: detail.slug } : {}),
    status: detail.appStatus,
    ...(detail.updatedAt ? { updatedAt: detail.updatedAt } : {}),
  };
}

/**
 * Cloud Router entry for the deployment-application detail surface.
 *
 * The page belongs to `@sdkwork/deployments-pc-admin-app-detail` so any console
 * can reuse it. What stays here is exactly what is Cloud Router's own: the route
 * param, the back target, this application's permission scope, its SDK-backed
 * data source, and the two drawers this console already owns (application
 * configuration and source/remix), which the detail surface opens as host
 * capabilities.
 */
export const CloudRouterDeployApplicationDetailPage: ComponentType =
  function CloudRouterDeployApplicationDetailPageEntry() {
    const { appId } = useParams<{ appId?: string }>();
    const navigate = useNavigate();
    const catalogMessages = useApplicationCatalogMessages();
    const [integrationKind, setIntegrationKind] = useState<ApplicationIntegrationKind>();
    const [sourceOpen, setSourceOpen] = useState(false);
    const [detail, setDetail] = useState<DeployApplicationDetail>();

    // The drawers address the deploy application through this console's own
    // record shape. The fact sheet already carries every field it needs, so it is
    // captured from the read instead of being fetched a second time.
    const baseDataSource = useMemo(
      () => createCloudRouterDeploymentApplicationDetailDataSource(),
      [],
    );
    const dataSource: DeploymentApplicationDetailDataSource = useMemo(
      () => ({
        async loadDetail(query) {
          const result = await baseDataSource.loadDetail(query);
          setDetail(result.detail);
          return result;
        },
        ...(baseDataSource.loadUsage ? { loadUsage: baseDataSource.loadUsage } : {}),
      }),
      [baseDataSource],
    );

    const backTo = APPLICATION_CENTER_LIST;
    const onBack = useCallback(() => navigate(backTo), [backTo, navigate]);

    if (!appId) {
      return null;
    }

    const canReadSource = isApplicationCenterActionAllowed("sourceRead");
    const canWriteSource = isApplicationCenterActionAllowed("sourceWrite");
    const record = detail ? toCatalogRecord(detail) : undefined;

    const capabilities: DeploymentApplicationDetailCapabilityPort = {
      openAccessToken: (id) =>
        navigate(`${backTo}?detail=${encodeURIComponent(id)}&action=access-token`),
      openConfiguration: () => setIntegrationKind("official-account"),
      openKindCorrection: (id) =>
        navigate(`${backTo}?detail=${encodeURIComponent(id)}&action=correct-kind`),
      openSource: () => setSourceOpen(true),
    };

    const handleIntegrationSaved = (_result: ApplicationIntegrationSaveResult) => {
      // The drawer persists the binding document itself; the surface re-reads the
      // fact sheet on the next refresh, so nothing here holds a stale copy.
    };

    return (
      <>
        <DeploymentApplicationDetailPage
          appId={appId}
          backTo={backTo}
          capabilities={capabilities}
          dataSource={dataSource}
          onBack={onBack}
          permissions={{ sourceRead: () => canReadSource, sourceWrite: () => canWriteSource }}
        />
        {integrationKind && record ? (
          <ApplicationIntegrationDrawer
            application={record}
            deployApplications={[record]}
            kind={integrationKind}
            messages={catalogMessages}
            onClose={() => setIntegrationKind(undefined)}
            onSaved={handleIntegrationSaved}
            service={getApplicationIntegrationService()}
          />
        ) : null}
        {sourceOpen && record ? (
          <AppSourceRemixDrawer
            application={record}
            canRead={canReadSource}
            canWrite={canWriteSource}
            messages={catalogMessages}
            onClose={() => setSourceOpen(false)}
          />
        ) : null}
      </>
    );
  };
