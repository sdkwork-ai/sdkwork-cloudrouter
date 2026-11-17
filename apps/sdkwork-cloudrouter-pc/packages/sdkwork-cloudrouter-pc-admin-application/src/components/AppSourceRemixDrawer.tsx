import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  StatusNotice,
  Switch,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { isApplicationCenterActionAllowed } from "../permissions/application-center-actions";
import {
  classifyDeployAppSourceError,
  deployAppSourceErrorReason,
  getDeployAppSourceService,
  isDeployAppSourceConflict,
  isDeployAppSourceForbidden,
  isDeployAppSourceNetworkFailure,
  isDeployAppSourceNotFound,
  isDeployAppSourceUnauthorized,
  isDeployAppSourceUnavailable,
} from "../services/deploy-app-source";
import {
  createSourceDraft,
  toSourceUpdatePayload,
  validateSourceDraft,
} from "../services/deploy-app-source-form";
import type { ApplicationRecord } from "../types/application-catalog";
import type {
  DeployAppSourceDraft,
  DeployAppSourceIssue,
  DeployAppSourceIssueField,
  DeployAppSourceService,
  DeployAppSourceSnapshot,
  DeployAppSourceState,
  DeployArtifactOption,
} from "../types/deploy-app-source";
import { DEPLOY_APP_SOURCE_REPO_PROVIDERS } from "../types/deploy-app-source";

/**
 * "Source & remix" drawer for one Deploy application.
 *
 * The drawer owns the whole `apps.source.*` / `apps.remix.*` surface:
 *
 * - `readiness` is read, never computed here — the backend derives it from the
 *   referenced repository or artifact on every read, and the console only
 *   translates the reason code into a sentence;
 * - `PUT /source` replaces the source with either a Git pointer or an artifact
 *   reference. Replacing it never toggles remix, so the switch is a separate
 *   `PUT /remix` command;
 * - the remix switch is disabled while the source is not `READY`, and a refused
 *   enable (`409`) is explained with the reason code the server returned.
 *
 * Read and write are separate permissions (`deploy.apps.read|write`): a reader
 * sees the current source and readiness with every write control removed.
 */
type LoadState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | ({ status: "ready" } & DeployAppSourceSnapshot);

