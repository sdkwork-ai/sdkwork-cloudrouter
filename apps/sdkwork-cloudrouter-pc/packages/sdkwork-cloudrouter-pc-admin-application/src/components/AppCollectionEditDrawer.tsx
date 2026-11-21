import { useState } from "react";
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
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { isAppStoreCollectionForbidden } from "../services/appstore-collections";
import type { AppStoreCollection, AppStoreCollectionService } from "../types/appstore-collections";

const COLLECTION_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

/** Sort order is an integral editorial position, never a negative or fractional one. */
const SORT_ORDER_PATTERN = /^(0|[1-9][0-9]{0,5})$/u;

export interface AppCollectionEditDrawerProps {
  collection: AppStoreCollection;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreCollectionService;
}

/**
 * Update a collection's lifecycle status and sort order.
 *
 * The order field is validated before the write: `type="number"` accepts a
 * negative or fractional value that the backend cannot order, so an invalid
 * entry stays a field error instead of a failed request.
 */
export function AppCollectionEditDrawer({
  collection,
  messages,
  onClose,
  onSaved,
  service,
}: AppCollectionEditDrawerProps) {
  const copy = messages.collections.edit;
  const [status, setStatus] = useState<string>(normalizeStatus(collection.status));
  const [sortOrder, setSortOrder] = useState<string>(
    collection.sortOrder === undefined ? "" : String(collection.sortOrder),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const submit = async () => {
    const trimmedSort = sortOrder.trim();
    if (trimmedSort && !SORT_ORDER_PATTERN.test(trimmedSort)) {
      setValidationError(copy.invalidSortOrder);
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    try {
      await service.update(collection.collectionId, {
        collectionStatus: status,
        ...(trimmedSort ? { sortOrder: Number(trimmedSort) } : {}),
      });
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
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>
            {collection.displayName ?? collection.collectionCode} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="collection-status">{copy.status}</FieldLabel>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger id="collection-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_STATUSES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {messages.collections.statuses[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field invalid={Boolean(validationError)}>
            <FieldLabel htmlFor="collection-sort-order">{copy.sortOrder}</FieldLabel>
            <Input
              aria-describedby={validationError ? "collection-sort-order-error" : undefined}
              aria-invalid={Boolean(validationError)}
              id="collection-sort-order"
              inputMode="numeric"
              onChange={(event) => {
                setSortOrder(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              value={sortOrder}
            />
            {validationError ? (
              <FieldError id="collection-sort-order-error">{validationError}</FieldError>
            ) : (
              <FieldDescription>{copy.sortOrderHint}</FieldDescription>
            )}
          </Field>

          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreCollectionForbidden(error) ? messages.collections.forbidden : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void submit()} type="button">
            {submitting ? copy.submitting : copy.submit}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function normalizeStatus(status: string | undefined): string {
  return status === "DRAFT" || status === "ARCHIVED" ? status : "ACTIVE";
}
