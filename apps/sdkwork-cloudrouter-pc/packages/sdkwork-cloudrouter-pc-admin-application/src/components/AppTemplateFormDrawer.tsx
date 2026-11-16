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
  createEmptyTemplateDraft,
  createTemplateDraft,
  toTemplateCreateInput,
  toTemplateUpdateInput,
  validateTemplateDraft,
} from "../services/deploy-template-form";
import {
  isDeployAppTemplateForbidden,
  isDeployAppTemplateUnavailable,
} from "../services/deploy-app-templates";
import type {
  DeployAppOption,
  DeployAppTemplate,
  DeployAppTemplateCategory,
  DeployAppTemplateDraft,
  DeployAppTemplateIssue,
  DeployAppTemplateIssueField,
  DeployAppTemplateService,
} from "../types/deploy-app-templates";

/**
 * Create/edit drawer for one app-template listing.
 *
 * Validation covers only what the platform write contract rejects: identity
 * fields, copy length, and paid-listing price/currency. The service/backend
 * remains authoritative on uniqueness and review transitions.
 */
export function AppTemplateFormDrawer({
  apps,
  categories,
  messages,
  onClose,
  onSaved,
  service,
  template,
}: {
  apps: readonly DeployAppOption[];
  categories: readonly DeployAppTemplateCategory[];
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: (template: DeployAppTemplate) => void;
  service: DeployAppTemplateService;
  template?: DeployAppTemplate;
}) {
  const copy = messages.templates.form;
  const editing = Boolean(template);
  const [draft, setDraft] = useState<DeployAppTemplateDraft>(() =>
    template
      ? createTemplateDraft(template)
      : createEmptyTemplateDraft(categories[0]?.id ?? ""));
  const [issues, setIssues] = useState<DeployAppTemplateIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const updateDraft = <K extends keyof DeployAppTemplateDraft>(
    key: K,
    value: DeployAppTemplateDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    const nextIssues = validateTemplateDraft(draft, editing);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      const result = template
        ? await service.update(template.id, toTemplateUpdateInput(draft))
        : await service.create(toTemplateCreateInput(draft));
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
  const keyIssue = findIssue(issues, "templateKey");
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

  const issueMessage = (issue: DeployAppTemplateIssue): string => {
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
              <FieldLabel htmlFor="app-template-app">{copy.app}</FieldLabel>
              {editing ? (
                <Input disabled id="app-template-app" readOnly value={appName} />
              ) : (
                <Select
                  disabled={saving}
                  onValueChange={(value) => updateDraft("appUuid", value)}
                  value={draft.appUuid}
                >
                  <SelectTrigger aria-label={copy.app} id="app-template-app">
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
              {appIssue ? <FieldError>{issueMessage(appIssue)}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(categoryIssue)} required>
              <FieldLabel htmlFor="app-template-category">{copy.category}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) => updateDraft("categoryUuid", value)}
                value={draft.categoryUuid}
              >
                <SelectTrigger aria-label={copy.category} id="app-template-category">
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
              {categoryIssue ? <FieldError>{issueMessage(categoryIssue)}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(keyIssue)} required={!editing}>
              <FieldLabel htmlFor="app-template-key">{copy.templateKey}</FieldLabel>
              <Input
                aria-invalid={Boolean(keyIssue)}
                disabled={editing || saving}
                id="app-template-key"
                onChange={(event) => updateDraft("templateKey", event.target.value)}
                placeholder={copy.templateKeyPlaceholder}
                value={draft.templateKey}
              />
              <FieldDescription>{copy.templateKeyHint}</FieldDescription>
              {keyIssue ? <FieldError>{issueMessage(keyIssue)}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(nameIssue)} required>
              <FieldLabel htmlFor="app-template-name">{copy.displayName}</FieldLabel>
              <Input
                aria-invalid={Boolean(nameIssue)}
                id="app-template-name"
                maxLength={120}
                onChange={(event) => updateDraft("displayName", event.target.value)}
                placeholder={copy.displayNamePlaceholder}
                value={draft.displayName}
              />
              {nameIssue ? <FieldError>{issueMessage(nameIssue)}</FieldError> : null}
            </Field>

            <Field className="sm:col-span-2" invalid={Boolean(summaryIssue)} required>
              <FieldLabel htmlFor="app-template-summary">{copy.summary}</FieldLabel>
              <Input
                aria-invalid={Boolean(summaryIssue)}
                id="app-template-summary"
                maxLength={280}
                onChange={(event) => updateDraft("summary", event.target.value)}
                placeholder={copy.summaryPlaceholder}
                value={draft.summary}
              />
              {summaryIssue ? <FieldError>{issueMessage(summaryIssue)}</FieldError> : null}
            </Field>

            <Field className="sm:col-span-2" invalid={Boolean(descriptionIssue)}>
              <FieldLabel htmlFor="app-template-description">{copy.description}</FieldLabel>
              <Textarea
                aria-invalid={Boolean(descriptionIssue)}
                id="app-template-description"
                maxLength={4000}
                onChange={(event) => updateDraft("description", event.target.value)}
                placeholder={copy.descriptionPlaceholder}
                rows={5}
                value={draft.description}
              />
              {descriptionIssue ? <FieldError>{issueMessage(descriptionIssue)}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="app-template-visibility">{copy.visibility}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) =>
                  updateDraft("visibility", value === "PRIVATE" ? "PRIVATE" : "PUBLIC")}
                value={draft.visibility}
              >
                <SelectTrigger aria-label={copy.visibility} id="app-template-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">{messages.templates.visibility.PUBLIC}</SelectItem>
                  <SelectItem value="PRIVATE">{messages.templates.visibility.PRIVATE}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="app-template-pricing">{copy.pricingModel}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) =>
                  updateDraft("pricingModel", value === "PAID" ? "PAID" : "FREE")}
                value={draft.pricingModel}
              >
                <SelectTrigger aria-label={copy.pricingModel} id="app-template-pricing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{messages.templates.pricing.FREE}</SelectItem>
                  <SelectItem value="PAID">{messages.templates.pricing.PAID}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {paid ? (
              <>
                <Field invalid={Boolean(priceIssue)} required>
                  <FieldLabel htmlFor="app-template-price">{copy.priceMinor}</FieldLabel>
                  <Input
                    aria-invalid={Boolean(priceIssue)}
                    id="app-template-price"
                    inputMode="numeric"
                    onChange={(event) => updateDraft("priceMinor", event.target.value)}
                    placeholder={copy.priceMinorPlaceholder}
                    value={draft.priceMinor}
                  />
                  {priceIssue ? <FieldError>{issueMessage(priceIssue)}</FieldError> : null}
                </Field>
                <Field invalid={Boolean(currencyIssue)} required>
                  <FieldLabel htmlFor="app-template-currency">{copy.currency}</FieldLabel>
                  <Input
                    aria-invalid={Boolean(currencyIssue)}
                    id="app-template-currency"
                    maxLength={3}
                    onChange={(event) => updateDraft("currency", event.target.value)}
                    placeholder={copy.currencyPlaceholder}
                    value={draft.currency}
                  />
                  {currencyIssue ? <FieldError>{issueMessage(currencyIssue)}</FieldError> : null}
                </Field>
              </>
            ) : null}

            <Field>
              <FieldLabel htmlFor="app-template-icon">{copy.iconMediaRef}</FieldLabel>
              <Input
                id="app-template-icon"
                onChange={(event) => updateDraft("iconMediaRef", event.target.value)}
                placeholder={copy.iconMediaRefPlaceholder}
                value={draft.iconMediaRef}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="app-template-cover">{copy.coverMediaRef}</FieldLabel>
              <Input
                id="app-template-cover"
                onChange={(event) => updateDraft("coverMediaRef", event.target.value)}
                placeholder={copy.coverMediaRefPlaceholder}
                value={draft.coverMediaRef}
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="app-template-screenshots">{copy.screenshots}</FieldLabel>
              <Textarea
                id="app-template-screenshots"
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
  issues: readonly DeployAppTemplateIssue[],
  field: DeployAppTemplateIssueField,
): DeployAppTemplateIssue | undefined {
  return issues.find((issue) => issue.field === field);
}

function resolveFailure(error: unknown, messages: ApplicationCatalogMessages): string {
  if (isDeployAppTemplateForbidden(error)) {
    return messages.templates.form.forbidden;
  }
  if (isDeployAppTemplateUnavailable(error)) {
    return messages.templates.form.unavailable;
  }
  return messages.templates.form.saveError;
}

/** Unreachable for well-typed issue codes; keeps a bad runtime value readable. */
function copiesFallback(code: string): string {
  return code;
}
