import { useState } from "react";
import { Eye, EyeOff, Globe, X } from "lucide-react";
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

import { AppCenterDecisionGroup } from "./AppCenterDecisionGroup";
import type { ApplicationCatalogMessages } from "../i18n";
import { isAppStoreListingForbidden } from "../services/appstore-listings";
import type {
  AppStoreListing,
  AppStoreListingService,
  AppStoreListingVisibility,
} from "../types/appstore-listings";

const VISIBILITY_ICONS = {
  DELISTED: <X className="h-4 w-4 shrink-0" />,
  HIDDEN: <EyeOff className="h-4 w-4 shrink-0" />,
  REGION_RESTRICTED: <Globe className="h-4 w-4 shrink-0" />,
  VISIBLE: <Eye className="h-4 w-4 shrink-0" />,
} as const;

const VISIBILITY_TONES: Record<AppStoreListingVisibility, "positive" | "negative" | "neutral"> = {
  DELISTED: "negative",
  HIDDEN: "neutral",
  REGION_RESTRICTED: "neutral",
  VISIBLE: "positive",
};

const VISIBILITY_STATES = [
  "VISIBLE",
  "HIDDEN",
  "DELISTED",
  "REGION_RESTRICTED",
] as const satisfies readonly AppStoreListingVisibility[];

export interface AppListingVisibilityDrawerProps {
  listing: AppStoreListing;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreListingService;
}

/**
 * Change one listing's storefront visibility.
 *
 * Visibility is one of four mutually exclusive states, so it renders as the
 * shared decision control: the icon and the tone say what the storefront will
 * do, and the reason stays optional until a state actually hides the listing.
 */
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
          <AppCenterDecisionGroup
            columns={2}
            label={copy.state}
            onChange={setVisibility}
            options={VISIBILITY_STATES.map((state) => ({
              icon: VISIBILITY_ICONS[state],
              label: messages.listings.visibility[state],
              tone: VISIBILITY_TONES[state],
              value: state,
            }))}
            value={visibility}
          />

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
