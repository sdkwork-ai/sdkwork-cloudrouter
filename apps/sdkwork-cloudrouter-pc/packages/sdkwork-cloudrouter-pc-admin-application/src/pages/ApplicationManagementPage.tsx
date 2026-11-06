import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  RefreshCw,
  Search,
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
import type {
  ApplicationAccessToken,
  ApplicationAccessTokenIssuer,
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationGroupState,
  ApplicationRecord,
} from "../types/application-catalog";

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
  backTo,
  issueToken,
  loaders,
  organizationId,
  resolveContext,
  tenantId,
}: {
  backTo: string;
  /** Test/extension seam: override access-token issuance. */
  issueToken?: ApplicationAccessTokenIssuer;
  /** Test/extension seam: override one or more group loaders. */
  loaders?: Partial<Record<ApplicationGroupId, ApplicationGroupDefinition["loader"]>>;
  organizationId?: string;
  /** Test/extension seam: override context resolution. */
  resolveContext?: (input: { organizationId?: string; tenantId?: string }) => Promise<ApplicationCatalogContext>;
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
  const [context, setContext] = useState<ApplicationCatalogContext>();
  const [groupStates, setGroupStates] = useState(createInitialGroupStates);
  const [activeGroupId, setActiveGroupId] = useState<ApplicationGroupId>("iam");
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

  const activeGroup = APPLICATION_GROUPS.find((group) => group.id === activeGroupId) ?? APPLICATION_GROUPS[0];
  const activeState = groupStates[activeGroup.id];

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
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return activeState.items;
    }
    return activeState.items.filter((item) =>
      [item.name, item.reference, item.domain, item.kind, item.status]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)));
  }, [activeState.items, query]);

  const columns = useMemo<DataTableColumn<ApplicationRecord>[]>(() => {
    const identity: DataTableColumn<ApplicationRecord> = {
      cell: (item) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">{item.name}</div>
          {item.reference ? (
            <div className="truncate text-xs text-[var(--sdk-color-text-muted)]">{item.reference}</div>
          ) : null}
        </div>
      ),
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

    if (activeGroup.id === "iam") {
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
  }, [activeGroup.id, messages]);

  const scopeName = context?.organizationName ?? context?.tenantName;
  const subtitle = context
    ? template(
      context.organizationId ? messages.subtitleOrganizationTemplate : messages.subtitleTenantTemplate,
      { name: scopeName ?? context.organizationId ?? context.tenantId },
    )
    : "";
  const activeCopy = messages.groups[activeGroup.messageKey];
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
        <nav
          aria-label={messages.title}
          className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-2 lg:w-64 lg:flex-col lg:overflow-visible"
        >
          {APPLICATION_GROUPS.map((group) => {
            const copy = messages.groups[group.messageKey];
            const state = groupStates[group.id];
            const active = group.id === activeGroup.id;
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
                onClick={() => setActiveGroupId(group.id)}
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
        </nav>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{activeCopy.label}</h2>
              <p className="text-sm text-[var(--sdk-color-text-muted)]">{activeCopy.description}</p>
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

          {context?.organizationId && activeGroup.id === "app-store" ? (
            <StatusNotice tone="warning">{messages.organizationAppStoreNotice}</StatusNotice>
          ) : null}

          {activeState.status === "error" ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>
                  {isApplicationSourceUnavailable(activeState.error) ? messages.unavailable : messages.loadError}
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
            loading={activeState.status === "loading"}
            rowActions={(item) => (
              <Button onClick={() => openAccessToken(item)} size="sm" type="button" variant="outline">
                <KeyRound className="h-3.5 w-3.5" />
                {messages.accessToken.action}
              </Button>
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

export const CloudRouterOrganizationApplicationsPage: ComponentType = function CloudRouterOrganizationApplicationsPageEntry() {
  const { organizationId } = useParams<{ organizationId: string }>();
  if (!organizationId) {
    return null;
  }
  return <ApplicationManagementPage backTo="/admin/iam/organizations" organizationId={organizationId} />;
};

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
