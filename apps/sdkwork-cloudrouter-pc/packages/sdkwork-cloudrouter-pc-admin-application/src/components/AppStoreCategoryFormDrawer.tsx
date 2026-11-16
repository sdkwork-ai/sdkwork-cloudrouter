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
  createCategoryDraft,
  createEmptyCategoryDraft,
  listEligibleParents,
  resolveDraftLevel,
  toCategoryCreateInput,
  toCategoryUpdateInput,
  validateCategoryDraft,
  type AppStoreCategoryDraft,
  type AppStoreCategoryDraftIssue,
} from "../services/appstore-category-form";
import {
  isAppStoreCategoryConflict,
  isAppStoreCategoryForbidden,
  isAppStoreCategoryUnavailable,
} from "../services/appstore-categories";
import type {
  AppStoreCategory,
  AppStoreCategoryService,
} from "../types/appstore-categories";

const ROOT_PARENT = "__root__";

/**
 * Create/edit drawer for one App Store category.
 *
 * The form owns client-side validation only for mistakes the backend would
 * reject or silently ignore: duplicate codes, empty names, parent cycles, and
 * a level that does not follow from the parent. The backend remains the
 * authority on uniqueness and transition legality.
 */
export function AppStoreCategoryFormDrawer({
  categories,
  category,
  initialParentId,
  messages,
  onClose,
  onSaved,
  service,
}: {
  categories: readonly AppStoreCategory[];
  category?: AppStoreCategory;
  /** Preselect a parent when creating a child from the cascade column. */
  initialParentId?: string;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: (category?: AppStoreCategory) => void;
  service: AppStoreCategoryService;
}) {
  const copy = messages.categories.form;
  const editing = Boolean(category);
  const [draft, setDraft] = useState<AppStoreCategoryDraft>(() => {
    if (category) {
      return createCategoryDraft(category);
    }
    const parentId = initialParentId ?? "";
    return {
      ...createEmptyCategoryDraft(nextSortOrder(categories)),
      parentId,
      level: String(resolveDraftLevel(parentId, categories)),
    };
  });
  const [issues, setIssues] = useState<AppStoreCategoryDraftIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const eligibleParents = useMemo(
    () => listEligibleParents(categories, category?.id),
    [categories, category?.id],
  );
  const rootSelectable = !category?.parentId;

  const updateDraft = <K extends keyof AppStoreCategoryDraft>(
    key: K,
    value: AppStoreCategoryDraft[K],
  ) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateLocalization = (
    locale: string,
    field: "displayName" | "description",
    value: string,
  ) => {
    setSaved(false);
    setDraft((current) => ({
      ...current,
      localizations: current.localizations.map((entry) =>
        entry.locale === locale ? { ...entry, [field]: value } : entry),
    }));
  };

  const handleParentChange = (value: string) => {
    const parentId = value === ROOT_PARENT ? "" : value;
    setSaved(false);
    setDraft((current) => ({
      ...current,
      parentId,
      level: String(resolveDraftLevel(parentId, categories)),
    }));
  };

  const handleSubmit = async () => {
    const nextIssues = validateCategoryDraft(draft, categories, category?.id);
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      if (category) {
        const updated = await service.update(category.id, toCategoryUpdateInput(draft, category));
        setSaved(true);
        onSaved(updated);
      } else {
        const created = await service.create(toCategoryCreateInput(draft));
        setSaved(true);
        onSaved(created);
      }
    } catch (error) {
      if (isAppStoreCategoryConflict(error)) {
        setIssues([{ field: "code", code: "code-duplicate" }]);
      } else {
        setSaveError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  const codeIssue = findIssue(issues, "code");
  const parentIssue = findIssue(issues, "parent");
  const sortOrderIssue = findIssue(issues, "sortOrder");
  const failureText = saveError ? saveFailureMessage(saveError, messages) : undefined;

  const resolveParentLabel = (candidate: AppStoreCategory): string => {
    const name = candidate.localizations.find((entry) => entry.displayName)?.displayName;
    return name ? `${name} (${candidate.code})` : candidate.code;
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
          <DrawerDescription>
            {editing ? copy.editDescription : copy.createDescription}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-5">
          {failureText ? <StatusNotice tone="danger">{failureText}</StatusNotice> : null}
          {saved ? <StatusNotice tone="success">{copy.saved}</StatusNotice> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field invalid={Boolean(codeIssue)} required={!editing}>
              <FieldLabel htmlFor="appstore-category-code">{copy.code}</FieldLabel>
              <Input
                aria-invalid={Boolean(codeIssue)}
                disabled={editing || saving}
                id="appstore-category-code"
                onChange={(event) => updateDraft("code", event.target.value)}
                placeholder={copy.codePlaceholder}
                value={draft.code}
              />
              <FieldDescription>{editing ? copy.codeImmutable : copy.codeHint}</FieldDescription>
              {codeIssue ? (
                <FieldError>{issueMessage(codeIssue, messages)}</FieldError>
              ) : null}
            </Field>

            <Field invalid={Boolean(parentIssue)}>
              <FieldLabel htmlFor="appstore-category-parent">{copy.parent}</FieldLabel>
              <Select disabled={saving} onValueChange={handleParentChange} value={draft.parentId || ROOT_PARENT}>
                <SelectTrigger aria-label={copy.parent} id="appstore-category-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rootSelectable ? (
                    <SelectItem value={ROOT_PARENT}>{copy.parentNone}</SelectItem>
                  ) : null}
                  {eligibleParents.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {resolveParentLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {category?.parentId ? copy.parentLockedHint : copy.parentHint}
              </FieldDescription>
              {parentIssue ? (
                <FieldError>{issueMessage(parentIssue, messages)}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="appstore-category-level">{copy.level}</FieldLabel>
              <Input
                disabled
                id="appstore-category-level"
                readOnly
                value={draft.level}
              />
            </Field>

            <Field invalid={Boolean(sortOrderIssue)}>
              <FieldLabel htmlFor="appstore-category-sort-order">{copy.sortOrder}</FieldLabel>
              <Input
                aria-invalid={Boolean(sortOrderIssue)}
                id="appstore-category-sort-order"
                inputMode="numeric"
                onChange={(event) => updateDraft("sortOrder", event.target.value)}
                value={draft.sortOrder}
              />
              <FieldDescription>{copy.sortOrderHint}</FieldDescription>
              {sortOrderIssue ? (
                <FieldError>{issueMessage(sortOrderIssue, messages)}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="appstore-category-status">{copy.status}</FieldLabel>
              <Select
                disabled={saving}
                onValueChange={(value) =>
                  updateDraft("status", value === "inactive" ? "inactive" : "active")}
                value={draft.status === "active" ? "active" : "inactive"}
              >
                <SelectTrigger aria-label={copy.status} id="appstore-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{messages.categories.statuses.active}</SelectItem>
                  <SelectItem value="inactive">{messages.categories.statuses.inactive}</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>{copy.statusHint}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="appstore-category-icon">{copy.icon}</FieldLabel>
              <Input
                id="appstore-category-icon"
                onChange={(event) => updateDraft("iconMediaResourceId", event.target.value)}
                placeholder={copy.iconPlaceholder}
                value={draft.iconMediaResourceId}
              />
              <FieldDescription>{copy.iconHint}</FieldDescription>
            </Field>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                {copy.name}
              </h3>
              <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.localeHint}</p>
            </div>
            {draft.localizations.map((localization) => {
              const nameIssue = findIssue(issues, "locale", localization.locale);
              const descriptionTooLong = issues.find(
                (issue) => issue.code === "description-too-long" && issue.locale === localization.locale,
              );
              return (
                <div
                  className="space-y-3 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] p-4"
                  key={localization.locale}
                >
                  <p className="text-xs font-medium text-[var(--sdk-color-text-secondary)]">
                    {localeLabel(localization.locale, messages)}
                  </p>
                  <Field invalid={Boolean(nameIssue)} required={localization.locale === "zh-CN"}>
                    <FieldLabel htmlFor={`appstore-category-name-${localization.locale}`}>
                      {copy.name}
                    </FieldLabel>
                    <Input
                      aria-invalid={Boolean(nameIssue)}
                      id={`appstore-category-name-${localization.locale}`}
                      onChange={(event) =>
                        updateLocalization(localization.locale, "displayName", event.target.value)}
                      placeholder={copy.namePlaceholder}
                      value={localization.displayName}
                    />
                    {nameIssue ? (
                      <FieldError>{issueMessage(nameIssue, messages)}</FieldError>
                    ) : null}
                  </Field>
                  <Field invalid={Boolean(descriptionTooLong)}>
                    <FieldLabel htmlFor={`appstore-category-description-${localization.locale}`}>
                      {copy.description}
                    </FieldLabel>
                    <Textarea
                      aria-invalid={Boolean(descriptionTooLong)}
                      id={`appstore-category-description-${localization.locale}`}
                      onChange={(event) =>
                        updateLocalization(localization.locale, "description", event.target.value)}
                      placeholder={copy.descriptionPlaceholder}
                      rows={2}
                      value={localization.description}
                    />
                    <FieldDescription>{copy.localeDescriptionHint}</FieldDescription>
                    {descriptionTooLong ? (
                      <FieldError>{issueMessage(descriptionTooLong, messages)}</FieldError>
                    ) : null}
                  </Field>
                </div>
              );
            })}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={saving} onClick={onClose} type="button" variant="secondary">
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
  issues: readonly AppStoreCategoryDraftIssue[],
  field: AppStoreCategoryDraftIssue["field"],
  locale?: string,
): AppStoreCategoryDraftIssue | undefined {
  return issues.find((issue) => issue.field === field
    && (locale === undefined ? issue.locale === undefined : issue.locale === locale));
}

function issueMessage(
  issue: AppStoreCategoryDraftIssue,
  messages: ApplicationCatalogMessages,
): string {
  const template = messages.categories.form.validation[issue.code];
  return template.replace("{locale}", issue.locale ? localeLabel(issue.locale, messages) : "");
}

function localeLabel(locale: string, messages: ApplicationCatalogMessages): string {
  switch (locale) {
    case "zh-CN":
      return messages.categories.form.localeZh;
    case "en-US":
      return messages.categories.form.localeEn;
    default:
      return locale;
  }
}

function saveFailureMessage(
  error: unknown,
  messages: ApplicationCatalogMessages,
): string {
  if (isAppStoreCategoryForbidden(error)) {
    return messages.categories.forbidden;
  }
  if (isAppStoreCategoryUnavailable(error)) {
    return messages.categories.unavailable;
  }
  return messages.categories.form.saveError;
}

function nextSortOrder(categories: readonly AppStoreCategory[]): number {
  if (categories.length === 0) {
    return 10;
  }
  return Math.max(...categories.map((category) => category.sortOrder)) + 10;
}
