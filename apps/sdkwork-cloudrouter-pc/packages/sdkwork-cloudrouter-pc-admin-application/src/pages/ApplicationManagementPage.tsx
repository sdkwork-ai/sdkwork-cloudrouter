import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FolderTree,
  Layers,
  MessageCircle,
  RefreshCw,
  Search,
  Smartphone,
  Store,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  StatusBadge,
  StatusNotice,
  type StatusBadgeVariant,
} from "@sdkwork/ui-pc-react";

import {
  DeployApplicationFilters,
  type DeployOrganizationLookup,
} from "../components/DeployApplicationFilters";
import { ApplicationIntegrationDrawer } from "../components/ApplicationIntegrationDrawer";
import { ApplicationRowActionsMenu } from "../components/ApplicationRowActionsMenu";
import { AppSourceRemixDrawer } from "../components/AppSourceRemixDrawer";
import { AppStoreCategoryPanel } from "../components/AppStoreCategoryPanel";
import { useApplicationCatalogMessages, type ApplicationCatalogMessages } from "../i18n";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  isApplicationSourceUnavailable,
  isApplicationTokenForbidden,
  isApplicationTokenUnavailable,
  issueApplicationAccessToken,
  loadAppStoreApplications,
  loadDeployApplications,
  loadDeployOrganizationOptions,
  resolveApplicationCatalogContext,
} from "../services/application-catalog";
import {
  DEFAULT_DEPLOY_APP_LIST_FILTER,
  deployAppKindMessageKey,
  hasActiveDeployAppListFilter,
  isDeployAppListQueryInvalid,
  isValidDeployOrganizationId,
  normalizeDeployOrganizationId,
  parseDeployAppListFilter,
  writeDeployAppListFilter,
} from "../services/deploy-application-filter";
import {
  resolveDeployApplicationForRecord,
  summarizeApplicationIntegration,
  summarizeApplicationIntegrationBindings,
} from "../services/application-integration-document";
import { getApplicationIntegrationService } from "../services/application-integrations";
import type {
  ApplicationIntegrationKind,
  ApplicationIntegrationSaveResult,
  ApplicationIntegrationService,
  ApplicationIntegrationSummary,
} from "../types/application-integrations";
import type {
  ApplicationAccessToken,
  ApplicationAccessTokenIssuer,
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationGroupState,
  ApplicationRecord,
  DeployAppKindTabId,
  DeployAppListFilter,
  DeployOrganizationOption,
  DeployOwnershipFilterId,
} from "../types/application-catalog";
import type { AppStoreCategoryService } from "../types/appstore-categories";
import type { DeployAppSourceService } from "../types/deploy-app-source";

interface ApplicationGroupDefinition {
  id: ApplicationGroupId;
  icon: LucideIcon;
  loader: (context: ApplicationCatalogContext) => Promise<readonly ApplicationRecord[]>;
  messageKey: "appStore" | "deploy" | "iam";
}

const APPLICATION_GROUPS: readonly ApplicationGroupDefinition[] = [
  { id: "deploy", icon: Layers, loader: loadDeployApplications, messageKey: "deploy" },
  { id: "app-store", icon: Store, loader: loadAppStoreApplications, messageKey: "appStore" },
];

/**
 * Bounds on the list-row integration summary fan-out.
 *
 * Each summary is one `apps.resourceLinks.list` call per deploy application;
 * the list shows at most these many and leaves the rest to the drawer.
 */
const INTEGRATION_SUMMARY_LIMIT = 60;
const INTEGRATION_SUMMARY_CONCURRENCY = 6;

/** Left-navigation views: the three app sources plus category governance. */
export type ApplicationCatalogView = ApplicationGroupId | "categories";

/**
 * Resolve the App Center view from its route.
 *
 * The App Center module owns one route per view so the admin shell sidebar is
 * the only left navigation; the index route redirects to
 * `/admin/applications/deploy`. Unknown subpaths fall back to the deployment
 * applications view. The IAM view is retired: an installation is one-to-one with
 * a deployment application, so it is reviewed through that application.
 */
export function resolveApplicationCatalogView(pathname: string): ApplicationCatalogView {
  if (/\/categories\/?$/u.test(pathname)) {
    return "categories";
  }
  if (/\/app-store\/?$/u.test(pathname)) {
    return "app-store";
  }
  return "deploy";
}

function createInitialGroupStates(): Record<ApplicationGroupId, ApplicationGroupState> {
  return {
    "app-store": { items: [], status: "loading" },
    deploy: { items: [], status: "loading" },
    iam: { items: [], status: "loading" },
  };
}

/**
 * Unified application management page.
 *
 * One entity (tenant or organization) owns applications in two independent
 * platforms. The page keeps them in separate groups so each platform's own
 * identifier, environment, and lifecycle vocabulary stays intact, while the
 * layout gives operators one place to see every deployment and store listing
 * the entity owns. The IAM view is retired: its installations are one-to-one
 * with deployment applications.
 */
