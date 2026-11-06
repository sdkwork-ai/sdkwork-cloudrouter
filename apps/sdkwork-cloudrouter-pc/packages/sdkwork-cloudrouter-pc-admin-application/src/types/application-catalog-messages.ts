export interface ApplicationCatalogMessages {
  back: string;
  columns: {
    application: string;
    domain: string;
    environment: string;
    platform: string;
    scope: string;
    status: string;
    type: string;
    updatedAt: string;
    version: string;
  };
  countTemplate: string;
  emptyDescription: string;
  emptyTitle: string;
  groups: {
    appStore: { description: string; label: string };
    deploy: { description: string; label: string };
    iam: { description: string; label: string };
  };
  loadError: string;
  organizationAppStoreNotice: string;
  refresh: string;
  retry: string;
  scopes: { organization: string; tenant: string };
  searchPlaceholder: string;
  statuses: {
    active: string;
    archived: string;
    disabled: string;
    draft: string;
    enabled: string;
    installed: string;
    paused: string;
    pending_config: string;
    terminated: string;
    unknown: string;
  };
  subtitleOrganizationTemplate: string;
  subtitleTenantTemplate: string;
  title: string;
  unavailable: string;
}