export function AppSourceRemixDrawer({
  application,
  canRead = isApplicationCenterActionAllowed("sourceRead"),
  canWrite = isApplicationCenterActionAllowed("sourceWrite"),
  messages,
  onClose,
  service: injectedService,
}: {
  application: ApplicationRecord;
  /** Test/host seam: defaults to the read action permission. */
  canRead?: boolean;
  /** Test/host seam: defaults to the write action permission. */
  canWrite?: boolean;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  /** Test/extension seam: override the Deploy source transport. */
  service?: DeployAppSourceService;
}) {
  const copy = messages.sourceRemix;
  // Resolved per call rather than captured once: an inline test seam must not
  // restart the load effect on every render.
  const activeService = (): DeployAppSourceService =>
    injectedService ?? getDeployAppSourceService();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [draft, setDraft] = useState<DeployAppSourceDraft>(() => createSourceDraft());
  const [issues, setIssues] = useState<DeployAppSourceIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [remixPending, setRemixPending] = useState(false);
  const [remixError, setRemixError] = useState<unknown>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>();
  const [artifacts, setArtifacts] = useState<readonly DeployArtifactOption[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void activeService().load(application.id).then(
      (snapshot) => {
        if (cancelled) {
          return;
        }
        setState({ status: "ready", ...snapshot });
        setDraft(createSourceDraft(snapshot.source));
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", error });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [application.id, canRead, reloadToken]);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    let cancelled = false;
    void activeService().listArtifacts().then(
      (items) => {
        if (!cancelled) {
          setArtifacts(items);
        }
      },
      () => {
        // The artifact catalog is a convenience picker: a tenant whose artifacts
        // cannot be listed can still paste an artifact id, so a failed list only
        // degrades the picker instead of blocking the drawer.
        if (!cancelled) {
          setArtifacts([]);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [canRead, reloadToken]);

  const source = state.status === "ready" ? state.source : undefined;
  const readiness = state.status === "ready" ? state.remix.readiness : "MISSING";
  const readinessReason = state.status === "ready"
    ? (state.remix.readinessReason ?? state.source.readinessReason)
    : undefined;
  const remixEnabled = state.status === "ready" ? state.remix.remixEnabled : false;
  const ready = readiness === "READY";
  const reasonText = readinessReason ? copy.readiness.reasons[readinessReason] : undefined;
  const busy = saving || deleting || remixPending;

  const updateDraft = <K extends keyof DeployAppSourceDraft>(
    key: K,
    value: DeployAppSourceDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const issueFor = (field: DeployAppSourceIssueField): DeployAppSourceIssue | undefined =>
    issues.find((issue) => issue.field === field);

  const applySource = (next: DeployAppSourceState) => {
    setState((current) => current.status === "ready"
      ? {
        status: "ready",
        source: next,
        remix: {
          ...current.remix,
          readiness: next.readiness,
          readinessReason: next.readinessReason,
          remixEnabled: next.remixEnabled,
          ...(next.sourceKind ? { sourceKind: next.sourceKind } : {}),
        },
      }
      : current);
    setDraft(createSourceDraft(next));
  };

  const handleSave = async () => {
    const nextIssues = validateSourceDraft(draft);
    setIssues(nextIssues);
    setSaved(false);
    setSaveError(undefined);
    if (nextIssues.length > 0) {
      return;
    }
    setSaving(true);
    try {
      const next = await activeService().save(application.id, toSourceUpdatePayload(draft));
      applySource(next);
      setSaved(true);
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await activeService().retire(application.id);
      setConfirmingDelete(false);
      setSaved(false);
      setReloadToken((token) => token + 1);
    } catch (error) {
      setDeleteError(error);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleRemix = async (enabled: boolean) => {
    setRemixPending(true);
    setRemixError(undefined);
    try {
      const remix = await activeService().setRemix(application.id, enabled);
      setState((current) => current.status === "ready"
        ? {
          status: "ready",
          remix,
          source: {
            ...current.source,
            readiness: remix.readiness,
            readinessReason: remix.readinessReason,
            remixEnabled: remix.remixEnabled,
            ...(remix.sourceKind ? { sourceKind: remix.sourceKind } : {}),
          },
        }
        : current);
    } catch (error) {
      setRemixError(error);
      // A `409` means the server verdict moved (the repository degraded, the
      // artifact was retired). Re-read so the readiness panel states the current
      // reason instead of the one the operator was looking at.
      if (isDeployAppSourceConflict(error)) {
        setReloadToken((token) => token + 1);
      }
    } finally {
      setRemixPending(false);
    }
  };

  const loadFailure = state.status === "error" ? state.error : undefined;
  const saveFailure = saveError ? sourceFailureText(saveError, copy) : undefined;
  const remixFailure = remixError ? sourceFailureText(remixError, copy) : undefined;
  const deleteFailure = deleteError ? sourceFailureText(deleteError, copy) : undefined;

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>{template(copy.description, { app: application.name })}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--sdk-color-text-muted)]">{copy.application}</dt>
            <dd className="min-w-0 truncate font-medium text-[var(--sdk-color-text-primary)]">
              {application.name}
              {application.reference ? ` · ${application.reference}` : ""}
            </dd>
          </dl>

          {!canRead ? <StatusNotice tone="danger">{copy.errors.forbidden}</StatusNotice> : null}

          {canRead && state.status === "loading" ? (
            <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">{copy.loading}</p>
          ) : null}

          {canRead && loadFailure ? (
            <StatusNotice tone="danger">
              <span className="flex flex-wrap items-center gap-3">
                <span>{sourceFailureText(loadFailure, copy)}</span>
                <Button
                  onClick={() => setReloadToken((token) => token + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copy.retry}
                </Button>
              </span>
            </StatusNotice>
          ) : null}

          {canRead && state.status === "ready" ? (
            <>
              <section
                className="space-y-2"
                data-app-source-readiness={readiness}
                data-app-source-reason={readinessReason ?? ""}
              >
                <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                  {copy.readiness.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={ready ? copy.readiness.ready : copy.readiness.missing}
                    showIcon
                    status={ready ? "ready" : "warning"}
                    variant={ready ? "success" : "warning"}
                  />
                  {source?.sourceKind ? (
                    <span className="text-xs text-[var(--sdk-color-text-muted)]">
                      {source.sourceKind === "GIT" ? copy.kind.git : copy.kind.archive}
                    </span>
                  ) : null}
                  {source?.updatedAt ? (
                    <span className="text-xs text-[var(--sdk-color-text-muted)]">
                      {formatDateTime(source.updatedAt)}
                    </span>
                  ) : null}
                </div>
                {reasonText ? (
                  <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                    <span className="font-medium">{copy.readiness.reasonLabel}: </span>
                    {reasonText}
                    {readinessReason ? (
                      <span className="ml-1 font-mono">({readinessReason})</span>
                    ) : null}
                  </p>
                ) : null}
                {source?.git ? (
                  <p className="break-all text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                    {template(copy.git.repoStatusTemplate, { status: source.git.repoStatus || "-" })}
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                    {copy.kind.label}
                  </h3>
                  <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">{copy.kind.hint}</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={copy.kind.label}>
                  <Button
                    aria-pressed={draft.kind === "GIT"}
                    disabled={!canWrite || busy}
                    onClick={() => updateDraft("kind", "GIT")}
                    size="sm"
                    type="button"
                    variant={draft.kind === "GIT" ? "primary" : "outline"}
                  >
                    {copy.kind.git}
                  </Button>
                  <Button
                    aria-pressed={draft.kind === "ARCHIVE"}
                    disabled={!canWrite || busy}
                    onClick={() => updateDraft("kind", "ARCHIVE")}
                    size="sm"
                    type="button"
                    variant={draft.kind === "ARCHIVE" ? "primary" : "outline"}
                  >
                    {copy.kind.archive}
                  </Button>
                </div>

                {draft.kind === "GIT" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field invalid={Boolean(issueFor("repoProvider"))} required>
                      <FieldLabel htmlFor="app-source-provider">{copy.git.provider}</FieldLabel>
                      <Select
                        disabled={!canWrite || busy}
                        onValueChange={(value) => updateDraft("repoProvider", value)}
                        value={draft.repoProvider}
                      >
                        <SelectTrigger aria-label={copy.git.provider} id="app-source-provider">
                          <SelectValue placeholder={copy.git.provider} />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPLOY_APP_SOURCE_REPO_PROVIDERS.map((provider) => (
                            <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>{copy.git.providerHint}</FieldDescription>
                      <FieldIssue issue={issueFor("repoProvider")} messages={messages} />
                    </Field>

                    <Field invalid={Boolean(issueFor("repoUrl"))} required>
                      <FieldLabel htmlFor="app-source-repo-url">{copy.git.repoUrl}</FieldLabel>
                      <Input
                        aria-invalid={Boolean(issueFor("repoUrl"))}
                        disabled={!canWrite || busy}
                        id="app-source-repo-url"
                        onChange={(event) => updateDraft("repoUrl", event.target.value)}
                        placeholder={copy.git.repoUrlPlaceholder}
                        value={draft.repoUrl}
                      />
                      <FieldIssue issue={issueFor("repoUrl")} messages={messages} />
                    </Field>

                    <Field invalid={Boolean(issueFor("repoRef"))}>
                      <FieldLabel htmlFor="app-source-repo-ref">{copy.git.repoRef}</FieldLabel>
                      <Input
                        aria-invalid={Boolean(issueFor("repoRef"))}
                        disabled={!canWrite || busy}
                        id="app-source-repo-ref"
                        onChange={(event) => updateDraft("repoRef", event.target.value)}
                        placeholder={copy.git.repoRefPlaceholder}
                        value={draft.repoRef}
                      />
                      <FieldIssue issue={issueFor("repoRef")} messages={messages} />
                    </Field>

                    <Field invalid={Boolean(issueFor("subPath"))}>
                      <FieldLabel htmlFor="app-source-sub-path">{copy.git.subPath}</FieldLabel>
                      <Input
                        aria-invalid={Boolean(issueFor("subPath"))}
                        disabled={!canWrite || busy}
                        id="app-source-sub-path"
                        onChange={(event) => updateDraft("subPath", event.target.value)}
                        placeholder={copy.git.subPathPlaceholder}
                        value={draft.subPath}
                      />
                      <FieldIssue issue={issueFor("subPath")} messages={messages} />
                    </Field>

                    <Field invalid={Boolean(issueFor("credentialSecretRef"))}>
                      <FieldLabel htmlFor="app-source-credential">
                        {copy.git.credentialSecretRef}
                      </FieldLabel>
                      <Input
                        aria-invalid={Boolean(issueFor("credentialSecretRef"))}
                        disabled={!canWrite || busy}
                        id="app-source-credential"
                        onChange={(event) => updateDraft("credentialSecretRef", event.target.value)}
                        placeholder={copy.git.credentialSecretRefPlaceholder}
                        value={draft.credentialSecretRef}
                      />
                      <FieldIssue issue={issueFor("credentialSecretRef")} messages={messages} />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="app-source-clone-mode">{copy.git.cloneMode}</FieldLabel>
                      <Select
                        disabled={!canWrite || busy}
                        onValueChange={(value) =>
                          updateDraft("cloneMode", value === "FULL" ? "FULL" : "SHALLOW")}
                        value={draft.cloneMode}
                      >
                        <SelectTrigger aria-label={copy.git.cloneMode} id="app-source-clone-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SHALLOW">{copy.git.cloneModeShallow}</SelectItem>
                          <SelectItem value="FULL">{copy.git.cloneModeFull}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                      <dt className="text-[var(--sdk-color-text-muted)]">{copy.archive.current}</dt>
                      <dd className="min-w-0 break-all">
                        {source?.archive
                          ? `${source.archive.fileName} · ${source.archive.artifactId}`
                          : copy.archive.currentEmpty}
                      </dd>
                    </dl>
                    {artifacts.length > 0 ? (
                      <Field>
                        <FieldLabel htmlFor="app-source-artifact-picker">{copy.archive.picker}</FieldLabel>
                        <Select
                          disabled={!canWrite || busy}
                          onValueChange={(value) => updateDraft("artifactId", value)}
                          value={artifacts.some((artifact) => artifact.id === draft.artifactId)
                            ? draft.artifactId
                            : ""}
                        >
                          <SelectTrigger aria-label={copy.archive.picker} id="app-source-artifact-picker">
                            <SelectValue placeholder={copy.archive.pickerPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {artifacts.map((artifact) => (
                              <SelectItem key={artifact.id} value={artifact.id}>
                                {artifact.fileName} · {artifact.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : (
                      <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                        {copy.archive.pickerEmpty}
                      </p>
                    )}
                    <Field invalid={Boolean(issueFor("artifactId"))} required>
                      <FieldLabel htmlFor="app-source-artifact-id">{copy.archive.artifactId}</FieldLabel>
                      <Input
                        aria-invalid={Boolean(issueFor("artifactId"))}
                        disabled={!canWrite || busy}
                        id="app-source-artifact-id"
                        onChange={(event) => updateDraft("artifactId", event.target.value)}
                        placeholder={copy.archive.artifactIdPlaceholder}
                        value={draft.artifactId}
                      />
                      <FieldDescription>{copy.archive.uploadHint}</FieldDescription>
                      <FieldIssue issue={issueFor("artifactId")} messages={messages} />
                    </Field>
                  </div>
                )}

                {saveFailure ? <StatusNotice tone="danger">{saveFailure}</StatusNotice> : null}
                {!canWrite ? <StatusNotice tone="default">{copy.errors.writeDenied}</StatusNotice> : null}
                {saved ? <StatusNotice tone="success">{copy.saved}</StatusNotice> : null}

                {canWrite ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={busy} onClick={() => void handleSave()} type="button">
                      {saving ? copy.saving : copy.save}
                    </Button>
                    {source?.sourceKind ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setDeleteError(undefined);
                          setConfirmingDelete(true);
                        }}
                        type="button"
                        variant="outline"
                      >
                        {copy.delete.action}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </section>

              {confirmingDelete ? (
                <section className="space-y-2">
                  <StatusNotice title={copy.delete.title} tone="warning">
                    {copy.delete.description}
                  </StatusNotice>
                  {deleteFailure ? <StatusNotice tone="danger">{deleteFailure}</StatusNotice> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={deleting}
                      onClick={() => void handleDelete()}
                      type="button"
                      variant="danger"
                    >
                      {deleting ? copy.delete.deleting : copy.delete.confirm}
                    </Button>
                    <Button
                      disabled={deleting}
                      onClick={() => setConfirmingDelete(false)}
                      type="button"
                      variant="secondary"
                    >
                      {copy.delete.cancel}
                    </Button>
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                      {copy.remix.title}
                    </h3>
                    <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                      {copy.remix.description}
                    </p>
                  </div>
                  <Switch
                    aria-label={copy.remix.label}
                    checked={remixEnabled}
                    disabled={!canWrite || !ready || busy}
                    id="app-source-remix"
                    onCheckedChange={(checked) => void handleToggleRemix(checked)}
                  />
                </div>
                <p className="text-xs leading-5 text-[var(--sdk-color-text-muted)]">
                  {remixEnabled ? copy.remix.enabled : copy.remix.disabled}
                </p>
                {!ready ? (
                  <StatusNotice tone="warning">
                    {template(copy.remix.blockedTemplate, {
                      reason: reasonText ?? copy.readiness.missing,
                    })}
                  </StatusNotice>
                ) : null}
                {remixFailure ? <StatusNotice tone="danger">{remixFailure}</StatusNotice> : null}
              </section>
            </>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={onClose} type="button" variant="secondary">{copy.close}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function FieldIssue({
  issue,
  messages,
}: {
  issue: DeployAppSourceIssue | undefined;
  messages: ApplicationCatalogMessages;
}) {
  if (!issue) {
    return null;
  }
  return <FieldError>{messages.sourceRemix.validation[issue.code]}</FieldError>;
}

/** Map one failure onto the sentence the drawer shows for it. */
function sourceFailureText(
  error: unknown,
  copy: ApplicationCatalogMessages["sourceRemix"],
): string {
  const failure = classifyDeployAppSourceError(error);
  if (isDeployAppSourceUnauthorized(failure)) {
    return copy.errors.unauthorized;
  }
  if (isDeployAppSourceForbidden(failure)) {
    return copy.errors.forbidden;
  }
  if (isDeployAppSourceNotFound(failure)) {
    return copy.errors.notFound;
  }
  if (isDeployAppSourceNetworkFailure(failure)) {
    return copy.errors.network;
  }
  if (isDeployAppSourceUnavailable(failure)) {
    return copy.errors.unavailable;
  }
  if (isDeployAppSourceConflict(failure)) {
    const reason = deployAppSourceErrorReason(failure);
    return reason
      ? template(copy.errors.conflictTemplate, { reason: copy.readiness.reasons[reason] })
      : copy.errors.conflict;
  }
  return copy.errors.unknown;
}

function template(value: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, replacement),
    value,
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
