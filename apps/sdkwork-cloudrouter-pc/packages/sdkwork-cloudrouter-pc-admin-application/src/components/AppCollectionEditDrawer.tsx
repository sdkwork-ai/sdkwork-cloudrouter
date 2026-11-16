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

export interface AppCollectionEditDrawerProps {
  collection: AppStoreCollection;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreCollectionService;
}

/** Update a collection's lifecycle status and sort order. */
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

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      const parsedSort = sortOrder.trim() ? Number(sortOrder) : undefined;
      await service.update(collection.collectionId, {
        collectionStatus: status,
        ...(parsedSort === undefined || Number.isNaN(parsedSort) ? {} : { sortOrder: parsedSort }),
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

          <Field>
            <FieldLabel htmlFor="collection-sort-order">{copy.sortOrder}</FieldLabel>
            <Input
              id="collection-sort-order"
              inputMode="numeric"
              min={0}
              onChange={(event) => setSortOrder(event.target.value)}
              type="number"
              value={sortOrder}
            />
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
