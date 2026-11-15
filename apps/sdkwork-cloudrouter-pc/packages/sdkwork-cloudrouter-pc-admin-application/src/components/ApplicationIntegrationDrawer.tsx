import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  emptyEnvironmentIntegration,
  isPaymentAccountCompatible,
  readApplicationIntegrationDocument,
  readEnvironmentIntegration,
  resolveDeployApplicationForRecord,
  toChannelBinding,
  toPaymentBinding,
  validateApplicationIntegration,
} from "../services/application-integration-document";
import type {
  ApplicationChannelAccountOption,
  ApplicationEnvironmentIntegration,
  ApplicationEnvironmentOption,
  ApplicationIntegrationIssue,
  ApplicationIntegrationIssueCode,
  ApplicationIntegrationKind,
  ApplicationIntegrationSaveResult,
  ApplicationIntegrationService,
  ApplicationPaymentAccountOption,
  ChannelAccountKind,
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
  const [environmentKey, setEnvironmentKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ApplicationEnvironmentIntegration>>({});
  const [baseline, setBaseline] = useState<Record<string, ApplicationEnvironmentIntegration>>({});
  const [paymentQuery, setPaymentQuery] = useState("");
  const [channelQuery, setChannelQuery] = useState("");
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
      setEnvironmentKey("");
      setDrafts({});
      setBaseline({});
      return () => {
        cancelled = true;
      };
    }
    setEnvironmentsStatus("loading");
    void service.loadEnvironments(deployApplication.id, deployApplication.environment)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        const document = readApplicationIntegrationDocument(deployApplication.metadata);
        const keys = new Set<string>([
          ...loaded.map((environment) => environment.key),
          ...Object.keys(document.environments),
        ]);
        if (deployApplication.environment?.trim()) {
          keys.add(deployApplication.environment.trim());
        }
        const options = [...keys]
          .map((key) => loaded.find((environment) => environment.key === key) ?? { key })
          .sort(compareEnvironmentOptions);
        const seed = Object.fromEntries(
          options.map((environment) => [environment.key, readEnvironmentIntegration(document, environment.key)]),
        );
        setEnvironments(options);
        setDrafts(seed);
        setBaseline(seed);
        setEnvironmentKey((current) => preferredEnvironmentKey(options, current, deployApplication.environment));
        setEnvironmentsStatus("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        const fallback = deployApplication.environment?.trim();
        const options: ApplicationEnvironmentOption[] = fallback ? [{ key: fallback }] : [];
        const document = readApplicationIntegrationDocument(deployApplication.metadata);
        const seed = Object.fromEntries(
          options.map((environment) => [environment.key, readEnvironmentIntegration(document, environment.key)]),
        );
        setEnvironments(options);
        setDrafts(seed);
        setBaseline(seed);
        setEnvironmentKey(fallback ?? "");
        setEnvironmentsStatus("error");
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
  const currentValidation = useMemo(() => {
    if (!allCatalogsReady(paymentCatalog, officialCatalog, miniProgramCatalog)) {
      return [];
    }
    return validateApplicationIntegration({
      environment: environmentKey,
      ...(environment?.level === undefined ? {} : { environmentLevel: environment.level }),
      integration: draft,
      paymentAccounts: paymentCatalog.items,
      channelAccounts: [...officialCatalog.items, ...miniProgramCatalog.items],
    });
  }, [draft, environment?.level, environmentKey, miniProgramCatalog, officialCatalog, paymentCatalog]);

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
    if (!allCatalogsReady(paymentCatalog, officialCatalog, miniProgramCatalog)) {
      return issuesByEnvironment;
    }
    for (const key of changedEnvironmentKeys) {
      const option = environments.find((candidate) => candidate.key === key);
      issuesByEnvironment.set(key, validateApplicationIntegration({
        environment: key,
        ...(option?.level === undefined ? {} : { environmentLevel: option.level }),
        integration: drafts[key] ?? emptyEnvironmentIntegration(),
        paymentAccounts: paymentCatalog.items,
        channelAccounts: [...officialCatalog.items, ...miniProgramCatalog.items],
      }));
    }
    return issuesByEnvironment;
  }, [
    changedEnvironmentKeys,
    drafts,
    environments,
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
      setSaveError(error);
      setSaving(false);
    }
  };

  const relevantCatalog = kind === "payment"
    ? paymentCatalog
    : kind === "official-account"
      ? officialCatalog
      : miniProgramCatalog;
  const catalogLoading = relevantCatalog.status === "loading" || environmentsStatus === "loading";
  const catalogFailed = relevantCatalog.status === "error";

  const boundPaymentIds = new Set(draft.paymentAccounts.map((account) => account.id));
  const availablePayments = paymentCatalog.items
    .filter((account) => !boundPaymentIds.has(account.id))
    .filter((account) => matchesQuery(paymentQuery, [
      account.accountName ?? "",
      account.accountNo,
      account.providerCode,
      providerLabel(account.providerCode),
    ]))
    .sort((left, right) => paymentRank(right, environmentKey, environment?.level)
      - paymentRank(left, environmentKey, environment?.level));
  const selectedChannel = kind === "official-account" ? draft.officialAccount : draft.miniProgram;
  const availableChannels = (kind === "official-account" ? officialCatalog.items : miniProgramCatalog.items)
    .filter((account) => account.id !== selectedChannel?.id)
    .filter((account) => matchesQuery(channelQuery, [
      account.displayName,
      account.appId,
      account.providerCode,
      account.accountType ?? "",
    ]));

  return (
    <Drawer
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
              availableAccounts={availablePayments}
              copy={copy}
              environmentKey={environmentKey}
              environmentLevel={environment?.level}
              messages={messages}
              onAdd={bindPayment}
              onMakeDefault={makePaymentDefault}
              onQueryChange={setPaymentQuery}
              onRemove={removePayment}
              query={paymentQuery}
            />
          ) : null}

          {!catalogLoading && !catalogFailed && kind !== "payment" ? (
            <ChannelSection
              availableAccounts={availableChannels}
              channelKind={kind}
              copy={copy}
              messages={messages}
              onClear={clearChannel}
              onQueryChange={setChannelQuery}
              onSelect={bindChannel}
              query={channelQuery}
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
      </DrawerContent>
    </Drawer>
  );
}

