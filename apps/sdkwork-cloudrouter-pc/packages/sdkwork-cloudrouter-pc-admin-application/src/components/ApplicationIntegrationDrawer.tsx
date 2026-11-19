import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import {
  ScopeResourcePickerDialog,
  type ScopeResourcePickerItem,
  type ScopeResourcePickerLabels,
  type ScopeResourcePickerPage,
  type ScopeResourcePickerSource,
} from "@sdkwork/cloudroutes-pc-commons";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  emptyEnvironmentIntegration,
  isPaymentAccountCompatible,
  readApplicationIntegrationDocument,
  resolveDeployApplicationForRecord,
  toChannelBinding,
  toPaymentBinding,
  validateApplicationIntegration,
} from "../services/application-integration-document";
import {
  evaluateApplicationIntegrationReadiness,
  INTEGRATION_REQUIREMENT_ORDER,
  isBindableEnvironmentKey,
  matchesProviderPrefix,
  resolveApplicationIntegrationSurface,
  type ApplicationIntegrationReadiness,
  type ApplicationIntegrationReadinessStatus,
  type ApplicationIntegrationSurface,
  type IntegrationRequirementKey,
} from "../services/application-integration-requirements";
import type {
  ApplicationChannelAccountOption,
  ApplicationEnvironmentIntegration,
  ApplicationEnvironmentOption,
  ApplicationIntegrationBindings,
  ApplicationIntegrationIssue,
  ApplicationIntegrationIssueCode,
  ApplicationIntegrationKind,
  ApplicationIntegrationSaveResult,
  ApplicationIntegrationService,
  ApplicationPaymentAccountOption,
  ChannelAccountKind,
  IntegrationAccountScope,
} from "../types/application-integrations";
import type { ApplicationRecord } from "../types/application-catalog";

interface CatalogState<T> {
  status: "loading" | "ready" | "error";
  items: readonly T[];
  error?: unknown;
}

export interface ApplicationIntegrationDrawerProps {
  application: ApplicationRecord;
  deployApplications: readonly ApplicationRecord[];
  kind: ApplicationIntegrationKind;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: (result: ApplicationIntegrationSaveResult) => void;
  service: ApplicationIntegrationService;
}

/**
 * One drawer for the three application integration actions.
 *
 * The shell is shared on purpose: the Deploy anchor, environment scoping,
 * validation and save semantics are identical for payments, official accounts
 * and mini programs; only the catalog and the editable slot differ.
 */