export function ApplicationManagementPage({
  activeView: controlledView,
  backTo,
  categoryService,
  integrations,
  issueToken,
  loaders,
  loadOrganizations,
  organizationId,
  organizations,
  permissionScope,
  resolveContext,
  showViewNav = true,
  sourceService,
  tenantId,
}: {
  /** Controlled view used by the App Center routes (shell sidebar owns navigation). */
  activeView?: ApplicationCatalogView;
  backTo: string;
  /** Test/extension seam: override the App Store category transport. */
  categoryService?: AppStoreCategoryService;
  /** Test/extension seam: override the application integration transport. */
  integrations?: ApplicationIntegrationService;
  /** Test/extension seam: override access-token issuance. */
  issueToken?: ApplicationAccessTokenIssuer;
  /** Test/extension seam: override one or more group loaders. */
  loaders?: Partial<Record<ApplicationGroupId, ApplicationGroupDefinition["loader"]>>;
  organizationId?: string;
  /**
   * Test/host seam: the granted permission codes.
   *
   * Production callers omit it and the live portal session scope is read. A
   * value here also decides whether the deploy rows expose the "Source & remix"
   * entry (`deploy.apps.read`) and whether its write controls render.
   */
  permissionScope?: readonly string[];
  /** Test/extension seam: override context resolution. */
  resolveContext?: (input: { organizationId?: string; tenantId?: string }) => Promise<ApplicationCatalogContext>;
  /**
   * Render the in-page view switcher.
   *
   * `false` for the App Center module, whose views are shell-sidebar routes;
   * tenant/organization drill-down pages keep the switcher because their paths
   * carry dynamic ownership ids the shell menu cannot express.
   */
  showViewNav?: boolean;
  /** Test/extension seam: override the Deploy source/remix transport. */
  sourceService?: DeployAppSourceService;
  tenantId?: string;
  /**
   * Organization directory for the deploy ownership filter.
   *
   * The host may pass an already-loaded list; when omitted the page asks IAM for
   * it lazily and falls back to a validated numeric organization id input.
   */
  organizations?: readonly DeployOrganizationOption[];
  /** Test/extension seam: override the organization directory transport. */
  loadOrganizations?: () => Promise<readonly DeployOrganizationOption[]>;
}) {
  const messages = useApplicationCatalogMessages();
  const navigate = useNavigate();
  // Extension seams are held in refs so an inline object in a host render does
  // not restart the load on every render.
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;
  const resolveContextRef = useRef(resolveContext);
  resolveContextRef.current = resolveContext;
  const issueTokenRef = useRef(issueToken);
  issueTokenRef.current = issueToken;
  const integrationsRef = useRef(integrations);
  integrationsRef.current = integrations;
  const sourceServiceRef = useRef(sourceService);
  sourceServiceRef.current = sourceService;
  const organizationsRef = useRef(organizations);
  organizationsRef.current = organizations;
  const loadOrganizationsRef = useRef(loadOrganizations);
  loadOrganizationsRef.current = loadOrganizations;
  const [searchParams, setSearchParams] = useSearchParams();
  const [context, setContext] = useState<ApplicationCatalogContext>();
  const [groupStates, setGroupStates] = useState(createInitialGroupStates);
  const [internalView, setInternalView] = useState<ApplicationCatalogView>("iam");
  const activeView = controlledView ?? internalView;
  const [query, setQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [tokenTarget, setTokenTarget] = useState<ApplicationRecord>();
  const [tokenState, setTokenState] = useState<
    | { status: "loading" }
    | { error: unknown; status: "error" }
    | { status: "ready"; value: ApplicationAccessToken }
  >({ status: "loading" });
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [integrationTarget, setIntegrationTarget] = useState<{
    application: ApplicationRecord;
    kind: ApplicationIntegrationKind;
  }>();
  const [sourceTarget, setSourceTarget] = useState<ApplicationRecord>();
  const [organizationLookup, setOrganizationLookup] = useState<DeployOrganizationLookup>({
    options: [],
    status: "idle",
  });
  const [organizationDraft, setOrganizationDraft] = useState("");
  const [organizationDraftError, setOrganizationDraftError] = useState(false);
  // Both gates fall back to the live portal session scope when no seam is given.
  const canReadSource = permissionScope
    ? isApplicationCenterActionAllowed("sourceRead", permissionScope)
    : isApplicationCenterActionAllowed("sourceRead");
  const canWriteSource = permissionScope
    ? isApplicationCenterActionAllowed("sourceWrite", permissionScope)
    : isApplicationCenterActionAllowed("sourceWrite");

  const activeGroup = activeView === "categories"
    ? undefined
    : (APPLICATION_GROUPS.find((group) => group.id === activeView) ?? APPLICATION_GROUPS[0]);
  const activeState = activeGroup ? groupStates[activeGroup.id] : undefined;
  const deployApplications = groupStates.deploy.items;

  // The deploy filter lives in the URL so a filtered list survives a refresh or
  // a shared link. An organization drill-down already fixes the scope, so its
  // ownership choice is coerced to "all" and the selector stays hidden.
  const parsedDeployFilter = useMemo(
    () => parseDeployAppListFilter(searchParams),
    [searchParams],
  );
  const deployFilter = useMemo<DeployAppListFilter>(() => (
    context?.organizationId
      ? { kindTab: parsedDeployFilter.kindTab, ownership: "all" }
      : parsedDeployFilter
  ), [context?.organizationId, parsedDeployFilter]);
  const deployFilterKey = [
    deployFilter.kindTab,
    deployFilter.ownership,
    deployFilter.organizationId ?? "",
  ].join("|");
  const deployFilterRef = useRef(deployFilter);
  deployFilterRef.current = deployFilter;
  const deployFiltersActive = activeGroup?.id === "deploy"
    && hasActiveDeployAppListFilter(deployFilter);

  useEffect(() => {
    let cancelled = false;
    setContext(undefined);
    // Deploy is re-queried by its own effect (filters are server-side); reset
    // only the groups that the context owns.
    setGroupStates((current) => ({
      ...current,
      "app-store": { items: [], status: "loading" },
      iam: { items: [], status: "loading" },
    }));
    const resolve = resolveContextRef.current ?? resolveApplicationCatalogContext;
    void resolve({ organizationId, tenantId }).then(async (resolved) => {
      if (cancelled) {
        return;
      }
      setContext(resolved);
      await Promise.all(APPLICATION_GROUPS.filter((group) => group.id !== "deploy").map(async (group) => {
        try {
          const loader = loadersRef.current?.[group.id] ?? group.loader;
          const items = await loader(resolved);
          if (!cancelled) {
            setGroupStates((current) => ({
              ...current,
              [group.id]: { items, status: "ready" },
            }));
          }
        } catch (error) {
          if (!cancelled) {
            setGroupStates((current) => ({
              ...current,
              [group.id]: { error, items: [], status: "error" },
            }));
          }
        }
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, reloadToken, tenantId]);

  // Deploy list: one server query per (context, filter, refresh) change. The
  // hook keeps the previous rows while the new filtered page is loading.
  useEffect(() => {
    if (!context) {
      return;
    }
    let cancelled = false;
    setGroupStates((current) => ({
      ...current,
      deploy: { ...current.deploy, status: "loading" },
    }));
    void (async () => {
      try {
        const loader = loadersRef.current?.deploy ?? loadDeployApplications;
        const items = await loader(context, { deploy: deployFilterRef.current });
        if (!cancelled) {
          setGroupStates((current) => ({
            ...current,
            deploy: { items, status: "ready" },
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setGroupStates((current) => ({
            ...current,
            deploy: { error, items: [], status: "error" },
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, deployFilterKey, reloadToken]);

  // Keep the organization directory lookup lazy: it is only needed once the
  // operator picks the organization ownership filter. `status` is deliberately
  // not a dependency: the effect sets it, and depending on it would let React's
  // cleanup cancel the in-flight lookup it just started.
  useEffect(() => {
    if (activeGroup?.id !== "deploy" || deployFilter.ownership !== "ORGANIZATION") {
      return;
    }
    if (organizationsRef.current) {
      setOrganizationLookup({ options: organizationsRef.current, status: "ready" });
      return;
    }
    if (organizationLookup.status !== "idle") {
      return;
    }
    let cancelled = false;
    setOrganizationLookup({ options: [], status: "loading" });
    const load = loadOrganizationsRef.current ?? loadDeployOrganizationOptions;
    void load()
      .then((options) => {
        if (!cancelled) {
          setOrganizationLookup({ options, status: "ready" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizationLookup({ options: [], status: "failed" });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above.
  }, [activeGroup?.id, deployFilter.ownership]);

  // Reflect URL changes (back/forward, shared link) back into the draft input.
  useEffect(() => {
    setOrganizationDraft(deployFilter.organizationId ?? "");
    setOrganizationDraftError(false);
  }, [deployFilter.organizationId, deployFilter.ownership]);

  const updateDeployFilter = (patch: Partial<DeployAppListFilter>) => {
    const next: DeployAppListFilter = { ...deployFilter, ...patch };
    setSearchParams(
      (current) => writeDeployAppListFilter(current, next),
      { replace: true },
    );
  };

  const handleKindTabChange = (kindTab: DeployAppKindTabId) => {
    updateDeployFilter({ kindTab });
  };

  const handleOwnershipChange = (ownership: DeployOwnershipFilterId) => {
    setOrganizationDraftError(false);
    updateDeployFilter({
      ownership,
      ...(ownership === "ORGANIZATION" ? {} : { organizationId: undefined }),
    });
  };

  const commitOrganizationDraft = () => {
    const normalized = normalizeDeployOrganizationId(organizationDraft);
    if (!normalized) {
      if (organizationDraft.trim()) {
        setOrganizationDraftError(true);
        return;
      }
      setOrganizationDraftError(false);
      updateDeployFilter({ organizationId: undefined });
      return;
    }
    setOrganizationDraftError(false);
    setOrganizationDraft(normalized);
    if (normalized !== deployFilter.organizationId) {
      updateDeployFilter({ organizationId: normalized });
    }
  };

  const handleOrganizationSelect = (value: string) => {
    setOrganizationDraftError(false);
    setOrganizationDraft(value);
    updateDeployFilter({
      organizationId: isValidDeployOrganizationId(value) ? value : undefined,
    });
  };

  const clearDeployFilters = () => {
    setOrganizationDraft("");
    setOrganizationDraftError(false);
    setSearchParams(
      (current) => writeDeployAppListFilter(current, DEFAULT_DEPLOY_APP_LIST_FILTER),
      { replace: true },
    );
  };

  const loadAccessToken = async (application: ApplicationRecord) => {
    if (!context) {
      return;
    }
    setTokenRevealed(false);
    setTokenCopied(false);
    setTokenState({ status: "loading" });
    try {
      const value = await (issueTokenRef.current ?? issueApplicationAccessToken)(context, application);
      setTokenState({ status: "ready", value });
    } catch (error) {
      setTokenState({ error, status: "error" });
    }
  };

  const openAccessToken = (application: ApplicationRecord) => {
    setTokenTarget(application);
    void loadAccessToken(application);
  };

  const copyAccessToken = () => {
    if (tokenState.status !== "ready") {
      return;
    }
    const value = tokenState.value.accessToken;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value)
        .then(() => {
          setTokenCopied(true);
          window.setTimeout(() => setTokenCopied(false), 2000);
        })
        .catch(() => undefined);
    }
  };

  const filteredItems = useMemo(() => {
    const items = activeState?.items ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((item) =>
      [item.name, item.reference, item.domain, item.kind, item.status]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)));
  }, [activeState?.items, query]);

  const [integrationSummaries, setIntegrationSummaries] = useState<
    ReadonlyMap<string, ApplicationIntegrationSummary>
  >(new Map());
  // Bindings live in `deploy_application_resource_link`, not in the app metadata,
  // so the list-row chips are resolved with one bounded fan-out per visible
  // page. Beyond the cap the chips stay absent rather than turning a large
  // tenant list into hundreds of requests.
  useEffect(() => {
    const items = activeState?.items ?? [];
    if (items.length === 0) {
      setIntegrationSummaries(new Map());
      return;
    }
    const service = integrationsRef.current ?? getApplicationIntegrationService();
    const loadBindings = service.loadBindings;
    const linkedToDeploy = new Map<string, ApplicationRecord>();
    const rowToDeploy = new Map<string, string>();
    for (const item of items) {
      const deployApplication = resolveDeployApplicationForRecord(item, deployApplications);
      if (!deployApplication) {
        continue;
      }
      linkedToDeploy.set(deployApplication.id, deployApplication);
      rowToDeploy.set(rowKey(item), deployApplication.id);
    }
    if (!loadBindings) {
      // Test doubles without the authority transport keep the legacy document
      // summary; the drawer still explains the migration state.
      const fallback = new Map<string, ApplicationIntegrationSummary>();
      for (const item of items) {
        const deployApplication = resolveDeployApplicationForRecord(item, deployApplications);
        if (!deployApplication) {
          continue;
        }
        const summary = summarizeApplicationIntegration(
          deployApplication.metadata,
          deployApplication.id,
          item.groupId !== "deploy",
          deployApplication.kind,
        );
        if (summary) {
          fallback.set(rowKey(item), summary);
        }
      }
      setIntegrationSummaries(fallback);
      return;
    }
    let cancelled = false;
    const targets = [...linkedToDeploy.values()].slice(0, INTEGRATION_SUMMARY_LIMIT);
    void (async () => {
      const byDeployApp = new Map<string, ApplicationIntegrationSummary>();
      for (let index = 0; index < targets.length; index += INTEGRATION_SUMMARY_CONCURRENCY) {
        const batch = targets.slice(index, index + INTEGRATION_SUMMARY_CONCURRENCY);
        await Promise.all(batch.map(async (deployApplication) => {
          try {
            const bindings = await loadBindings(deployApplication.id, deployApplication.metadata);
            const summary = summarizeApplicationIntegrationBindings(
              bindings,
              deployApplication.id,
              false,
              deployApplication.kind,
            );
            if (summary) {
              byDeployApp.set(deployApplication.id, summary);
            }
          } catch {
            // A failed summary must not break the application list.
          }
        }));
      }
      if (cancelled) {
        return;
      }
      const byRow = new Map<string, ApplicationIntegrationSummary>();
      for (const [row, deployAppId] of rowToDeploy) {
        const summary = byDeployApp.get(deployAppId);
        if (summary) {
          byRow.set(row, { ...summary, linked: !row.startsWith("deploy:") });
        }
      }
      setIntegrationSummaries(byRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeState?.items, deployApplications]);

  const openIntegration = (application: ApplicationRecord, kind: ApplicationIntegrationKind) => {
    setIntegrationTarget({ application, kind });
  };

  const handleIntegrationSaved = (result: ApplicationIntegrationSaveResult) => {
    const updatedMetadata = new Map<string, Record<string, unknown>>([
      [result.deployAppId, result.metadata],
      ...(result.previousDeployApp
        ? [[result.previousDeployApp.deployAppId, result.previousDeployApp.metadata] as const]
        : []),
    ]);
    setGroupStates((current) => ({
      ...current,
      deploy: {
        ...current.deploy,
        items: current.deploy.items.map((application) => {
          const metadata = updatedMetadata.get(application.id);
          if (!metadata) {
            return application;
          }
          return {
            ...application,
            metadata,
            ...(application.id === result.deployAppId && result.updatedAt !== undefined
              ? { updatedAt: result.updatedAt }
              : {}),
          };
        }),
      },
    }));
  };

  const columns = useMemo<DataTableColumn<ApplicationRecord>[]>(() => {
    const identity: DataTableColumn<ApplicationRecord> = {
      cell: (item) => {
        const summary = integrationSummaries.get(rowKey(item));
        return (
          <div className="min-w-0">
            <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">{item.name}</div>
            {item.reference ? (
              <div className="truncate text-xs text-[var(--sdk-color-text-muted)]">{item.reference}</div>
            ) : null}
            {summary ? <IntegrationSummaryChips messages={messages} summary={summary} /> : null}
          </div>
        );
      },
      header: messages.columns.application,
      id: "application",
    };
    const kind: DataTableColumn<ApplicationRecord> = {
      cell: (item) => item.kind || "-",
      header: messages.columns.type,
      id: "type",
    };
    const environment: DataTableColumn<ApplicationRecord> = {
      cell: (item) => item.environment || "-",
      header: messages.columns.environment,
      id: "environment",
    };
    const status: DataTableColumn<ApplicationRecord> = {
      cell: (item) => item.status
        ? (
          <StatusBadge
            label={statusLabel(messages, item.status)}
            showIcon
            status={normalizeStatus(item.status)}
            variant={statusVariant(item.status)}
          />
        )
        : "-",
      header: messages.columns.status,
      id: "status",
    };
    const updatedAt: DataTableColumn<ApplicationRecord> = {
      cell: (item) => item.updatedAt ? formatDateTime(item.updatedAt) : "-",
      header: messages.columns.updatedAt,
      id: "updatedAt",
    };

    if (!activeGroup || activeGroup.id === "iam") {
      return [
        identity,
        kind,
        environment,
        status,
        { cell: (item) => item.domain || "-", header: messages.columns.domain, id: "domain" },
        updatedAt,
      ];
    }
    if (activeGroup.id === "deploy") {
      return [
        identity,
        {
          cell: (item) => <DeployAppKindBadge kind={item.kind} messages={messages} />,
          header: messages.columns.type,
          id: "type",
        },
        environment,
        status,
        {
          cell: (item) => <DeployOwnershipBadge item={item} messages={messages} />,
          header: messages.columns.scope,
          id: "scope",
        },
        updatedAt,
      ];
    }
    return [
      identity,
      { cell: (item) => item.kind || "-", header: messages.columns.platform, id: "platform" },
      status,
      { cell: (item) => item.version || "-", header: messages.columns.version, id: "version" },
      updatedAt,
    ];
  }, [activeGroup?.id, integrationSummaries, messages]);

  const scopeName = context?.organizationName ?? context?.tenantName;
  const subtitle = context
    ? template(
      context.organizationId ? messages.subtitleOrganizationTemplate : messages.subtitleTenantTemplate,
      { name: scopeName ?? context.organizationId ?? context.tenantId },
    )
    : "";
  const activeCopy = activeGroup ? messages.groups[activeGroup.messageKey] : undefined;
  const busy = APPLICATION_GROUPS.some((group) => groupStates[group.id].status === "loading");
  const deployQueryInvalid = activeGroup?.id === "deploy"
    && isDeployAppListQueryInvalid(activeState?.error);
  const listNarrowed = deployFiltersActive || query.trim().length > 0;

  const handleOrganizationDraftChange = (value: string) => {
    setOrganizationDraft(value);
    if (organizationDraftError) {
      setOrganizationDraftError(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      {activeView === "categories" ? null : (
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button aria-label={messages.back} onClick={() => navigate(backTo)} size="sm" type="button" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--sdk-color-text-primary)]">{messages.title}</h1>
            {subtitle ? <p className="truncate text-sm text-[var(--sdk-color-text-muted)]">{subtitle}</p> : null}
          </div>
        </div>
        <Button disabled={busy} onClick={() => setReloadToken((token) => token + 1)} type="button" variant="outline">
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {messages.refresh}
        </Button>
      </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {showViewNav ? (
        <nav
          aria-label={messages.title}
          className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-2 lg:w-64 lg:flex-col lg:overflow-visible"
        >
          {APPLICATION_GROUPS.map((group) => {
            const copy = messages.groups[group.messageKey];
            const state = groupStates[group.id];
            const active = group.id === activeView;
            const Icon = group.icon;
            return (
              <button
                aria-current={active ? "page" : undefined}
                data-application-group={group.id}
                className={[
                  "flex min-w-0 items-center gap-3 rounded-[var(--sdk-radius-control)] px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                    : "text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]",
                ].join(" ")}
                key={group.id}
                onClick={() => setInternalView(group.id)}
                type="button"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{copy.label}</span>
                <span className="shrink-0 rounded-full bg-[var(--sdk-color-surface-panel-muted)] px-2 py-0.5 text-xs tabular-nums text-[var(--sdk-color-text-muted)]">
                  {state.status === "loading" ? "…" : state.status === "error" ? "!" : state.items.length}
                </span>
              </button>
            );
          })}
          <div
            aria-hidden="true"
            className="my-1 hidden border-t border-[var(--sdk-color-border-default)] lg:block"
          />
          <button
            aria-current={activeView === "categories" ? "page" : undefined}
            data-application-group="categories"
            className={[
              "flex min-w-0 items-center gap-3 rounded-[var(--sdk-radius-control)] px-3 py-2 text-left transition-colors",
              activeView === "categories"
                ? "bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                : "text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]",
            ].join(" ")}
            onClick={() => setInternalView("categories")}
            type="button"
          >
            <FolderTree className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {messages.categories.navLabel}
            </span>
          </button>
        </nav>
        ) : null}

        {activeView === "categories" ? (
          <AppStoreCategoryPanel
            key={reloadToken}
            messages={messages}
            service={categoryService}
          />
        ) : (
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{activeCopy?.label}</h2>
              <p className="text-sm text-[var(--sdk-color-text-muted)]">{activeCopy?.description}</p>
            </div>
            <label className="relative w-full max-w-72">
              <span className="sr-only">{messages.searchPlaceholder}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
              <Input
                aria-label={messages.searchPlaceholder}
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={messages.searchPlaceholder}
                value={query}
              />
            </label>
          </div>

          {activeGroup?.id === "deploy" ? (
            <DeployApplicationFilters
              filter={deployFilter}
              filtersActive={deployFiltersActive}
              lookup={organizationLookup}
              messages={messages}
              onClear={clearDeployFilters}
              onKindTabChange={handleKindTabChange}
              onOrganizationCommit={commitOrganizationDraft}
              onOrganizationDraftChange={handleOrganizationDraftChange}
              onOrganizationSelect={handleOrganizationSelect}
              onOwnershipChange={handleOwnershipChange}
              organizationDraft={organizationDraft}
              organizationError={organizationDraftError}
              showOwnership={!context?.organizationId}
            />
          ) : null}

          {context?.organizationId && activeGroup?.id === "app-store" ? (
            <StatusNotice tone="warning">{messages.organizationAppStoreNotice}</StatusNotice>
          ) : null}

          {activeState?.status === "error" ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>
                  {deployQueryInvalid
                    ? messages.deployFilters.invalidQuery
                    : isApplicationSourceUnavailable(activeState?.error)
                      ? messages.unavailable
                      : messages.loadError}
                </span>
                <Button
                  onClick={deployQueryInvalid
                    ? clearDeployFilters
                    : () => setReloadToken((token) => token + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {deployQueryInvalid ? messages.deployFilters.clear : messages.retry}
                </Button>
              </span>
            </StatusNotice>
          ) : null}

          <p className="text-xs text-[var(--sdk-color-text-muted)]">
            {template(messages.countTemplate, { count: String(filteredItems.length) })}
          </p>

          <DataTable
            className="min-h-0 flex-1"
            columns={columns}
            emptyDescription={listNarrowed ? messages.deployFilters.emptyDescription : messages.emptyDescription}
            emptyTitle={listNarrowed ? messages.deployFilters.emptyTitle : messages.emptyTitle}
            getRowId={(item) => `${item.groupId}:${item.id}`}
            loading={activeState?.status === "loading"}
            rowActions={(item) => {
              const deployApplication = resolveDeployApplicationForRecord(item, deployApplications);
              return (
                <div data-application-row-actions>
                  <ApplicationRowActionsMenu
                    appKind={item.groupId === "deploy" ? item.kind : deployApplication?.kind}
                    canReadSource={item.groupId === "deploy" && canReadSource}
                    messages={messages}
                    onAccessToken={() => openAccessToken(item)}
                    onIntegration={(kind) => openIntegration(item, kind)}
                    onSource={() => setSourceTarget(item)}
                  />
                </div>
              );
            }}
            rowActionsLabel={messages.columns.actions}
            rows={[...filteredItems]}
            slotProps={{
              footer: { className: "shrink-0" },
              surface: { className: "flex min-h-0 flex-1 flex-col" },
              viewport: { className: "min-h-0 flex-1" },
            }}
            stickyHeader
          />
        </section>
        )}
      </div>

      <Drawer
        onOpenChange={(open) => {
          if (!open) {
            setTokenTarget(undefined);
          }
        }}
        open={Boolean(tokenTarget)}
      >
        <DrawerContent size="md">
          <DrawerHeader>
            <DrawerTitle>{messages.accessToken.title}</DrawerTitle>
            <DrawerDescription>{messages.accessToken.description}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            {tokenTarget ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.app}</dt>
                <dd className="min-w-0 truncate font-medium text-[var(--sdk-color-text-primary)]">{tokenTarget.name}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.reference}</dt>
                <dd className="min-w-0 truncate">{tokenTarget.reference || "-"}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.group}</dt>
                <dd>{messages.groups[groupMessageKey(tokenTarget.groupId)].label}</dd>
                <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.scope}</dt>
                <dd>{tokenTarget.organizationId ? messages.scopes.organization : messages.scopes.tenant}</dd>
              </dl>
            ) : null}

            {tokenState.status === "loading" ? (
              <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
                {messages.accessToken.loading}
              </p>
            ) : null}

            {tokenState.status === "error" ? (
              <StatusNotice tone="danger">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {isApplicationTokenForbidden(tokenState.error)
                      ? messages.accessToken.forbidden
                      : isApplicationTokenUnavailable(tokenState.error)
                        ? messages.accessToken.unavailable
                        : messages.accessToken.error}
                  </span>
                  <Button
                    onClick={() => {
                      if (tokenTarget) void loadAccessToken(tokenTarget);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {messages.accessToken.regenerate}
                  </Button>
                </div>
              </StatusNotice>
            ) : null}

            {tokenState.status === "ready" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                      {messages.accessToken.tokenLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Button
                        aria-label={tokenRevealed ? messages.accessToken.hide : messages.accessToken.reveal}
                        onClick={() => setTokenRevealed((revealed) => !revealed)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {tokenRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button onClick={copyAccessToken} size="sm" type="button" variant="outline">
                        <Copy className="h-3.5 w-3.5" />
                        {tokenCopied ? messages.accessToken.copied : messages.accessToken.copy}
                      </Button>
                    </span>
                  </div>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] p-3 text-xs text-[var(--sdk-color-text-primary)]">
                    {tokenRevealed ? tokenState.value.accessToken : maskToken(tokenState.value.accessToken)}
                  </pre>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                  <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.expiresAt}</dt>
                  <dd>{tokenState.value.expiresAt ? formatDateTime(tokenState.value.expiresAt) : "-"}</dd>
                  <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.appId}</dt>
                  <dd className="break-all">{tokenState.value.appId || "-"}</dd>
                  <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.tenantApplicationId}</dt>
                  <dd className="break-all">{tokenState.value.tenantApplicationId || "-"}</dd>
                  <dt className="text-[var(--sdk-color-text-muted)]">{messages.accessToken.sessionId}</dt>
                  <dd className="break-all">{tokenState.value.sessionId || "-"}</dd>
                </dl>
                <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                  {messages.accessToken.securityNote}
                </p>
              </div>
            ) : null}
          </DrawerBody>
          <DrawerFooter>
            <Button onClick={() => setTokenTarget(undefined)} type="button" variant="secondary">
              {messages.accessToken.close}
            </Button>
            <Button
              disabled={tokenState.status === "loading"}
              onClick={() => {
                if (tokenTarget) void loadAccessToken(tokenTarget);
              }}
              type="button"
              variant="outline"
            >
              {messages.accessToken.regenerate}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {integrationTarget ? (
        <ApplicationIntegrationDrawer
          application={integrationTarget.application}
          deployApplications={deployApplications}
          kind={integrationTarget.kind}
          messages={messages}
          onClose={() => setIntegrationTarget(undefined)}
          onSaved={handleIntegrationSaved}
          service={integrationsRef.current ?? getApplicationIntegrationService()}
        />
      ) : null}

      {sourceTarget ? (
        <AppSourceRemixDrawer
          application={sourceTarget}
          canRead={canReadSource}
          canWrite={canWriteSource}
          messages={messages}
          onClose={() => setSourceTarget(undefined)}
          {...(sourceServiceRef.current ? { service: sourceServiceRef.current } : {})}
        />
      ) : null}
    </div>
  );
}

export const CloudRouterTenantApplicationsPage: ComponentType = function CloudRouterTenantApplicationsPageEntry() {
  const { tenantId } = useParams<{ tenantId: string }>();
  if (!tenantId) {
    return null;
  }
  return <ApplicationManagementPage backTo="/admin/iam/tenants" tenantId={tenantId} />;
};

/**
 * Application Center: the current tenant's deployment applications and store
 * listings.
 *
 * Unlike the two entity-scoped pages above, this one is its own admin module
 * (`appCenter`): the header entry opens the tenant-wide catalog so an operator
 * can review every application the current tenant owns and issue delegated
 * access tokens without going through the IAM tenant drill-down first.
 *
 * The module's views are shell-sidebar routes (`/admin/applications/deploy`,
 * `/app-store`, `/categories`), so this page renders no second navigation: the
 * admin shell sidebar is the single left menu.
 */
export const CloudRouterApplicationCenterPage: ComponentType = function CloudRouterApplicationCenterPageEntry() {
  const location = useLocation();
  return (
    <ApplicationManagementPage
      activeView={resolveApplicationCatalogView(location.pathname)}
      backTo="/admin/dashboard"
      showViewNav={false}
    />
  );
};

export const CloudRouterOrganizationApplicationsPage: ComponentType = function CloudRouterOrganizationApplicationsPageEntry() {
  const { organizationId } = useParams<{ organizationId: string }>();
  if (!organizationId) {
    return null;
  }
  return <ApplicationManagementPage backTo="/admin/iam/organizations" organizationId={organizationId} />;
};

function rowKey(application: ApplicationRecord): string {
  return `${application.groupId}:${application.id}`;
}

function IntegrationSummaryChips({
  messages,
  summary,
}: {
  messages: ApplicationCatalogMessages;
  summary: ApplicationIntegrationSummary;
}) {
  const copy = messages.integrations.summary;
  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]"
      data-application-integration-summary={summary.deployAppId}
    >
      {summary.paymentAccountCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[var(--sdk-color-text-secondary)]">
          <CreditCard className="h-3 w-3" />
          {template(copy.paymentCount, { count: String(summary.paymentAccountCount) })}
        </span>
      ) : null}
      {summary.officialAccountCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[var(--sdk-color-text-secondary)]">
          <MessageCircle className="h-3 w-3" />
          {copy.officialAccount}
        </span>
      ) : null}
      {summary.miniProgramCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[var(--sdk-color-text-secondary)]">
          <Smartphone className="h-3 w-3" />
          {copy.miniProgram}
        </span>
      ) : null}
      {summary.readiness?.autoLogin === "incomplete" ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sdk-color-status-warning)] px-2 py-0.5 text-[var(--sdk-color-status-warning)]">
          <AlertTriangle className="h-3 w-3" />
          {copy.autoLoginPending}
        </span>
      ) : null}
      {summary.readiness?.checkout === "incomplete" && summary.paymentAccountCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--sdk-color-status-warning)] px-2 py-0.5 text-[var(--sdk-color-status-warning)]">
          <AlertTriangle className="h-3 w-3" />
          {copy.checkoutPending}
        </span>
      ) : null}
    </div>
  );
}

function DeployAppKindBadge({
  kind,
  messages,
}: {
  kind?: string;
  messages: ApplicationCatalogMessages;
}) {
  const messageKey = deployAppKindMessageKey(kind);
  const label = messageKey ? messages.deployFilters.kinds[messageKey] : kind;
  if (!label) {
    return <>-</>;
  }
  return (
    <Badge data-deploy-kind={kind ?? "unknown"} variant="outline">
      {label}
    </Badge>
  );
}

function DeployOwnershipBadge({
  item,
  messages,
}: {
  item: ApplicationRecord;
  messages: ApplicationCatalogMessages;
}) {
  const scope = item.ownershipScope;
  const label = scope === "ORGANIZATION"
    ? messages.scopes.organization
    : scope === "TENANT"
      ? messages.scopes.tenant
      : scope === "USER"
        ? messages.deployFilters.ownerships.user
        : scope === "PLATFORM"
          ? messages.deployFilters.ownerships.platform
          : item.organizationId && item.organizationId !== "0"
            ? messages.scopes.organization
            : messages.scopes.tenant;
  // `0` is the tenant encoding of owner_organization_id, so only a positive id
  // is worth showing next to the ownership badge.
  const organizationId = normalizeDeployOrganizationId(item.organizationId);
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-deploy-ownership={scope ?? "UNKNOWN"}
    >
      <Badge variant="secondary">{label}</Badge>
      {organizationId ? (
        <span
          className="text-xs text-[var(--sdk-color-text-muted)]"
          data-deploy-organization-id={organizationId}
        >
          {template(messages.deployFilters.organizationIdTemplate, { id: organizationId })}
        </span>
      ) : null}
    </div>
  );
}

function groupMessageKey(groupId: ApplicationGroupId): "appStore" | "deploy" | "iam" {
  if (groupId === "iam") {
    return "iam";
  }
  return groupId === "deploy" ? "deploy" : "appStore";
}

function maskToken(token: string): string {
  if (token.length <= 16) {
    return "*".repeat(16);
  }
  return `${token.slice(0, 8)}${"*".repeat(8)}${token.slice(-6)}`;
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

function statusVariant(status: string): StatusBadgeVariant {
  switch (normalizeStatus(status)) {
    case "active":
    case "enabled":
    case "installed":
      return "success";
    case "paused":
    case "pending_config":
      return "warning";
    case "terminated":
      return "danger";
    case "archived":
    case "disabled":
      return "secondary";
    default:
      return "default";
  }
}

function statusLabel(messages: ApplicationCatalogMessages, status: string): string {
  const normalized = normalizeStatus(status);
  const statuses = messages.statuses as Record<string, string>;
  return statuses[normalized] ?? status;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function template(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}