function PaymentSection({
  availableAccounts,
  boundAccounts,
  copy,
  environmentKey,
  environmentLevel,
  messages,
  onAdd,
  onMakeDefault,
  onQueryChange,
  onRemove,
  query,
}: {
  availableAccounts: readonly ApplicationPaymentAccountOption[];
  boundAccounts: ApplicationEnvironmentIntegration["paymentAccounts"];
  copy: ApplicationCatalogMessages["integrations"];
  environmentKey: string;
  environmentLevel?: string;
  messages: ApplicationCatalogMessages;
  onAdd: (account: ApplicationPaymentAccountOption) => void;
  onMakeDefault: (accountId: string) => void;
  onQueryChange: (value: string) => void;
  onRemove: (accountId: string) => void;
  query: string;
}) {
  return (
    <>
      <section className="space-y-2">
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
                    <Button onClick={() => onMakeDefault(account.id)} size="sm" type="button" variant="outline">
                      <Check className="h-3.5 w-3.5" />
                      {copy.payment.makeDefault}
                    </Button>
                  ) : null}
                  <Button
                    aria-label={`${copy.payment.remove} ${account.accountName ?? account.accountNo}`}
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
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--sdk-color-text-primary)]">
          <Plus className="h-4 w-4" />
          {copy.payment.availableTitle}
        </h3>
        <label className="relative block">
          <span className="sr-only">{copy.payment.searchPlaceholder}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={copy.payment.searchPlaceholder}
            className="pl-9"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.payment.searchPlaceholder}
            value={query}
          />
        </label>
        {availableAccounts.length === 0 ? (
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.payment.emptyAvailable}</p>
        ) : (
          <ul className="space-y-2">
            {availableAccounts.map((account) => {
              const eligible = account.status === "active"
                && account.capabilities.pay !== false
                && isPaymentAccountCompatible(account.environment, environmentKey, environmentLevel);
              return (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-subtle)] px-3 py-2"
                  key={account.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm text-[var(--sdk-color-text-primary)]">
                        {account.accountName ?? account.accountNo}
                      </span>
                      <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-muted)]">
                        {providerLabel(account.providerCode)}
                      </span>
                      {account.status !== "active" ? (
                        <span className="text-[11px] text-[var(--sdk-color-status-danger)]">
                          {paymentStatusLabel(account.status, messages)}
                        </span>
                      ) : null}
                      {account.capabilities.pay === false ? (
                        <span className="text-[11px] text-[var(--sdk-color-status-danger)]">
                          {copy.payment.noPayCapability}
                        </span>
                      ) : null}
                      {!isPaymentAccountCompatible(account.environment, environmentKey, environmentLevel) ? (
                        <span className="text-[11px] text-[var(--sdk-color-status-danger)]">
                          {copy.payment.incompatible}
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
                    </div>
                  </div>
                  <Button
                    disabled={!eligible}
                    onClick={() => onAdd(account)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {copy.payment.add}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function ChannelSection({
  availableAccounts,
  channelKind,
  copy,
  messages,
  onClear,
  onQueryChange,
  onSelect,
  query,
  selected,
}: {
  availableAccounts: readonly ApplicationChannelAccountOption[];
  channelKind: ChannelAccountKind;
  copy: ApplicationCatalogMessages["integrations"];
  messages: ApplicationCatalogMessages;
  onClear: (kind: ChannelAccountKind) => void;
  onQueryChange: (value: string) => void;
  onSelect: (kind: ChannelAccountKind, account: ApplicationChannelAccountOption) => void;
  query: string;
  selected: ApplicationEnvironmentIntegration["officialAccount"] | ApplicationEnvironmentIntegration["miniProgram"];
}) {
  const Icon = channelKind === "official-account" ? MessageCircle : Smartphone;
  return (
    <>
      <section className="space-y-2">
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
            <Button onClick={() => onClear(channelKind)} size="sm" type="button" variant="outline">
              <Trash2 className="h-3.5 w-3.5" />
              {copy.channel.clear}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--sdk-color-text-primary)]">
          <Link2 className="h-4 w-4" />
          {copy.channel.availableTitle}
        </h3>
        <label className="relative block">
          <span className="sr-only">{copy.channel.searchPlaceholder}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sdk-color-text-muted)]" />
          <Input
            aria-label={copy.channel.searchPlaceholder}
            className="pl-9"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.channel.searchPlaceholder}
            value={query}
          />
        </label>
        {availableAccounts.length === 0 ? (
          <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.channel.emptyAvailable}</p>
        ) : (
          <ul className="space-y-2">
            {availableAccounts.map((account) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-subtle)] px-3 py-2"
                key={account.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm text-[var(--sdk-color-text-primary)]">
                      {account.displayName}
                    </span>
                    <span className="rounded-full border border-[var(--sdk-color-border-default)] px-2 py-0.5 text-[11px] text-[var(--sdk-color-text-muted)]">
                      {providerLabel(account.providerCode)}
                    </span>
                    <span className={`text-[11px] ${account.enabled ? "text-[var(--sdk-color-text-muted)]" : "text-[var(--sdk-color-status-danger)]"}`}>
                      {account.enabled ? copy.channel.enabled : copy.channel.disabled}
                    </span>
                    {account.authorizationStatus && account.authorizationStatus !== "authorized" ? (
                      <span className="text-[11px] text-[var(--sdk-color-status-warning)]">
                        {copy.channel.unauthorized}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--sdk-color-text-muted)]">
                    <span>{copy.channel.appId}: {account.appId || "-"}</span>
                    {account.accountType ? <span>{copy.channel.accountType}: {account.accountType}</span> : null}
                    {account.status ? <span>{copy.channel.status}: {statusLabel(account.status, messages)}</span> : null}
                  </div>
                </div>
                <Button
                  disabled={!account.enabled}
                  onClick={() => onSelect(channelKind, account)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copy.channel.select}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
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
  return template(templateText, issue.params ?? {});
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
): boolean {
  return payment.status === "ready" && official.status === "ready" && miniProgram.status === "ready";
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
  const normalizedFallback = fallback?.trim();
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

function paymentRank(
  account: ApplicationPaymentAccountOption,
  environmentKey: string,
  environmentLevel: string | undefined,
): number {
  return (account.status === "active" ? 4 : 0)
    + (account.capabilities.pay === false ? 0 : 2)
    + (isPaymentAccountCompatible(account.environment, environmentKey, environmentLevel) ? 1 : 0);
}

function matchesQuery(query: string, values: readonly string[]): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return values.some((value) => value.toLowerCase().includes(normalized));
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

