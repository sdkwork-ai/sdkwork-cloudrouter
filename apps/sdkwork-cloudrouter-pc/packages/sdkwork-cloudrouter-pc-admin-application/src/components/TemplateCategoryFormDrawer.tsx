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
  isDeployTemplateAdminForbidden,
  isDeployTemplateAdminUnavailable,
  TEMPLATE_CATEGORY_KEY_PATTERN,
  type DeployTemplateAdminService,
  type DeployTemplateCategory,
  type DeployTemplateCategoryInput,
} from "../services/deploy-template-admin";

const ROOT_PARENT = "__root__";

export interface TemplateCategoryFormDrawerProps {
  categories: readonly DeployTemplateCategory[];
  category?: DeployTemplateCategory;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: DeployTemplateAdminService;
}

/** Create or edit a template category through the Deploy backend. */
export function TemplateCategoryFormDrawer({
  categories,
  category,
  messages,
  onClose,
  onSaved,
  service,
}: TemplateCategoryFormDrawerProps) {
  const copy = messages.templateCategories.form;
  const [categoryKey, setCategoryKey] = useState(category?.categoryKey ?? "");
  const [displayName, setDisplayName] = useState(category?.displayName ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? ROOT_PARENT);
  const [sortOrder, setSortOrder] = useState(
    category?.sortOrder === undefined ? "" : String(category.sortOrder),
  );
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(category?.status ?? "ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const parentOptions = useMemo(
    () => categories.filter((candidate) => !isSelfOrDescendant(candidate, category, categories)),
    [categories, category],
  );

  const submit = async () => {
    const key = categoryKey.trim();
    if (!key) {
      setValidationError(copy.validation["key-required"]);
      return;
    }
    if (!TEMPLATE_CATEGORY_KEY_PATTERN.test(key)) {
      setValidationError(copy.validation["key-invalid"]);
      return;
    }
    if (!displayName.trim()) {
      setValidationError(copy.validation["display-name-required"]);
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    const parsedSort = sortOrder.trim() ? Number(sortOrder) : undefined;
    const input: DeployTemplateCategoryInput = {
      categoryKey: key,
      displayName: displayName.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(parentId && parentId !== ROOT_PARENT ? { parentId } : {}),
      ...(parsedSort === undefined || Number.isNaN(parsedSort) ? {} : { sortOrder: parsedSort }),
      status,
    };
    try {
      if (category) {
        await service.updateCategory(category.id, input);
      } else {
        await service.createCategory(input);
      }
      onSaved();
      onClose();
    } catch (nextError) {
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !submitting) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{category ? copy.editTitle : copy.createTitle}</DrawerTitle>
          <DrawerDescription>{category ? copy.editDescription : copy.createDescription}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="template-category-key">{copy.key}</FieldLabel>
            <Input
              disabled={Boolean(category)}
              id="template-category-key"
              onChange={(event) => {
                setCategoryKey(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              placeholder={copy.keyPlaceholder}
              value={categoryKey}
            />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.keyHint}</p>
          </Field>

          <Field>
            <FieldLabel htmlFor="template-category-name">{copy.displayName}</FieldLabel>
            <Input
              id="template-category-name"
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              placeholder={copy.displayNamePlaceholder}
              value={displayName}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="template-category-description">{copy.description}</FieldLabel>
            <Textarea
              id="template-category-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.descriptionPlaceholder}
              rows={3}
              value={description}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="template-category-parent">{copy.parent}</FieldLabel>
            <Select onValueChange={setParentId} value={parentId}>
              <SelectTrigger id="template-category-parent">
                <SelectValue placeholder={copy.parentPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_PARENT}>{messages.templateCategories.rootParent}</SelectItem>
                {parentOptions.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.parentHint}</p>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="template-category-sort">{copy.sortOrder}</FieldLabel>
              <Input
                id="template-category-sort"
                inputMode="numeric"
                onChange={(event) => setSortOrder(event.target.value)}
                type="number"
                value={sortOrder}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-category-status">{copy.status}</FieldLabel>
              <Select
                onValueChange={(value) => setStatus(value as "ACTIVE" | "DISABLED")}
                value={status}
              >
                <SelectTrigger id="template-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{messages.templateCategories.statuses.ACTIVE}</SelectItem>
                  <SelectItem value="DISABLED">{messages.templateCategories.statuses.DISABLED}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
          {error ? (
            <StatusNotice tone="danger">
              {isDeployTemplateAdminForbidden(error)
                ? copy.forbidden
                : isDeployTemplateAdminUnavailable(error)
                  ? copy.unavailable
                  : copy.saveError}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void submit()} type="button">
            {submitting ? copy.saving : copy.save}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function isSelfOrDescendant(
  candidate: DeployTemplateCategory,
  category: DeployTemplateCategory | undefined,
  categories: readonly DeployTemplateCategory[],
): boolean {
  if (!category) {
    return false;
  }
  if (candidate.id === category.id) {
    return true;
  }
  const byId = new Map(categories.map((item) => [item.id, item]));
  let current: DeployTemplateCategory | undefined = candidate;
  while (current?.parentId) {
    if (current.parentId === category.id) {
      return true;
    }
    current = byId.get(current.parentId);
  }
  return false;
}
