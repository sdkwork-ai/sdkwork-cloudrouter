import { useMemo, useState } from "react";
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
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  createEmptyScaffoldDraft,
  createScaffoldDraft,
  toScaffoldCreateInput,
  toScaffoldUpdateInput,
  validateScaffoldDraft,
} from "../services/application-scaffold-form";
import {
  isApplicationScaffoldForbidden,
  isApplicationScaffoldUnavailable,
} from "../services/application-scaffolds";
import type {
  DeployAppOption,
  ApplicationScaffold,
  ScaffoldCategory,
  ApplicationScaffoldDraft,
  ApplicationScaffoldIssue,
  ApplicationScaffoldIssueField,
  ApplicationScaffoldService,
} from "../types/application-scaffolds";

/**
 * Create/edit drawer for one app-scaffold listing.
 *
 * Validation covers only what the platform write contract rejects: identity
 * fields, copy length, and paid-listing price/currency. The service/backend
 * remains authoritative on uniqueness and review transitions.
 */
export function ApplicationScaffoldFormDrawer({
  apps,
  categories,
  messages,
  onClose,
  onSaved,
  service,
  scaffold,
}: {
  apps: readonly DeployAppOption[];
  categories: readonly ScaffoldCategory[];
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: (scaffold: ApplicationScaffold) => void;
  service: ApplicationScaffoldService;
  scaffold?: ApplicationScaffold;
}) {
  const copy = messages.scaffolds.form;
  const editing = Boolean(scaffold);
  const [draft, setDraft] = useState<ApplicationScaffoldDraft>(() =>
    scaffold
      ? createScaffoldDraft(scaffold)
      : createEmptyScaffoldDraft(categories[0]?.id ?? ""));
  const [issues, setIssues] = useState<ApplicationScaffoldIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const updateDraft = <K extends keyof ApplicationScaffoldDraft>(
    key: K,
    value: ApplicationScaffoldDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const nextIssues = validateScaffoldDraft(draft, editing);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      const result = scaffold
        ? await service.update(scaffold.id, toScaffoldUpdateInput(draft))
        : await service.create(toScaffoldCreateInput(draft));
      setSaved(true);
      onSaved(result);
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const appIssue = findIssue(issues, "appUuid");
  const categoryIssue = findIssue(issues, "categoryUuid");
  const keyIssue = findIssue(issues, "scaffoldKey");
  const nameIssue = findIssue(issues, "displayName");
  const summaryIssue = findIssue(issues, "summary");
  const descriptionIssue = findIssue(issues, "description");
  const priceIssue = findIssue(issues, "priceMinor");
  const currencyIssue = findIssue(issues, "currency");
  const failureText = saveError ? resolveFailure(saveError, messages) : undefined;
  const paid = draft.pricingModel === "PAID";
  const appName = useMemo(() => {
    const app = apps.find((candidate) => candidate.id === draft.appUuid);
    return app?.name ?? draft.appUuid;
  }, [apps, draft.appUuid]);

  const issueMessage = (issue: ApplicationScaffoldIssue): string => {
    if (Object.prototype.hasOwnProperty.call(copy.validation, issue.code)) {
      return copy.validation[issue.code as keyof typeof copy.validation];
    }
    return copiesFallback(issue.code);
  };

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !saving) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{editing ? copy.editTitle : copy.createTitle}</DrawerTitle>
          <DrawerDescription>{editing ? copy.editDescription : copy.createDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          {failureText ? <StatusNotice tone="danger">{failureText}</StatusNotice> : null}
          {saved ? <StatusNotice tone="success">{copy.saved}</StatusNotice> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field invalid={Boolean(appIssue)} required={!editing}>
              <FieldLabel htmlFor="app-scaffold-app">{copy.app}</FieldLabel>
              {editing ? (
                <Input disabled id="app-scaffold-app" readOnly value={appName} />
              ) : (
                <Select
                  disabled={saving}
                  onValueChange={(value) => updateDraft("appUuid", value)}
                  value={draft.appUuid}
                >
                  <SelectTrigger aria-label={copy.app} autoFocus id="app-scaffold-app">
                    <SelectValue placeholder={copy.appPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldDescription>{copy.appHint}</FieldDescription>
              {appIssue ? <FieldError id="app-scaffold-app-error">{issueMessage(appIssue)}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(categoryIssue)} required>
              <FieldLabel htmlFor="app-scaffold-category">{copy.category}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) => updateDraft("categoryUuid", value)}
                value={draft.categoryUuid}
              >
                <SelectTrigger aria-label={copy.category} id="app-scaffold-category">
                  <SelectValue placeholder={copy.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{copy.categoryHint}</FieldDescription>
              {categoryIssue ? (
                <FieldError id="app-scaffold-category-error">{issueMessage(categoryIssue)}</FieldError>
              ) : null}
            </Field>

            <Field invalid={Boolean(keyIssue)} required={!editing}>
              <FieldLabel htmlFor="app-scaffold-key">{copy.scaffoldKey}</FieldLabel>
              <Input
                aria-describedby={keyIssue ? "app-scaffold-key-error" : "app-scaffold-key-hint"}
                aria-invalid={Boolean(keyIssue)}
                disabled={editing || saving}
                id="app-scaffold-key"
                onChange={(event) => updateDraft("scaffoldKey", event.target.value)}
                placeholder={copy.scaffoldKeyPlaceholder}
                value={draft.scaffoldKey}
              />
              <FieldDescription id="app-scaffold-key-hint">{copy.scaffoldKeyHint}</FieldDescription>
              {keyIssue ? <FieldError id="app-scaffold-key-error">{issueMessage(keyIssue)}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(nameIssue)} required>
              <FieldLabel htmlFor="app-scaffold-name">{copy.displayName}</FieldLabel>
              <Input
                aria-describedby={nameIssue ? "app-scaffold-name-error" : undefined}
                aria-invalid={Boolean(nameIssue)}
                id="app-scaffold-name"
                maxLength={120}
                onChange={(event) => updateDraft("displayName", event.target.value)}
                placeholder={copy.displayNamePlaceholder}
                value={draft.displayName}
              />
              {nameIssue ? (
                <FieldError id="app-scaffold-name-error">{issueMessage(nameIssue)}</FieldError>
              ) : null}
            </Field>

            <Field className="sm:col-span-2" invalid={Boolean(summaryIssue)} required>
              <FieldLabel htmlFor="app-scaffold-summary">{copy.summary}</FieldLabel>
              <Input
                aria-describedby={summaryIssue ? "app-scaffold-summary-error" : undefined}
                aria-invalid={Boolean(summaryIssue)}
                id="app-scaffold-summary"
                maxLength={280}
                onChange={(event) => updateDraft("summary", event.target.value)}
                placeholder={copy.summaryPlaceholder}
                value={draft.summary}
              />
              {summaryIssue ? (
                <FieldError id="app-scaffold-summary-error">{issueMessage(summaryIssue)}</FieldError>
              ) : null}
            </Field>

            <Field className="sm:col-span-2" invalid={Boolean(descriptionIssue)}>
              <FieldLabel htmlFor="app-scaffold-description">{copy.description}</FieldLabel>
              <Textarea
                aria-describedby={descriptionIssue ? "app-scaffold-description-error" : undefined}
                aria-invalid={Boolean(descriptionIssue)}
                id="app-scaffold-description"
                maxLength={4000}
                onChange={(event) => updateDraft("description", event.target.value)}
                placeholder={copy.descriptionPlaceholder}
                rows={5}
                value={draft.description}
              />
              {descriptionIssue ? (
                <FieldError id="app-scaffold-description-error">
                  {issueMessage(descriptionIssue)}
                </FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="app-scaffold-visibility">{copy.visibility}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) =>
                  updateDraft("visibility", value === "PRIVATE" ? "PRIVATE" : "PUBLIC")}
                value={draft.visibility}
              >
                <SelectTrigger aria-label={copy.visibility} id="app-scaffold-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">{messages.scaffolds.visibility.PUBLIC}</SelectItem>
                  <SelectItem value="PRIVATE">{messages.scaffolds.visibility.PRIVATE}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="app-scaffold-pricing">{copy.pricingModel}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) =>
                  updateDraft("pricingModel", value === "PAID" ? "PAID" : "FREE")}
                value={draft.pricingModel}
              >
                <SelectTrigger aria-label={copy.pricingModel} id="app-scaffold-pricing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{messages.scaffolds.pricing.FREE}</SelectItem>
                  <SelectItem value="PAID">{messages.scaffolds.pricing.PAID}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {paid ? (
              <>
                <Field invalid={Boolean(priceIssue)} required>
                  <FieldLabel htmlFor="app-scaffold-price">{copy.priceMinor}</FieldLabel>
                  <Input
                    aria-describedby={priceIssue ? "app-scaffold-price-error" : undefined}
                    aria-invalid={Boolean(priceIssue)}
                    id="app-scaffold-price"
                    inputMode="numeric"
                    onChange={(event) => updateDraft("priceMinor", event.target.value)}
                    placeholder={copy.priceMinorPlaceholder}
                    value={draft.priceMinor}
                  />
                  {priceIssue ? (
                    <FieldError id="app-scaffold-price-error">{issueMessage(priceIssue)}</FieldError>
                  ) : null}
                </Field>
                <Field invalid={Boolean(currencyIssue)} required>
                  <FieldLabel htmlFor="app-scaffold-currency">{copy.currency}</FieldLabel>
                  <Input
                    aria-describedby={currencyIssue ? "app-scaffold-currency-error" : undefined}
                    aria-invalid={Boolean(currencyIssue)}
                    id="app-scaffold-currency"
                    maxLength={3}
                    onChange={(event) => updateDraft("currency", event.target.value)}
                    placeholder={copy.currencyPlaceholder}
                    value={draft.currency}
                  />
                  {currencyIssue ? (
                    <FieldError id="app-scaffold-currency-error">{issueMessage(currencyIssue)}</FieldError>
                  ) : null}
                </Field>
              </>
            ) : null}

            <Field>
              <FieldLabel htmlFor="app-scaffold-icon">{copy.iconMediaRef}</FieldLabel>
              <Input
                id="app-scaffold-icon"
                onChange={(event) => updateDraft("iconMediaRef", event.target.value)}
                placeholder={copy.iconMediaRefPlaceholder}
                value={draft.iconMediaRef}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="app-scaffold-cover">{copy.coverMediaRef}</FieldLabel>
              <Input
                id="app-scaffold-cover"
                onChange={(event) => updateDraft("coverMediaRef", event.target.value)}
                placeholder={copy.coverMediaRefPlaceholder}
                value={draft.coverMediaRef}
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="app-scaffold-screenshots">{copy.screenshots}</FieldLabel>
              <Textarea
                id="app-scaffold-screenshots"
                onChange={(event) => updateDraft("screenshotsText", event.target.value)}
                placeholder={copy.screenshotsPlaceholder}
                rows={4}
                value={draft.screenshotsText}
              />
              <FieldDescription>{copy.screenshotsHint}</FieldDescription>
            </Field>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={saving} onClick={onClose} type="button" variant="outline">
            {copy.cancel}
          </Button>
          <Button disabled={saving} onClick={() => void handleSubmit()} type="button">
            {saving ? copy.saving : copy.save}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function findIssue(
  issues: readonly ApplicationScaffoldIssue[],
  field: ApplicationScaffoldIssueField,
): ApplicationScaffoldIssue | undefined {
  return issues.find((issue) => issue.field === field);
}

function resolveFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isApplicationScaffoldForbidden(error)) {
    return messages.scaffolds.form.forbidden;
  }
  if (isApplicationScaffoldUnavailable(error)) {
    return messages.scaffolds.form.unavailable;
  }
  return messages.scaffolds.form.saveError;
}

/** Unreachable for well-typed issue codes; keeps a bad runtime value readable. */
function copiesFallback(code: string): string {
  return code;
}
