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
  FieldError,
  FieldLabel,
  Input,
  StatusBadge,
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { formatDateTime } from "../services/format";
import {
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
} from "../services/application-scaffolds";
import { validateVersionInput } from "../services/application-scaffold-form";
import type {
  ApplicationScaffold,
  ApplicationScaffoldIssue,
  ApplicationScaffoldService,
  ApplicationScaffoldStatus,
  ApplicationScaffoldVersion,
} from "../types/application-scaffolds";

/**
 * Version history and version authoring for one scaffold listing.
 *
 * Versions are ordered newest first by the API; the drawer keeps the loaded
 * history and appends a freshly created version without a full refetch. Each
 * history entry carries the same localized status badge the catalog uses, so a
 * version in review is never mistaken for a published one.
 */
export function ApplicationScaffoldVersionsDrawer({
  messages,
  onClose,
  service,
  scaffold,
}: {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  service: ApplicationScaffoldService;
  scaffold: ApplicationScaffold;
}) {
  const copy = messages.scaffolds.versions;
  const [versions, setVersions] = useState<readonly ApplicationScaffoldVersion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<unknown>();
  const [reloadToken, setReloadToken] = useState(0);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [issues, setIssues] = useState<ApplicationScaffoldIssue[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>();
  const [created, setCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setLoadError(undefined);
    void service.listVersions(scaffold.id).then(
      (items) => {
        if (!cancelled) {
          setVersions(items);
          setState("ready");
        }
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoadError(error);
          setState("error");
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken, service, scaffold.id]);

  const handleCreate = async () => {
    const nextIssues = validateVersionInput({ version, changelog });
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }
    setCreating(true);
    setCreateError(undefined);
    setCreated(false);
    try {
      const result = await service.createVersion(scaffold.id, { version, changelog });
      setVersions((current) => [result, ...current]);
      setVersion("");
      setChangelog("");
      setCreated(true);
    } catch (error) {
      setCreateError(error);
    } finally {
      setCreating(false);
    }
  };

  const versionIssue = issues.find((issue) => issue.field === "version");
  const changelogIssue = issues.find((issue) => issue.field === "changelog");
  const loadFailureText = loadError ? resolveLoadFailure(loadError, messages) : undefined;
  const createFailureText = createError ? resolveCreateFailure(createError, messages) : undefined;

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !creating) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>
            {copy.description.replace("{name}", scaffold.displayName)}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody aria-busy={state === "loading" || undefined} className="space-y-6">
          <section className="space-y-3">
            {state === "loading" ? (
              <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
                {copy.loading}
              </p>
            ) : null}
            {state === "error" ? (
              <StatusNotice tone="danger">
                <span className="flex flex-wrap items-center gap-3">
                  <span>{loadFailureText}</span>
                  <Button
                    onClick={() => setReloadToken((token) => token + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {messages.retry}
                  </Button>
                </span>
              </StatusNotice>
            ) : null}
            {state === "ready" && versions.length === 0 ? (
              <StatusNotice tone="default">{copy.empty}</StatusNotice>
            ) : null}
            {versions.length > 0 ? (
              <ul className="divide-y divide-[var(--sdk-color-border-default)] rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
                {versions.map((item) => (
                  <li className="flex flex-wrap items-start justify-between gap-3 p-3" key={item.id}>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                        {item.version}
                      </p>
                      {item.changelog ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-[var(--sdk-color-text-muted)]">
                          {item.changelog}
                        </p>
                      ) : null}
                      {item.createdAt ? (
                        <p className="mt-1 text-[11px] text-[var(--sdk-color-text-muted)]">
                          {formatDateTime(item.createdAt)}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      label={versionStatusLabel(item.status, messages)}
                      status={item.status}
                      variant={versionStatusVariant(item.status)}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
              {copy.createTitle}
            </h3>
            {createFailureText ? <StatusNotice tone="danger">{createFailureText}</StatusNotice> : null}
            {created ? <StatusNotice tone="success">{copy.created}</StatusNotice> : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field invalid={Boolean(versionIssue)} required>
                <FieldLabel htmlFor="app-scaffold-version">{copy.version}</FieldLabel>
                <Input
                  aria-describedby={versionIssue ? "app-scaffold-version-error" : undefined}
                  aria-invalid={Boolean(versionIssue)}
                  id="app-scaffold-version"
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder={copy.versionPlaceholder}
                  value={version}
                />
                {versionIssue ? (
                  <FieldError id="app-scaffold-version-error">
                    {copy.validation[versionIssue.code === "version-required" ? "version-required" : "version-invalid"]}
                  </FieldError>
                ) : null}
              </Field>
            </div>
            <Field invalid={Boolean(changelogIssue)}>
              <FieldLabel htmlFor="app-scaffold-changelog">{copy.changelog}</FieldLabel>
              <Textarea
                aria-describedby={changelogIssue ? "app-scaffold-changelog-error" : undefined}
                aria-invalid={Boolean(changelogIssue)}
                id="app-scaffold-changelog"
                onChange={(event) => setChangelog(event.target.value)}
                placeholder={copy.changelogPlaceholder}
                rows={3}
                value={changelog}
              />
              {changelogIssue ? (
                <FieldError id="app-scaffold-changelog-error">
                  {copy.validation["changelog-too-long"]}
                </FieldError>
              ) : null}
            </Field>
            <Button disabled={creating} onClick={() => void handleCreate()} type="button">
              {creating ? copy.creating : copy.create}
            </Button>
          </section>
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={creating} onClick={onClose} type="button" variant="outline">
            {copy.close}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function resolveLoadFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isApplicationScaffoldForbidden(error)) {
    return messages.scaffolds.forbidden;
  }
  if (isApplicationScaffoldUnavailable(error)) {
    return messages.scaffolds.unavailable;
  }
  return messages.scaffolds.versions.loadError;
}

function resolveCreateFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isApplicationScaffoldForbidden(error)) {
    return messages.scaffolds.forbidden;
  }
  if (isApplicationScaffoldUnavailable(error)) {
    return messages.scaffolds.unavailable;
  }
  return messages.scaffolds.versions.createError;
}

/** Localized version status; falls back to the raw wire value for a new enum. */
function versionStatusLabel(status: string, messages: ApplicationCatalogMessages): string {
  const known = messages.scaffolds.statuses[status as ApplicationScaffoldStatus];
  return known ?? status;
}

/** Badge tone for a version status, aligned with the scaffold catalog. */
function versionStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "default" | "secondary" {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "PENDING_REVIEW":
      return "warning";
    case "REJECTED":
      return "danger";
    case "DISABLED":
      return "secondary";
    default:
      return "default";
  }
}
