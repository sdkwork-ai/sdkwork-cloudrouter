import { useState } from "react";
import {
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
  onInstalled: (result: {
    appId: string;
    appName: string;
    deployApplicationId?: string;
  }) => void;
  scaffold: ApplicationScaffold;
  service: ApplicationScaffoldService;
}) {
  const copy = messages.scaffolds.installDrawer;
  const [name, setName] = useState(defaultName(scaffold, copy.defaultName));
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [nameError, setNameError] = useState<string>();

  const submit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(copy.nameRequired);
      return;
    }
    if (busy) {
      return;
    }
    setNameError(undefined);
    setBusy(true);
    setError(undefined);
    try {
      const result = await service.install(scaffold.id, {
        name: trimmedName,
        ...(slug.trim() ? { slug: slug.trim() } : {}),
      });
      onInstalled({
        appId: result.appId,
        appName: result.appName,
        ...(result.deployApplicationId ? { deployApplicationId: result.deployApplicationId } : {}),
      });
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

          <Field invalid={Boolean(nameError)} required>
            <FieldLabel htmlFor="scaffold-install-name">{copy.name}</FieldLabel>
            <Input
              aria-describedby={nameError ? "scaffold-install-name-error" : undefined}
              aria-invalid={Boolean(nameError)}
              autoFocus
              id="scaffold-install-name"
              onChange={(event) => {
                setName(event.target.value);
                setNameError(undefined);
              }}
              placeholder={copy.namePlaceholder}
              value={name}
            />
            {nameError ? (
              <FieldError id="scaffold-install-name-error">{nameError}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="scaffold-install-slug">{copy.slug}</FieldLabel>
            <Input
              aria-describedby="scaffold-install-slug-hint"
              id="scaffold-install-slug"
              onChange={(event) => setSlug(event.target.value)}
              placeholder={copy.slugPlaceholder}
              value={slug}
            />
            <FieldDescription id="scaffold-install-slug-hint">{copy.slugHint}</FieldDescription>
          </Field>

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
