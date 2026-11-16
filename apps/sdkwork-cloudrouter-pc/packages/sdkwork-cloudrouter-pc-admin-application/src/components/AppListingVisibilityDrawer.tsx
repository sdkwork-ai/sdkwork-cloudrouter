import { useState } from "react";
import { Eye } from "lucide-react";
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
import { isAppStoreListingForbidden } from "../services/appstore-listings";
import type {
  AppStoreListing,
  AppStoreListingService,
  AppStoreListingVisibility,
} from "../types/appstore-listings";

const VISIBILITY_STATES: readonly AppStoreListingVisibility[] = [
  "VISIBLE",
  "HIDDEN",
  "DELISTED",
  "REGION_RESTRICTED",
];

export interface AppListingVisibilityDrawerProps {
  listing: AppStoreListing;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreListingService;
}

/** Change one listing's storefront visibility. */
export function AppListingVisibilityDrawer({
  listing,
  messages,
  onClose,
  onSaved,
  service,
}: AppListingVisibilityDrawerProps) {
  const copy = messages.listings.dialog;
  const [visibility, setVisibility] = useState<AppStoreListingVisibility>(
    normalizeVisibility(listing.storefrontVisibility),
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await service.updateVisibility(listing.listingId, {
        storefrontVisibility: visibility,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
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
            {listing.displayName} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.state}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {VISIBILITY_STATES.map((state) => {
                const active = state === visibility;
                return (
                  <button
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-[var(--sdk-radius-control)] border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                        : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]"
                    }`}
                    key={state}
                    onClick={() => setVisibility(state)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" />
                    {messages.listings.visibility[state]}
                  </button>
                );
              })}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="listing-visibility-reason">{copy.reason}</FieldLabel>
            <Textarea
              id="listing-visibility-reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              rows={3}
              value={reason}
            />
          </Field>

          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreListingForbidden(error) ? copy.forbidden : copy.error}
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

function normalizeVisibility(value: string | undefined): AppStoreListingVisibility {
  return value === "HIDDEN" || value === "DELISTED" || value === "REGION_RESTRICTED"
    ? value
    : "VISIBLE";
}
