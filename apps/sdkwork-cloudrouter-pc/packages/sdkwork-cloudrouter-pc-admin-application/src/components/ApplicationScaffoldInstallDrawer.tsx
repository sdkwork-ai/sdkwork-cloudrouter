import { useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  FieldLabel,
  Input,
  StatusNotice,
  Button,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
} from "../services/application-scaffolds";
import type {
  ApplicationScaffold,
  ApplicationScaffoldService,
} from "../types/application-scaffolds";

/** Default application name a "create from scaffold" run proposes. */
function defaultName(scaffold: ApplicationScaffold, template: string): string {
  const base = scaffold.displayName.trim() || scaffold.scaffoldKey;
  return template.replace("{name}", base);
}

/**
 * "Create an application from this scaffold" drawer.
 *
 * The factory install is a command, not a navigation shortcut: the operator
 * names the target application before the deploy service snapshots the
 * scaffold source into a new deploy application with its own identity anchor.
 */
export function ApplicationScaffoldInstallDrawer({
  messages,
  onClose,
  onInstalled,
  scaffold,
  service,
}: {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onInstalled: (result: { appId: string; appName: string }) => void;
  scaffold: ApplicationScaffold;
  service: ApplicationScaffoldService;
}) {
  const copy = messages.scaffolds.installDrawer;
  const [name, setName] = useState(defaultName(scaffold, copy.defaultName));
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [nameError, setNameError] = useState(false);

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }
    if (busy) {
      return;
    }
    setNameError(false);
    setBusy(true);
    setError(undefined);
    try {
      const result = await service.install(scaffold.id, {
        name: trimmedName,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
      });
      onInstalled({ appId: result.appId, appName: result.appName });
    } catch (nextError) {
      setError(nextError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>
            {copy.description.replace("{name}", scaffold.displayName)}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <div className="rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-[var(--sdk-color-text-primary)]">
                {scaffold.displayName}
              </span>
              <span className="font-mono text-xs text-[var(--sdk-color-text-muted)]">
                {scaffold.scaffoldKey}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--sdk-color-text-muted)]">
              {copy.sourceHint}
            </p>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="scaffold-install-name">{copy.name}</FieldLabel>
            <Input
              autoFocus
              id="scaffold-install-name"
              onChange={(event) => {
                setName(event.target.value);
                setNameError(false);
              }}
              placeholder={copy.namePlaceholder}
              value={name}
            />
            {nameError ? (
              <p className="text-xs text-[var(--sdk-color-state-danger)]">{copy.nameRequired}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="scaffold-install-slug">{copy.slug}</FieldLabel>
            <Input
              id="scaffold-install-slug"
              onChange={(event) => setSlug(event.target.value)}
              placeholder={copy.slugPlaceholder}
              value={slug}
            />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.slugHint}</p>
          </div>

          {error ? (
            <StatusNotice tone="danger">
              {isApplicationScaffoldForbidden(error)
                ? copy.forbidden
                : isApplicationScaffoldUnavailable(error)
                  ? copy.unavailable
                  : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={busy} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={busy} onClick={() => { void submit(); }} type="button">
            {busy ? copy.creating : copy.create}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
