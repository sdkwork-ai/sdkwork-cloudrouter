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
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { isAppStoreCollectionForbidden } from "../services/appstore-collections";
import type { AppStoreCollection, AppStoreCollectionService } from "../types/appstore-collections";

export interface AppCollectionItemsDrawerProps {
  collection: AppStoreCollection;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreCollectionService;
}

/** Replace the ordered listing set of one collection. */
export function AppCollectionItemsDrawer({
  collection,
  messages,
  onClose,
  onSaved,
  service,
}: AppCollectionItemsDrawerProps) {
  const copy = messages.collections.items;
  const [listingIds, setListingIds] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    const items = listingIds
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((listingId, index) => ({ listingId, sortOrder: index }));
    setSubmitting(true);
    setError(undefined);
    try {
      await service.replaceItems(collection.collectionId, items);
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
            <FieldLabel htmlFor="collection-listing-ids">{copy.listingIds}</FieldLabel>
            <Textarea
              id="collection-listing-ids"
              onChange={(event) => setListingIds(event.target.value)}
              placeholder={copy.listingIdsPlaceholder}
              rows={10}
              value={listingIds}
            />
            <p className="text-xs text-[var(--sdk-color-text-muted)]">{copy.listingIdsHint}</p>
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