export function ApplicationIntegrationDrawer({
  application,
  deployApplications,
  kind,
  messages,
  onClose,
  onSaved,
  service,
}: ApplicationIntegrationDrawerProps) {
  const copy = messages.integrations;
  const [selectedDeployAppId, setSelectedDeployAppId] = useState(
    () => resolveDeployApplicationForRecord(application, deployApplications)?.id ?? "",
  );
  const [initialDeployAppId] = useState(selectedDeployAppId);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [paymentCatalog, setPaymentCatalog] = useState<CatalogState<ApplicationPaymentAccountOption>>({
    items: [],
    status: "loading",
  });
  const [officialCatalog, setOfficialCatalog] = useState<CatalogState<ApplicationChannelAccountOption>>({
    items: [],
    status: "loading",
  });
  const [miniProgramCatalog, setMiniProgramCatalog] = useState<CatalogState<ApplicationChannelAccountOption>>({
    items: [],
    status: "loading",
  });
  const [environments, setEnvironments] = useState<readonly ApplicationEnvironmentOption[]>([]);
  const [environmentsStatus, setEnvironmentsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bindingsStatus, setBindingsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [legacySeed, setLegacySeed] = useState(false);
  const [iamApplicationType, setIamApplicationType] = useState<string>();
  const [environmentKey, setEnvironmentKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ApplicationEnvironmentIntegration>>({});
  const [baseline, setBaseline] = useState<Record<string, ApplicationEnvironmentIntegration>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [saveError, setSaveError] = useState<unknown>();

  // Catalogs are independent so a missing payment service cannot blank the
  // official-account drawer (and vice versa); each error is reported on its own.
  useEffect(() => {
    let cancelled = false;
    setPaymentCatalog({ items: [], status: "loading" });
    void service.loadPaymentAccounts()
      .then((items) => {
        if (!cancelled) setPaymentCatalog({ items, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setPaymentCatalog({ error, items: [], status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken, kind, service]);

  useEffect(() => {
    let cancelled = false;
    setOfficialCatalog({ items: [], status: "loading" });
    void service.loadChannelAccounts("official-account")
      .then((items) => {
        if (!cancelled) setOfficialCatalog({ items, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setOfficialCatalog({ error, items: [], status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken, kind, service]);

  useEffect(() => {
    let cancelled = false;
    setMiniProgramCatalog({ items: [], status: "loading" });
    void service.loadChannelAccounts("mini-program")
      .then((items) => {
        if (!cancelled) setMiniProgramCatalog({ items, status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setMiniProgramCatalog({ error, items: [], status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken, kind, service]);

  useEffect(() => {
    let cancelled = false;
    const deployApplication = deployApplications.find((candidate) => candidate.id === selectedDeployAppId);
    if (!deployApplication) {
      setEnvironments([]);
      setEnvironmentsStatus("ready");
      setBindingsStatus("ready");
      setLegacySeed(false);
      setEnvironmentKey("");
      setDrafts({});
      setBaseline({});
      return () => {
        cancelled = true;
      };
    }
    setEnvironmentsStatus("loading");
    setBindingsStatus("loading");
    void (async () => {
      let loaded: readonly ApplicationEnvironmentOption[] = [];
      let environmentsFailed = false;
      try {
        loaded = await service.loadEnvironments(deployApplication.id, deployApplication.environment);
      } catch {
        environmentsFailed = true;
        const fallback = deployApplication.environment?.trim().toLowerCase();
        loaded = fallback ? [{ key: fallback }] : [];
      }
      let bindings: ApplicationIntegrationBindings | undefined;
      let bindingsFailed = false;
      if (service.loadBindings) {
        try {
          bindings = await service.loadBindings(deployApplication.id, deployApplication.metadata);
        } catch {
          bindingsFailed = true;
        }
      }
      if (cancelled) {
        return;
      }
      const legacy = readApplicationIntegrationDocument(deployApplication.metadata);
      // The authority wins; the legacy document is only a migration seed when
      // the resource-link table has no row for this app yet.
      const seedSource = bindings?.environments ?? legacy.environments;
      const keys = new Set<string>([
        ...loaded.map((environment) => environment.key),
        ...Object.keys(seedSource),
      ]);
      if (deployApplication.environment?.trim()) {
        keys.add(deployApplication.environment.trim().toLowerCase());
      }
      const options = [...keys]
        .map((key) => loaded.find((environment) => environment.key === key) ?? { key })
        .sort(compareEnvironmentOptions);
      const seed = Object.fromEntries(
        options.map((environment) => [
          environment.key,
          seedSource[environment.key] ?? emptyEnvironmentIntegration(),
        ]),
      );
      setEnvironments(options);
      setDrafts(seed);
      setBaseline(seed);
      setLegacySeed(bindings?.legacySeed ?? false);
      setEnvironmentKey((current) => preferredEnvironmentKey(options, current, deployApplication.environment));
      setEnvironmentsStatus(environmentsFailed ? "error" : "ready");
      setBindingsStatus(bindingsFailed ? "error" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken, deployApplications, selectedDeployAppId, service]);

  // Cross-plane consistency: the IAM installation and the Deploy app describe
  // the same endpoint. The lookup is optional and never blocks the drawer; a
  // missing installation simply omits the governance warning.
  useEffect(() => {
    const deployApplication = deployApplications.find(
      (candidate) => candidate.id === selectedDeployAppId,
    );
    const deployApplicationId = deployApplication?.deployApplicationId;
    if (!service.loadIamApplicationType || !selectedDeployAppId || !deployApplicationId) {
      setIamApplicationType(undefined);
      return;
    }
    let cancelled = false;
    setIamApplicationType(undefined);
    void service.loadIamApplicationType(deployApplicationId)
      .then((value) => {
        if (!cancelled) {
          setIamApplicationType(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIamApplicationType(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [deployApplications, selectedDeployAppId, service]);

  const selectedDeployApplication = deployApplications.find(
    (candidate) => candidate.id === selectedDeployAppId,
  );
  // One Deploy app carries one row per application system. A candidate already
  // linked to another IAM/App Store row is not offered, so the picker cannot
  // create an ambiguous one-to-many link.
  const anchorCandidates = deployApplications.filter((candidate) => {
    if (candidate.id === selectedDeployAppId) {
      return true;
    }
    const document = readApplicationIntegrationDocument(candidate.metadata);
    return !document.linkedApplications.some(
      (link) => link.groupId === application.groupId && link.id !== application.id,
    );
  });
  const environment = environments.find((candidate) => candidate.key === environmentKey);
  const draft = drafts[environmentKey] ?? emptyEnvironmentIntegration();
  const appKind = selectedDeployApplication?.kind ?? application.kind;
  const surface = useMemo(() => resolveApplicationIntegrationSurface(appKind), [appKind]);
  const readiness = useMemo(
    () => evaluateApplicationIntegrationReadiness({ appKind, integration: draft }),
    [appKind, draft],
  );
  const environmentBindable = isBindableEnvironmentKey(environmentKey);
  const currentValidation = useMemo(() => {
    if (!allCatalogsReady(paymentCatalog, officialCatalog, miniProgramCatalog, bindingsStatus)) {
      return [];
    }
    return validateApplicationIntegration({
      ...(appKind ? { appKind } : {}),
      ...(iamApplicationType ? { iamApplicationType } : {}),
      environment: environmentKey,
      ...(environment?.level === undefined ? {} : { environmentLevel: environment.level }),
      integration: draft,
      paymentAccounts: paymentCatalog.items,
      channelAccounts: [...officialCatalog.items, ...miniProgramCatalog.items],
    });
  }, [
    appKind,
    bindingsStatus,
    draft,
    environment?.level,
    environmentKey,
    iamApplicationType,
    miniProgramCatalog,
    officialCatalog,
    paymentCatalog,
  ]);

  const changedEnvironmentKeys = useMemo(
    () => Object.keys(drafts).filter(
      (key) => integrationFingerprint(drafts[key] ?? emptyEnvironmentIntegration())
        !== integrationFingerprint(baseline[key] ?? emptyEnvironmentIntegration()),
    ),
    [baseline, drafts],
  );
  const anchorChanged = selectedDeployAppId !== initialDeployAppId && Boolean(selectedDeployAppId);
  const dirty = anchorChanged || changedEnvironmentKeys.length > 0;

  const changedIssuesByEnvironment = useMemo(() => {
    const issuesByEnvironment = new Map<string, ApplicationIntegrationIssue[]>();
    if (!allCatalogsReady(paymentCatalog, officialCatalog, miniProgramCatalog, bindingsStatus)) {
      return issuesByEnvironment;
    }
    for (const key of changedEnvironmentKeys) {
      const option = environments.find((candidate) => candidate.key === key);
      issuesByEnvironment.set(key, validateApplicationIntegration({
        ...(appKind ? { appKind } : {}),
        ...(iamApplicationType ? { iamApplicationType } : {}),
        environment: key,
        ...(option?.level === undefined ? {} : { environmentLevel: option.level }),
        integration: drafts[key] ?? emptyEnvironmentIntegration(),
        paymentAccounts: paymentCatalog.items,
        channelAccounts: [...officialCatalog.items, ...miniProgramCatalog.items],
      }));
    }
    return issuesByEnvironment;
  }, [
    appKind,
    bindingsStatus,
    changedEnvironmentKeys,
    drafts,
    environments,
    iamApplicationType,
    miniProgramCatalog,
    officialCatalog,
    paymentCatalog,
  ]);
  const errorCount = [...changedIssuesByEnvironment.values()]
    .flat()
    .filter((issue) => issue.severity === "error").length;
  const warningCount = currentValidation.filter((issue) => issue.severity === "warning").length;

  const setDraft = (next: ApplicationEnvironmentIntegration) => {
    if (!environmentKey) {
      return;
    }
    setDrafts((current) => ({ ...current, [environmentKey]: next }));
    setFormError(undefined);
    setSaveError(undefined);
  };

  const bindPayment = (option: ApplicationPaymentAccountOption) => {
    const sameProvider = draft.paymentAccounts.filter((account) => account.providerCode === option.providerCode);
    const isDefault = !sameProvider.some((account) => account.isDefault);
    setDraft({
      ...draft,
      paymentAccounts: [...draft.paymentAccounts, toPaymentBinding(option, isDefault)],
    });
  };

  const removePayment = (accountId: string) => {
    const target = draft.paymentAccounts.find((account) => account.id === accountId);
    const rest = draft.paymentAccounts.filter((account) => account.id !== accountId);
    if (target?.isDefault) {
      const promotedIndex = rest.findIndex((account) => account.providerCode === target.providerCode);
      if (promotedIndex >= 0) {
        rest[promotedIndex] = { ...rest[promotedIndex], isDefault: true };
      }
    }
    setDraft({ ...draft, paymentAccounts: rest });
  };

  const makePaymentDefault = (accountId: string) => {
    const target = draft.paymentAccounts.find((account) => account.id === accountId);
    if (!target) {
      return;
    }
    setDraft({
      ...draft,
      paymentAccounts: draft.paymentAccounts.map((account) =>
        account.providerCode === target.providerCode
          ? { ...account, isDefault: account.id === accountId }
          : account),
    });
  };

  const bindChannel = (channelKind: ChannelAccountKind, option: ApplicationChannelAccountOption) => {
    const binding = toChannelBinding(option, channelKind);
    setDraft(channelKind === "official-account"
      ? { ...draft, officialAccount: binding }
      : { ...draft, miniProgram: binding });
  };

  const clearChannel = (channelKind: ChannelAccountKind) => {
    if (channelKind === "official-account") {
      const next = { ...draft };
      delete next.officialAccount;
      setDraft(next);
      return;
    }
    const next = { ...draft };
    delete next.miniProgram;
    setDraft(next);
  };

  const handleSave = async () => {
    setFormError(undefined);
    setSaveError(undefined);
    if (!selectedDeployApplication) {
      setFormError(copy.drawer.anchor.required);
      return;
    }
    if (!dirty) {
      setFormError(copy.drawer.noChanges);
      return;
    }
    const unbindableEnvironments = changedEnvironmentKeys.filter((key) => !isBindableEnvironmentKey(key));
    if (unbindableEnvironments.length > 0) {
      setEnvironmentKey(unbindableEnvironments[0]);
      setFormError(copy.drawer.environment.notBindable);
      return;
    }
    if (errorCount > 0) {
      const firstInvalidEnvironment = [...changedIssuesByEnvironment.entries()]
        .find(([, issues]) => issues.some((issue) => issue.severity === "error"))?.[0];
      if (firstInvalidEnvironment && firstInvalidEnvironment !== environmentKey) {
        setEnvironmentKey(firstInvalidEnvironment);
      }
      setFormError(template(copy.drawer.errors, { count: String(errorCount) }));
      return;
    }
    setSaving(true);
    try {
      const result = await service.save({
        deployAppId: selectedDeployApplication.id,
        ...(application.groupId === "deploy"
          ? {}
          : {
            linkedApplication: {
              groupId: application.groupId,
              id: application.id,
              ...(application.reference === undefined ? {} : { reference: application.reference }),
              ...(application.name ? { name: application.name } : {}),
            },
            ...(initialDeployAppId && initialDeployAppId !== selectedDeployApplication.id
              ? { previousDeployAppId: initialDeployAppId }
              : {}),
          }),
        environments: changedEnvironmentKeys.map((key) => ({
          key,
          integration: drafts[key] ?? emptyEnvironmentIntegration(),
        })),
      });
      setSaving(false);
      onSaved(result);
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "application-integration-anchor-conflict") {
        setFormError(copy.drawer.anchor.conflict);
      } else {
        setSaveError(error);
      }
      setSaving(false);
    }
  };

  const relevantCatalog = kind === "payment"
    ? paymentCatalog
    : kind === "official-account"
      ? officialCatalog
      : miniProgramCatalog;
  const catalogLoading = relevantCatalog.status === "loading"
    || environmentsStatus === "loading"
    || bindingsStatus === "loading";
  const catalogFailed = relevantCatalog.status === "error";
  const bindingsFailed = bindingsStatus === "error";

  const selectedChannel = kind === "official-account" ? draft.officialAccount : draft.miniProgram;
  const pickerCopy = copy.picker;
  const pickerLabels = useMemo<ScopeResourcePickerLabels>(() => ({
    title: pickerCopy.title[kindKey(kind)],
    description: pickerCopy.description[kindKey(kind)],
    searchPlaceholder: pickerCopy.searchPlaceholder,
    empty: pickerCopy.empty,
    emptySearch: pickerCopy.emptySearch,
    loading: pickerCopy.loading,
    error: pickerCopy.error,
    retry: pickerCopy.retry,
    cancel: pickerCopy.cancel,
    confirm: pickerCopy.confirm,
    loadMore: pickerCopy.loadMore,
    scopeLabel: pickerCopy.scopeLabel,
    listLabel: pickerCopy.listLabel,
    close: pickerCopy.close,
    selectedCount: (count) => pickerCopy.selectedCount.replace("{count}", String(count)),
  }), [kind, pickerCopy]);

  const pickerSources = useMemo<readonly ScopeResourcePickerSource[]>(() => buildPickerSources({
    // A Douyin surface must not offer the tenant's WeChat mini programs only to
    // reject them on save; the picker keeps the accounts the kind can act as.
    channelItems: (kind === "official-account" ? officialCatalog.items : miniProgramCatalog.items)
      .filter((item) => matchesProviderPrefix(item.providerCode, surface.channelProviderPrefixes)),
    kind,
    messages,
    paymentItems: paymentCatalog.items
      .filter((item) => matchesProviderPrefix(item.providerCode, surface.paymentProviderPrefixes)),
    service,
  }), [
    kind,
    messages,
    miniProgramCatalog.items,
    officialCatalog.items,
    paymentCatalog.items,
    service,
    surface.channelProviderPrefixes,
    surface.paymentProviderPrefixes,
  ]);

  const pickerInitialSelection = useMemo<readonly ScopeResourcePickerItem[]>(() => (
    kind === "payment"
      ? draft.paymentAccounts.map((account) => paymentBindingToPickerItem(account, messages))
      : selectedChannel
        ? [channelBindingToPickerItem(selectedChannel, messages)]
        : []
  ), [draft.paymentAccounts, kind, messages, selectedChannel]);

  const applyPickerSelection = (items: readonly ScopeResourcePickerItem[]) => {
    if (kind === "payment") {
      const existing = new Map(draft.paymentAccounts.map((account) => [account.id, account]));
      const next: ApplicationEnvironmentIntegration["paymentAccounts"] = [];
      for (const item of items) {
        const prior = existing.get(item.id);
        if (prior) {
          next.push(prior);
          continue;
        }
        const option = asPaymentOption(item.payload);
        if (!option) {
          continue;
        }
        const providerHasDefault = next.some(
          (account) => account.providerCode === option.providerCode && account.isDefault,
        );
        next.push(toPaymentBinding(option, !providerHasDefault));
      }
      setDraft({ ...draft, paymentAccounts: next });
    } else {
      const option = asChannelOption(items[0]?.payload);
      if (option) {
        bindChannel(kind, option);
      }
    }
    setPickerOpen(false);
  };

  return (
    <Drawer
      modal={false}
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="xl">
        <DrawerHeader>
          <DrawerTitle>{copy.drawer.titles[kindKey(kind)]}</DrawerTitle>
          <DrawerDescription>
            {template(copy.drawer.descriptions[kindKey(kind)], { app: application.name })}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--sdk-color-text-muted)]">{copy.drawer.application}</dt>
            <dd className="min-w-0 truncate font-medium text-[var(--sdk-color-text-primary)]">
              {application.name}
              {application.reference ? ` · ${application.reference}` : ""}
            </dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{copy.drawer.deployAnchor}</dt>
            <dd className="min-w-0 truncate">
              {selectedDeployApplication
                ? `${selectedDeployApplication.name}${selectedDeployApplication.reference ? ` · ${selectedDeployApplication.reference}` : ""}`
                : "-"}
            </dd>
          </dl>

          {application.groupId !== "deploy" ? (
            <section className="space-y-2">
              <div>
                <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                  {copy.drawer.anchor.title}
                </h3>
                <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                  {copy.drawer.anchor.description}
                </p>
              </div>
              {anchorCandidates.length === 0 ? (
                <StatusNotice tone="warning">{copy.drawer.anchor.noDeployApps}</StatusNotice>
              ) : (
                <Select
                  onValueChange={(value) => {
                    setSelectedDeployAppId(value);
                    setFormError(undefined);
                    setSaveError(undefined);
                  }}
                  value={selectedDeployAppId}
                >
                  <SelectTrigger aria-label={copy.drawer.anchor.title}>
                    <SelectValue placeholder={copy.drawer.anchor.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {anchorCandidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                        {candidate.reference ? ` · ${candidate.reference}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                {copy.drawer.environment.label}
              </h3>
              <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                {copy.drawer.environment.description}
              </p>
            </div>
            {environments.length === 0 ? (
              <StatusNotice tone="warning">{copy.drawer.environment.empty}</StatusNotice>
            ) : (
              <Select onValueChange={setEnvironmentKey} value={environmentKey}>
                <SelectTrigger aria-label={copy.drawer.environment.label}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((candidate) => (
                    <SelectItem key={candidate.key} value={candidate.key}>
                      {environmentLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </section>

          {legacySeed ? (
            <StatusNotice tone="warning">{copy.drawer.legacySeed}</StatusNotice>
          ) : null}

          {bindingsFailed ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>{copy.drawer.bindingsLoadError}</span>
                <Button
                  onClick={() => setCatalogReloadToken((token) => token + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {copy.drawer.retry}
                </Button>
              </span>
            </StatusNotice>
          ) : null}

          {environmentKey && !environmentBindable ? (
            <StatusNotice tone="warning">{copy.drawer.environment.notBindable}</StatusNotice>
          ) : null}

          <ReadinessSection copy={copy} integration={draft} readiness={readiness} surface={surface} />

          {catalogFailed ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>{catalogFailureMessage(relevantCatalog.error, copy)}</span>
                <Button onClick={() => setCatalogReloadToken((token) => token + 1)} size="sm" type="button" variant="outline">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {copy.drawer.retry}
                </Button>
              </span>
            </StatusNotice>
          ) : null}

          {catalogLoading ? (
            <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
              {copy.drawer.loading}
            </p>
          ) : null}

          {!catalogLoading && !catalogFailed && kind === "payment" ? (
            <PaymentSection
              boundAccounts={draft.paymentAccounts}
              copy={copy}
              disabled={!environmentBindable}
              environmentKey={environmentKey}
              environmentLevel={environment?.level}
              messages={messages}
              onMakeDefault={makePaymentDefault}
              onOpenPicker={() => setPickerOpen(true)}
              onRemove={removePayment}
            />
          ) : null}

          {!catalogLoading && !catalogFailed && kind !== "payment" ? (
            <ChannelSection
              channelKind={kind}
              copy={copy}
              disabled={!environmentBindable}
              messages={messages}
              onClear={clearChannel}
              onOpenPicker={() => setPickerOpen(true)}
              selected={selectedChannel}
            />
          ) : null}

          {currentValidation.length > 0 ? (
            <ValidationNotice copy={copy} issues={currentValidation} tone={currentValidation.some((issue) => issue.severity === "error") ? "danger" : "warning"} />
          ) : null}

          {formError ? <StatusNotice tone="danger">{formError}</StatusNotice> : null}
          {saveError ? (
            <StatusNotice tone="danger">
              {isForbiddenError(saveError) ? copy.drawer.forbidden : copy.drawer.saveError}
            </StatusNotice>
          ) : null}
          {!formError && !saveError && errorCount > 0 ? (
            <p className="text-xs text-[var(--sdk-color-text-muted)]">
              {template(copy.drawer.errors, { count: String(errorCount) })}
            </p>
          ) : null}
          {!formError && !saveError && errorCount === 0 && warningCount > 0 ? (
            <p className="text-xs text-[var(--sdk-color-text-muted)]">
              {template(copy.drawer.warnings, { count: String(warningCount) })}
            </p>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={saving} onClick={onClose} type="button" variant="secondary">
            {copy.drawer.close}
          </Button>
          <Button disabled={saving || !dirty} onClick={() => void handleSave()} type="button">
            {saving ? copy.drawer.saving : copy.drawer.save}
          </Button>
        </DrawerFooter>
        <ScopeResourcePickerDialog
          initialSelection={pickerInitialSelection}
          labels={pickerLabels}
          mode={kind === "payment" ? "multiple" : "single"}
          onConfirm={applyPickerSelection}
          onOpenChange={setPickerOpen}
          open={pickerOpen}
          sources={pickerSources}
        />
      </DrawerContent>
    </Drawer>
  );
}

function PaymentSection({
  boundAccounts,
  copy,
  disabled,
  environmentKey,
  environmentLevel,
  messages,
  onMakeDefault,
  onOpenPicker,
  onRemove,
}: {
  boundAccounts: ApplicationEnvironmentIntegration["paymentAccounts"];
  copy: ApplicationCatalogMessages["integrations"];
  disabled: boolean;
  environmentKey: string;
  environmentLevel?: string;
  messages: ApplicationCatalogMessages;
  onMakeDefault: (accountId: string) => void;
  onOpenPicker: () => void;
  onRemove: (accountId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--sdk-color-text-primary)]">
        <CreditCard className="h-4 w-4" />
        {copy.payment.boundTitle}
      </h3>
      {boundAccounts.length === 0 ? (
        <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.payment.emptyBound}</p>
      ) : (
        <ul className="space-y-2">
          {boundAccounts.map((account) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-3 py-2"
              key={account.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                    {account.accountName ?? account.accountNo}
                  </span>
                  <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-muted)]">
                    {providerLabel(account.providerCode)}
                  </span>
                  {account.isDefault ? (
                    <span className="rounded-full bg-[var(--sdk-color-brand-primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--sdk-color-brand-primary)]">
                      {copy.payment.defaultBadge}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--sdk-color-text-muted)]">
                  <span>{copy.payment.accountNo}: {account.accountNo}</span>
                  <span>{copy.payment.environment}: {paymentEnvironmentLabel(account.environment, messages)}</span>
                  <span>{copy.payment.mode}: {account.accountMode === "partner" ? copy.payment.partnerMode : copy.payment.directMode}</span>
                  {account.settlementCurrency ? (
                    <span>{copy.payment.currency}: {account.settlementCurrency}</span>
                  ) : null}
                  {account.countryCode ? (
                    <span>{copy.payment.country}: {account.countryCode}</span>
                  ) : null}
                  {!isPaymentAccountCompatible(account.environment, environmentKey, environmentLevel) ? (
                    <span className="text-[var(--sdk-color-status-danger)]">
                      {copy.payment.incompatible}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!account.isDefault ? (
                  <Button disabled={disabled} onClick={() => onMakeDefault(account.id)} size="sm" type="button" variant="outline">
                    <Check className="h-3.5 w-3.5" />
                    {copy.payment.makeDefault}
                  </Button>
                ) : null}
                <Button
                  aria-label={`${copy.payment.remove} ${account.accountName ?? account.accountNo}`}
                  disabled={disabled}
                  onClick={() => onRemove(account.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button disabled={disabled} onClick={onOpenPicker} type="button" variant="outline">
        <Plus className="h-3.5 w-3.5" />
        {copy.picker.paymentOpen}
      </Button>
    </section>
  );
}

function ChannelSection({
  channelKind,
  copy,
  disabled,
  messages,
  onClear,
  onOpenPicker,
  selected,
}: {
  channelKind: ChannelAccountKind;
  copy: ApplicationCatalogMessages["integrations"];
  disabled: boolean;
  messages: ApplicationCatalogMessages;
  onClear: (kind: ChannelAccountKind) => void;
  onOpenPicker: () => void;
  selected: ApplicationEnvironmentIntegration["officialAccount"] | ApplicationEnvironmentIntegration["miniProgram"];
}) {
  const Icon = channelKind === "official-account" ? MessageCircle : Smartphone;
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--sdk-color-text-primary)]">
        <Icon className="h-4 w-4" />
        {copy.channel.currentTitle}
      </h3>
      {!selected ? (
        <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.channel.emptyCurrent}</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-3 py-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                {selected.displayName}
              </span>
              <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-muted)]">
                {providerLabel(selected.providerCode)}
              </span>
              <span className="rounded-full bg-[var(--sdk-color-brand-primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--sdk-color-brand-primary)]">
                {copy.channel.selected}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--sdk-color-text-muted)]">
              <span>{copy.channel.appId}: {selected.appId || "-"}</span>
              {selected.accountType ? <span>{copy.channel.accountType}: {selected.accountType}</span> : null}
              {selected.status ? <span>{copy.channel.status}: {statusLabel(selected.status, messages)}</span> : null}
            </div>
          </div>
          <Button disabled={disabled} onClick={() => onClear(channelKind)} size="sm" type="button" variant="outline">
            <Trash2 className="h-3.5 w-3.5" />
            {copy.channel.clear}
          </Button>
        </div>
      )}
      <Button disabled={disabled} onClick={onOpenPicker} type="button" variant="outline">
        <Link2 className="h-3.5 w-3.5" />
        {selected ? copy.picker.changeChannel : copy.picker.channelOpen}
      </Button>
    </section>
  );
}

function ReadinessSection({
  copy,
  integration,
  readiness,
  surface,
}: {
  copy: ApplicationCatalogMessages["integrations"];
  integration: ApplicationEnvironmentIntegration;
  readiness: ApplicationIntegrationReadiness;
  surface: ApplicationIntegrationSurface;
}) {
  const appKindLabel = copy.appKinds[surface.id] ?? surface.appKind;
  const rows: Array<{
    key: "autoLogin" | "channel" | "checkout" | "payment";
    dimension: ApplicationIntegrationReadiness["channel"];
  }> = [
    { dimension: readiness.channel, key: "channel" },
    { dimension: readiness.payment, key: "payment" },
    { dimension: readiness.autoLogin, key: "autoLogin" },
    { dimension: readiness.checkout, key: "checkout" },
  ];
  const requirements = INTEGRATION_REQUIREMENT_ORDER.filter((requirement) => (
    requirement === "payment-account"
      ? surface.paymentApplies
      : surface.channelKinds.includes(requirement)
  ));
  return (
    <section
      className="space-y-2.5 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-3"
      data-application-integration-app-kind={surface.appKind}
      data-application-integration-readiness={surface.id}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--sdk-color-text-primary)]">
          <ShieldCheck className="h-4 w-4" />
          {copy.readiness.title}
        </h3>
        <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-secondary)]">
          {copy.readiness.appKind}: {appKindLabel}
        </span>
      </div>
      <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">{copy.readiness.description}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(({ dimension, key }) => {
          const statusLabel = readinessStatusLabel(dimension.status, copy);
          const Icon = dimension.status === "ready"
            ? CheckCircle2
            : dimension.status === "incomplete"
              ? AlertTriangle
              : XCircle;
          return (
            <li
              className="flex items-center gap-2 text-xs text-[var(--sdk-color-text-secondary)]"
              data-readiness-dimension={key}
              data-readiness-status={dimension.status}
              key={key}
            >
              <Icon
                aria-hidden="true"
                className={[
                  "h-3.5 w-3.5 shrink-0",
                  dimension.status === "ready"
                    ? "text-[var(--sdk-color-status-success)]"
                    : dimension.status === "incomplete"
                      ? "text-[var(--sdk-color-status-warning)]"
                      : "text-[var(--sdk-color-text-muted)]",
                ].join(" ")}
              />
              <span className="font-medium text-[var(--sdk-color-text-primary)]">
                {copy.readiness.labels[key]}
              </span>
              <span>· {statusLabel}</span>
            </li>
          );
        })}
      </ul>
      {requirements.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--sdk-color-text-secondary)]">
            {copy.readiness.requirements}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {requirements.map((requirement) => {
              const required = surface.requires.includes(requirement);
              const configured = requirementConfigured(requirement, integration);
              return (
                <li key={requirement}>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                      configured
                        ? "border-[var(--sdk-color-status-success)] text-[var(--sdk-color-status-success)]"
                        : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-muted)]",
                    ].join(" ")}
                    data-requirement={requirement}
                    data-requirement-configured={configured ? "true" : "false"}
                    data-requirement-level={required ? "required" : "recommended"}
                  >
                    {configured ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {copy.requirements[requirement]}
                    <span className="opacity-70">
                      · {required ? copy.readiness.required : copy.readiness.recommended}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function requirementConfigured(
  requirement: IntegrationRequirementKey,
  integration: ApplicationEnvironmentIntegration,
): boolean {
  switch (requirement) {
    case "official-account":
      return Boolean(integration.officialAccount);
    case "mini-program":
      return Boolean(integration.miniProgram);
    case "payment-account":
      return integration.paymentAccounts.length > 0;
  }
}

function readinessStatusLabel(
  status: ApplicationIntegrationReadinessStatus,
  copy: ApplicationCatalogMessages["integrations"],
): string {
  return copy.readiness.statuses[status];
}

function buildPickerSources(input: {
  channelItems: readonly ApplicationChannelAccountOption[];
  kind: ApplicationIntegrationKind;
  messages: ApplicationCatalogMessages;
  paymentItems: readonly ApplicationPaymentAccountOption[];
  service: ApplicationIntegrationService;
}): readonly ScopeResourcePickerSource[] {
  const { channelItems, kind, messages, paymentItems, service } = input;
  const copy = messages.integrations.picker;
  const scopes: readonly IntegrationAccountScope[] = ["personal", "organization", "tenant"];
  return scopes.map((scope) => ({
    scope,
    label: copy.scopes[scope],
    description: copy.scopeDescriptions[scope],
    load: async (query) => {
      if (kind === "payment") {
        if (service.loadPaymentAccountPage) {
          const page = await service.loadPaymentAccountPage(scope, query);
          return toPickerPage(page, (option) => paymentOptionToPickerItem(option, messages));
        }
        return localPickerPage(paymentItems, scope, query, (option) => paymentOptionToPickerItem(option, messages), (option) => [
          option.accountName ?? "",
          option.accountNo,
          option.providerCode,
        ]);
      }
      const channelKind = kind;
      if (service.loadChannelAccountPage) {
        const page = await service.loadChannelAccountPage(channelKind, scope, query);
        return toPickerPage(page, (option) => channelOptionToPickerItem(option, messages));
      }
      return localPickerPage(channelItems, scope, query, (option) => channelOptionToPickerItem(option, messages), (option) => [
        option.displayName,
        option.appId,
        option.providerCode,
        option.accountType ?? "",
      ]);
    },
  }));
}

function toPickerPage<T>(
  page: { items: readonly T[]; hasMore: boolean; nextCursor?: string },
  mapItem: (item: T) => ScopeResourcePickerItem,
): ScopeResourcePickerPage {
  return {
    items: page.items.map(mapItem),
    hasMore: page.hasMore,
    ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
  };
}

function localPickerPage<T extends { scope?: IntegrationAccountScope }>(
  items: readonly T[],
  scope: IntegrationAccountScope,
  query: { search: string; cursor?: string; pageSize: number },
  mapItem: (item: T) => ScopeResourcePickerItem,
  searchValues: (item: T) => readonly string[],
): ScopeResourcePickerPage {
  const offset = Math.max(0, Number(query.cursor ?? 0) || 0);
  const needle = query.search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if ((item.scope ?? "tenant") !== scope) {
      return false;
    }
    return !needle || searchValues(item).some((value) => value.toLowerCase().includes(needle));
  });
  const pageItems = filtered.slice(offset, offset + query.pageSize);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems.map(mapItem),
    hasMore: nextOffset < filtered.length,
    ...(nextOffset < filtered.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

function channelOptionToPickerItem(
  option: ApplicationChannelAccountOption,
  messages: ApplicationCatalogMessages,
): ScopeResourcePickerItem {
  return {
    id: option.id,
    scope: option.scope ?? "tenant",
    label: option.displayName,
    description: [providerLabel(option.providerCode), option.accountType].filter(Boolean).join(" · "),
    meta: option.appId || option.id,
    ...(option.enabled ? {} : { badge: messages.integrations.channel.disabled, badgeTone: "danger" as const }),
    disabled: !option.enabled,
    payload: option,
  };
}

function channelBindingToPickerItem(
  binding: NonNullable<ApplicationEnvironmentIntegration["officialAccount"]>,
  messages: ApplicationCatalogMessages,
): ScopeResourcePickerItem {
  return {
    id: binding.id,
    scope: "tenant",
    label: binding.displayName,
    description: providerLabel(binding.providerCode),
    meta: binding.appId || binding.id,
    ...(binding.enabled ? {} : { badge: messages.integrations.channel.disabled, badgeTone: "danger" as const }),
  };
}

function paymentOptionToPickerItem(
  option: ApplicationPaymentAccountOption,
  messages: ApplicationCatalogMessages,
): ScopeResourcePickerItem {
  return {
    id: option.id,
    scope: option.scope ?? "tenant",
    label: option.accountName ?? option.accountNo,
    description: [
      providerLabel(option.providerCode),
      paymentEnvironmentLabel(option.environment, messages),
      option.accountMode === "partner" ? messages.integrations.payment.partnerMode : messages.integrations.payment.directMode,
    ].join(" · "),
    meta: option.accountNo,
    badge: paymentStatusLabel(option.status, messages),
    badgeTone: option.status === "active" ? "success" as const : "warning" as const,
    payload: option,
  };
}

function paymentBindingToPickerItem(
  account: ApplicationEnvironmentIntegration["paymentAccounts"][number],
  messages: ApplicationCatalogMessages,
): ScopeResourcePickerItem {
  return {
    id: account.id,
    scope: "tenant",
    label: account.accountName ?? account.accountNo,
    description: [providerLabel(account.providerCode), paymentEnvironmentLabel(account.environment, messages)].join(" · "),
    meta: account.accountNo,
    ...(account.isDefault ? { badge: messages.integrations.payment.defaultBadge, badgeTone: "success" as const } : {}),
  };
}

function asChannelOption(value: unknown): ApplicationChannelAccountOption | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.appId === "string" && typeof record.kind === "string"
    ? (value as ApplicationChannelAccountOption)
    : undefined;
}

function asPaymentOption(value: unknown): ApplicationPaymentAccountOption | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.accountNo === "string" && typeof record.providerCode === "string"
    ? (value as ApplicationPaymentAccountOption)
    : undefined;
}

function ValidationNotice({
  copy,
  issues,
  tone,
}: {
  copy: ApplicationCatalogMessages["integrations"];
  issues: readonly ApplicationIntegrationIssue[];
  tone: "danger" | "warning";
}) {
  const unique = dedupeIssues(issues);
  return (
    <StatusNotice tone={tone}>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          {tone === "danger"
            ? template(copy.drawer.errors, { count: String(unique.filter((issue) => issue.severity === "error").length) })
            : template(copy.drawer.warnings, { count: String(unique.length) })}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs leading-5">
          {unique.map((issue) => (
            <li key={`${issue.code}:${JSON.stringify(issue.params ?? {})}`}>
              {localizeIssue(issue, copy)}
            </li>
          ))}
        </ul>
      </div>
    </StatusNotice>
  );
}

function localizeIssue(
  issue: ApplicationIntegrationIssue,
  copy: ApplicationCatalogMessages["integrations"],
): string {
  const templateText = copy.validation[issue.code as ApplicationIntegrationIssueCode];
  if (!templateText) {
    return issue.code;
  }
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(issue.params ?? {})) {
    if (key === "surface") {
      params.surface = copy.appKinds[value as ApplicationIntegrationSurface["id"]] ?? value;
      continue;
    }
    if (key === "requirement") {
      params.requirement = copy.requirements[value as IntegrationRequirementKey] ?? value;
      continue;
    }
    params[key] = value;
  }
  return template(templateText, params);
}

function dedupeIssues(issues: readonly ApplicationIntegrationIssue[]): ApplicationIntegrationIssue[] {
  const seen = new Set<string>();
  const unique: ApplicationIntegrationIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${JSON.stringify(issue.params ?? {})}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(issue);
  }
  return unique;
}

function allCatalogsReady(
  payment: CatalogState<ApplicationPaymentAccountOption>,
  official: CatalogState<ApplicationChannelAccountOption>,
  miniProgram: CatalogState<ApplicationChannelAccountOption>,
  bindings: "loading" | "ready" | "error",
): boolean {
  return payment.status === "ready"
    && official.status === "ready"
    && miniProgram.status === "ready"
    && bindings !== "loading";
}

function isForbiddenError(error: unknown): boolean {
  return Number((error as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (error as { statusCode?: unknown } | null)?.statusCode) === 403;
}

function catalogFailureMessage(
  error: unknown,
  copy: ApplicationCatalogMessages["integrations"],
): string {
  const status = Number((error as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (error as { statusCode?: unknown } | null)?.statusCode);
  if (status === 403) {
    return copy.drawer.forbidden;
  }
  if (status === 404 || status === 501) {
    return copy.drawer.unavailable;
  }
  return copy.drawer.loadError;
}

function preferredEnvironmentKey(
  environments: readonly ApplicationEnvironmentOption[],
  current: string,
  fallback: string | undefined,
): string {
  if (current && environments.some((environment) => environment.key === current)) {
    return current;
  }
  const normalizedFallback = fallback?.trim().toLowerCase();
  if (normalizedFallback && environments.some((environment) => environment.key === normalizedFallback)) {
    return normalizedFallback;
  }
  return environments[0]?.key ?? "";
}

function compareEnvironmentOptions(
  left: ApplicationEnvironmentOption,
  right: ApplicationEnvironmentOption,
): number {
  const order: Record<string, number> = { DEVELOPMENT: 0, STAGING: 1, PRODUCTION: 2 };
  return (order[(left.level ?? "").toUpperCase()] ?? 3) - (order[(right.level ?? "").toUpperCase()] ?? 3)
    || left.key.localeCompare(right.key);
}

function environmentLabel(environment: ApplicationEnvironmentOption): string {
  const base = environment.name?.trim() || environment.key;
  return environment.level ? `${base} · ${environment.level}` : base;
}

function paymentEnvironmentLabel(environment: string, messages: ApplicationCatalogMessages): string {
  const normalized = environment.trim().toLowerCase();
  if (normalized === "development" || normalized === "sandbox" || normalized === "production") {
    return messages.integrations.paymentEnvironments[normalized];
  }
  return environment;
}

function paymentStatusLabel(status: string, messages: ApplicationCatalogMessages): string {
  const normalized = status.trim().toLowerCase();
  const labels = messages.integrations.paymentStatuses as Record<string, string>;
  return labels[normalized] ?? labels.unknown;
}

function statusLabel(status: string, messages: ApplicationCatalogMessages): string {
  const normalized = status.trim().toLowerCase();
  const labels = messages.statuses as Record<string, string>;
  return labels[normalized] ?? status;
}

function providerLabel(providerCode: string): string {
  const normalized = providerCode.trim().toLowerCase();
  switch (normalized) {
    case "wechat_pay":
      return "WeChat Pay";
    case "wechat":
    case "wechat_official_account":
      return "WeChat";
    case "wechat_mini_program":
      return "WeChat Mini Program";
    case "alipay":
      return "Alipay";
    case "stripe":
      return "Stripe";
    case "apple_pay":
      return "Apple Pay";
    case "google_pay":
      return "Google Pay";
    case "sandbox":
      return "Sandbox";
    default:
      return providerCode || "-";
  }
}

function kindKey(kind: ApplicationIntegrationKind): "miniProgram" | "officialAccount" | "payment" {
  if (kind === "official-account") {
    return "officialAccount";
  }
  return kind === "mini-program" ? "miniProgram" : "payment";
}

function integrationFingerprint(integration: ApplicationEnvironmentIntegration): string {
  return JSON.stringify({
    officialAccount: integration.officialAccount?.id ?? "",
    miniProgram: integration.miniProgram?.id ?? "",
    paymentAccounts: [...integration.paymentAccounts]
      .map((account) => `${account.id}:${account.providerCode}:${account.isDefault ? 1 : 0}`)
      .sort(),
  });
}

function template(value: string, replacements: Readonly<Record<string, string>>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}

