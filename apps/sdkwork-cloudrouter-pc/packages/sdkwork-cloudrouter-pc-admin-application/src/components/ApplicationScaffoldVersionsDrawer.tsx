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
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
} from "../services/application-scaffolds";
import { validateVersionInput } from "../services/application-scaffold-form";
import type {
  ApplicationScaffold,
  ApplicationScaffoldIssue,
  ApplicationScaffoldService,
  ApplicationScaffoldVersion,
} from "../types/application-scaffolds";

/**
 * Version history and version authoring for one scaffold listing.
 *
 * Versions are ordered newest first by the API; the drawer keeps the loaded
 * history and appends a freshly created version without a full refetch.
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
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [issues, setIssues] = useState<ApplicationScaffoldIssue[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>();
  const [created, setCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
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
  }, [service, scaffold.id]);

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
        <DrawerBody className="space-y-6">
          <section className="space-y-3">
            {state === "loading" ? (
              <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.loading}</p>
            ) : null}
            {state === "error" ? <StatusNotice tone="danger">{loadFailureText}</StatusNotice> : null}
            {state === "ready" && versions.length === 0 ? (
              <StatusNotice tone="default">{copy.empty}</StatusNotice>
            ) : null}
            {versions.length > 0 ? (
              <ul className="divide-y divide-[var(--sdk-color-border-default)] rounded-[var(--sdk-radius-card)] border border-[var(--sdk-color-border-default)]">
                {versions.map((item) => (
                  <li className="flex flex-wrap items-start justify-between gap-3 p-3" key={item.id}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                        {item.version}
                      </p>
                      {item.changelog ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-[var(--sdk-color-text-muted)]">
                          {item.changelog}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-[var(--sdk-color-surface-panel-muted)] px-2 py-0.5 text-xs text-[var(--sdk-color-text-muted)]">
                      {item.status}
                    </span>
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
                  aria-invalid={Boolean(versionIssue)}
                  id="app-scaffold-version"
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder={copy.versionPlaceholder}
                  value={version}
                />
                {versionIssue ? (
                  <FieldError>
                    {copy.validation[versionIssue.code === "version-required" ? "version-required" : "version-invalid"]}
                  </FieldError>
                ) : null}
              </Field>
            </div>
            <Field invalid={Boolean(changelogIssue)}>
              <FieldLabel htmlFor="app-scaffold-changelog">{copy.changelog}</FieldLabel>
              <Textarea
                aria-invalid={Boolean(changelogIssue)}
                id="app-scaffold-changelog"
                onChange={(event) => setChangelog(event.target.value)}
                placeholder={copy.changelogPlaceholder}
                rows={3}
                value={changelog}
              />
              {changelogIssue ? (
                <FieldError>{copy.validation["changelog-too-long"]}</FieldError>
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
