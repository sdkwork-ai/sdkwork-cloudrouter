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
  isApplicationScaffoldAdminForbidden,
  isApplicationScaffoldAdminUnavailable,
  SCAFFOLD_CATEGORY_KEY_PATTERN,
  type ApplicationScaffoldAdminService,
  type ScaffoldCategory,
  type ScaffoldCategoryInput,
} from "../services/application-scaffold-admin";

const ROOT_PARENT = "__root__";

export interface ScaffoldCategoryFormDrawerProps {
  categories: readonly ScaffoldCategory[];
  category?: ScaffoldCategory;
  initialParentId?: string;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: ApplicationScaffoldAdminService;
}

/** Create or edit a scaffold category through the Deploy backend. */
export function ScaffoldCategoryFormDrawer({
  categories,
  category,
  initialParentId,
  messages,
  onClose,
  onSaved,
  service,
}: ScaffoldCategoryFormDrawerProps) {
  const copy = messages.scaffoldCategories.form;
  const [categoryKey, setCategoryKey] = useState(category?.categoryKey ?? "");
  const [displayName, setDisplayName] = useState(category?.displayName ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? initialParentId ?? ROOT_PARENT);
  const [sortOrder, setSortOrder] = useState(
    category
      ? String(category.sortOrder ?? 0)
      : String(nextSiblingSortOrder(categories, initialParentId ?? ROOT_PARENT)),
  );
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(category?.status === "DISABLED" ? "DISABLED" : "ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const parentOptions = useMemo(
    () => categories.filter((candidate) =>
      !isSelfOrDescendant(candidate, category, categories)
      && categoryDepth(candidate, categories) + (category ? subtreeHeight(category, categories) : 1) <= 5),
    [categories, category],
  );

  const submit = async () => {
    const key = categoryKey.trim();
    if (!key) {
      setValidationError(copy.validation["key-required"]);
      return;
    }
    if (!SCAFFOLD_CATEGORY_KEY_PATTERN.test(key)) {
      setValidationError(copy.validation["key-invalid"]);
      return;
    }
    if (!displayName.trim()) {
      setValidationError(copy.validation["display-name-required"]);
      return;
    }
    const parent = parentId && parentId !== ROOT_PARENT
      ? categories.find((candidate) => candidate.id === parentId)
      : undefined;
    if (parent && categoryDepth(parent, categories) >= 5) {
      setValidationError(messages.categories.cascade.depthHint);
      return;
    }
    if (
      parent
      && category
      && categoryDepth(parent, categories) + subtreeHeight(category, categories) > 5
    ) {
      setValidationError(messages.categories.cascade.depthHint);
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    const parsedSort = sortOrder.trim() ? Number(sortOrder) : undefined;
    const input: ScaffoldCategoryInput = {
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
            <FieldLabel htmlFor="scaffold-category-key">{copy.key}</FieldLabel>
            <Input
              disabled={Boolean(category)}
              id="scaffold-category-key"
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
            <FieldLabel htmlFor="scaffold-category-name">{copy.displayName}</FieldLabel>
            <Input
              id="scaffold-category-name"
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
            <FieldLabel htmlFor="scaffold-category-description">{copy.description}</FieldLabel>
            <Textarea
              id="scaffold-category-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.descriptionPlaceholder}
              rows={3}
              value={description}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="scaffold-category-parent">{copy.parent}</FieldLabel>
            <Select onValueChange={setParentId} value={parentId}>
              <SelectTrigger id="scaffold-category-parent">
                <SelectValue placeholder={copy.parentPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_PARENT}>{messages.scaffoldCategories.rootParent}</SelectItem>
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
              <FieldLabel htmlFor="scaffold-category-sort">{copy.sortOrder}</FieldLabel>
              <Input
                id="scaffold-category-sort"
                inputMode="numeric"
                onChange={(event) => setSortOrder(event.target.value)}
                type="number"
                value={sortOrder}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="scaffold-category-status">{copy.status}</FieldLabel>
              <Select
                onValueChange={(value) => setStatus(value as "ACTIVE" | "DISABLED")}
                value={status}
              >
                <SelectTrigger id="scaffold-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{messages.scaffoldCategories.statuses.ACTIVE}</SelectItem>
                  <SelectItem value="DISABLED">{messages.scaffoldCategories.statuses.DISABLED}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
          {error ? (
            <StatusNotice tone="danger">
              {isApplicationScaffoldAdminForbidden(error)
                ? copy.forbidden
                : isApplicationScaffoldAdminUnavailable(error)
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
  candidate: ScaffoldCategory,
  category: ScaffoldCategory | undefined,
  categories: readonly ScaffoldCategory[],
): boolean {
  if (!category) {
    return false;
  }
  if (candidate.id === category.id) {
    return true;
  }
  const byId = new Map(categories.map((item) => [item.id, item]));
  let current: ScaffoldCategory | undefined = candidate;
  while (current?.parentId) {
    if (current.parentId === category.id) {
      return true;
    }
    current = byId.get(current.parentId);
  }
  return false;
}

/** Depth of a scaffold category (root = 1) for the five-level cap. */
function categoryDepth(
  category: ScaffoldCategory,
  categories: readonly ScaffoldCategory[],
): number {
  const byId = new Map(categories.map((item) => [item.id, item]));
  let depth = 1;
  let current = category;
  while (current.parentId && depth < 10) {
    depth += 1;
    const parent = byId.get(current.parentId);
    if (!parent) {
      break;
    }
    current = parent;
  }
  return depth;
}

/** Next sort order among siblings, so new categories append at the end. */
function nextSiblingSortOrder(
  categories: readonly ScaffoldCategory[],
  parentId: string,
): number {
  const siblings = categories.filter((item) => (item.parentId ?? ROOT_PARENT) === parentId);
  return siblings.length === 0 ? 10 : Math.max(...siblings.map((item) => item.sortOrder ?? 0)) + 10;
}

/** Height of a category subtree (a leaf has height 1). */
function subtreeHeight(
  root: ScaffoldCategory,
  categories: readonly ScaffoldCategory[],
): number {
  const children = new Map<string, ScaffoldCategory[]>();
  for (const item of categories) {
    if (!item.parentId) {
      continue;
    }
    const list = children.get(item.parentId) ?? [];
    list.push(item);
    children.set(item.parentId, list);
  }
  const visit = (id: string): number => {
    const kids = children.get(id) ?? [];
    return 1 + Math.max(0, ...kids.map((kid) => visit(kid.id)));
  };
  return visit(root.id);
}
