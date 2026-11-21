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
  FieldLabel,
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { templateMessage } from "../services/message-template";
import { isAppStoreCollectionForbidden } from "../services/appstore-collections";
import type { AppStoreCollection, AppStoreCollectionService } from "../types/appstore-collections";

export interface AppCollectionItemsDrawerProps {
  collection: AppStoreCollection;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreCollectionService;
}

/** Parse the textarea into an ordered listing list, one id per non-empty line. */
function parseListingIds(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Replace the ordered listing set of one collection.
 *
 * The save is a full replacement, so the drawer previews how many listings the
 * current text will write before the operator commits to it.
 */
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
  const parsedCount = parseListingIds(listingIds).length;

  const submit = async () => {
    const items = parseListingIds(listingIds).map((listingId, index) => ({
      listingId,
      sortOrder: index,
    }));
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
              autoFocus
              id="collection-listing-ids"
              onChange={(event) => setListingIds(event.target.value)}
              placeholder={copy.listingIdsPlaceholder}
              rows={10}
              value={listingIds}
            />
            <FieldDescription>{copy.listingIdsHint}</FieldDescription>
            {parsedCount > 0 ? (
              <p
                className="text-xs font-medium text-[var(--sdk-color-text-secondary)]"
                data-app-center-collection-item-count
              >
                {templateMessage(copy.parsedTemplate, { count: String(parsedCount) })}
              </p>
            ) : null}
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
