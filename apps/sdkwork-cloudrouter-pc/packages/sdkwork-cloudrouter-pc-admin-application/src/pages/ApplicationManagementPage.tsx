import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FolderTree,
  KeyRound,
  Layers,
  MessageCircle,
  RefreshCw,
  Search,
  Smartphone,
  Store,
  type LucideIcon,
} from "lucide-react";
import {
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

import { ApplicationIntegrationDrawer } from "../components/ApplicationIntegrationDrawer";
import { AppStoreCategoryPanel } from "../components/AppStoreCategoryPanel";
import { useApplicationCatalogMessages, type ApplicationCatalogMessages } from "../i18n";
import {
  isApplicationSourceUnavailable,
  isApplicationTokenForbidden,
  isApplicationTokenUnavailable,
  issueApplicationAccessToken,
  loadAppStoreApplications,
  loadDeployApplications,
  loadIamApplications,
  resolveApplicationCatalogContext,
} from "../services/application-catalog";
import {
  resolveDeployApplicationForRecord,
  summarizeApplicationIntegration,
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
} from "../types/application-catalog";
import type { AppStoreCategoryService } from "../types/appstore-categories";

interface ApplicationGroupDefinition {
  id: ApplicationGroupId;
  icon: LucideIcon;
  loader: (context: ApplicationCatalogContext) => Promise<readonly ApplicationRecord[]>;
  messageKey: "appStore" | "deploy" | "iam";
}

const APPLICATION_GROUPS: readonly ApplicationGroupDefinition[] = [
  { id: "iam", icon: Boxes, loader: loadIamApplications, messageKey: "iam" },
  { id: "deploy", icon: Layers, loader: loadDeployApplications, messageKey: "deploy" },
  { id: "app-store", icon: Store, loader: loadAppStoreApplications, messageKey: "appStore" },
];

/** Left-navigation views: the three app sources plus category governance. */
export type ApplicationCatalogView = ApplicationGroupId | "categories";

/**
 * Resolve the App Center view from its route.
 *
 * The App Center module owns one route per view so the admin shell sidebar is
 * the only left navigation; the index route redirects to
 * `/admin/applications/iam`. Unknown subpaths fall back to IAM.
 */
export function resolveApplicationCatalogView(pathname: string): ApplicationCatalogView {
  if (/\/categories\/?$/u.test(pathname)) {
    return "categories";
  }
  if (/\/deploy\/?$/u.test(pathname)) {
    return "deploy";
  }
  if (/\/app-store\/?$/u.test(pathname)) {
    return "app-store";
  }
  return "iam";
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
 * One entity (tenant or organization) owns applications in three independent
 * platforms. The page keeps them in separate groups so each platform's own
 * identifier, environment, and lifecycle vocabulary stays intact, while the
 * layout gives operators one place to see every application the entity owns.
 */
export function ApplicationManagementPage({
  activeView: controlledView,
  backTo,
  categoryService,
  integrations,
  issueToken,
  loaders,
  organizationId,
  resolveContext,
  showViewNav = true,
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
  tenantId?: string;
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

  const activeGroup = activeView === "categories"
    ? undefined
    : (APPLICATION_GROUPS.find((group) => group.id === activeView) ?? APPLICATION_GROUPS[0]);
  const activeState = activeGroup ? groupStates[activeGroup.id] : undefined;
  const deployApplications = groupStates.deploy.items;

  useEffect(() => {
    let cancelled = false;
    setGroupStates(createInitialGroupStates());
    setContext(undefined);
    const resolve = resolveContextRef.current ?? resolveApplicationCatalogContext;
    void resolve({ organizationId, tenantId }).then(async (resolved) => {
      if (cancelled) {
        return;
      }
      setContext(resolved);
      await Promise.all(APPLICATION_GROUPS.map(async (group) => {
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

  const integrationSummaries = useMemo(() => {
    const summaries = new Map<string, ApplicationIntegrationSummary>();
    for (const item of activeState?.items ?? []) {
      const deployApplication = resolveDeployApplicationForRecord(item, deployApplications);
      if (!deployApplication) {
        continue;
      }
      const summary = summarizeApplicationIntegration(
        deployApplication.metadata,
        deployApplication.id,
        item.groupId !== "deploy",
      );
      if (summary) {
        summaries.set(rowKey(item), summary);
      }
    }
    return summaries;
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
        kind,
        environment,
        status,
        {
          cell: (item) => (item.organizationId ? messages.scopes.organization : messages.scopes.tenant),
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
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

          {context?.organizationId && activeGroup?.id === "app-store" ? (
            <StatusNotice tone="warning">{messages.organizationAppStoreNotice}</StatusNotice>
          ) : null}

          {activeState?.status === "error" ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>
                  {isApplicationSourceUnavailable(activeState?.error) ? messages.unavailable : messages.loadError}
                </span>
                <Button onClick={() => setReloadToken((token) => token + 1)} size="sm" type="button" variant="outline">
                  {messages.retry}
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
            emptyDescription={messages.emptyDescription}
            emptyTitle={messages.emptyTitle}
            getRowId={(item) => `${item.groupId}:${item.id}`}
            loading={activeState?.status === "loading"}
            rowActions={(item) => (
              <div
                className="flex min-w-max flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap"
                data-application-row-actions
              >
                <Button onClick={() => openAccessToken(item)} size="sm" type="button" variant="outline">
                  <KeyRound className="h-3.5 w-3.5" />
                  {messages.accessToken.action}
                </Button>
                <Button
                  onClick={() => openIntegration(item, "payment")}
                  size="sm"
                  title={messages.integrations.drawer.titles.payment}
                  type="button"
                  variant="outline"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {messages.integrations.actions.payment}
                </Button>
                <Button
                  onClick={() => openIntegration(item, "mini-program")}
                  size="sm"
                  title={messages.integrations.drawer.titles.miniProgram}
                  type="button"
                  variant="outline"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  {messages.integrations.actions.miniProgram}
                </Button>
                <Button
                  onClick={() => openIntegration(item, "official-account")}
                  size="sm"
                  title={messages.integrations.drawer.titles.officialAccount}
                  type="button"
                  variant="outline"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {messages.integrations.actions.officialAccount}
                </Button>
              </div>
            )}
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
 * Application Center: the current tenant's applications across IAM, Deploy and
 * the App Store.
 *
 * Unlike the two entity-scoped pages above, this one is its own admin module
 * (`appCenter`): the header entry opens the tenant-wide catalog so an operator
 * can review every application the current tenant owns and issue delegated
 * access tokens without going through the IAM tenant drill-down first.
 *
 * The module's views are shell-sidebar routes (`/admin/applications/iam`,
 * `/deploy`, `/app-store`, `/categories`), so this page renders no second
 * navigation: the admin shell sidebar is the single left menu.
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
