import { useState } from "react";
import { CalendarClock } from "lucide-react";
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
import { isAppStoreFeaturedSlotForbidden } from "../services/appstore-featured";
import type {
  AppStoreFeaturedSlot,
  AppStoreFeaturedSlotService,
  AppStoreFeaturedSlotStatus,
} from "../types/appstore-featured";

const SLOT_STATUSES: readonly AppStoreFeaturedSlotStatus[] = ["SCHEDULED", "ACTIVE", "ENDED"];

export interface AppFeaturedSlotDrawerProps {
  isNew?: boolean;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onSaved: () => void;
  service: AppStoreFeaturedSlotService;
  slot: AppStoreFeaturedSlot;
}

/**
 * Upsert one featured slot (listing, window, publication status).
 *
 * Each field owns its validation message: the slot code, the listing, and the
 * window are checked independently and reported under the control that failed,
 * so a rejected save never leaves the operator guessing which input is wrong.
 * The window is a pair, so its message sits under both date fields.
 */
export function AppFeaturedSlotDrawer({
  isNew = false,
  messages,
  onClose,
  onSaved,
  service,
  slot,
}: AppFeaturedSlotDrawerProps) {
  const copy = messages.featured.dialog;
  const [slotCode, setSlotCode] = useState(slot.slotCode);
  const [listingId, setListingId] = useState(slot.listingId);
  const [startsAt, setStartsAt] = useState(toLocalInput(slot.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(slot.endsAt));
  const [slotStatus, setSlotStatus] = useState<AppStoreFeaturedSlotStatus>(
    normalizeStatus(slot.status),
  );
  const [codeError, setCodeError] = useState<string>();
  const [listingError, setListingError] = useState<string>();
  const [windowError, setWindowError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const validate = (): boolean => {
    let valid = true;
    if (isNew && !slotCode.trim()) {
      setCodeError(copy.invalidSlot);
      valid = false;
    }
    if (!listingId.trim()) {
      setListingError(copy.invalidListing);
      valid = false;
    }
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!startsAt || !endsAt || Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      setWindowError(copy.invalidWindow);
      valid = false;
    }
    return valid;
  };

  const submit = async () => {
    if (!validate()) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await service.update(slotCode.trim(), {
        listingId: listingId.trim(),
        startsAt,
        endsAt,
        slotStatus,
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
          <DrawerTitle>{isNew ? copy.createTitle : copy.title}</DrawerTitle>
          <DrawerDescription>
            {isNew ? copy.createDescription : `${slot.slotCode} · ${copy.description}`}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {isNew ? (
            <Field invalid={Boolean(codeError)} required>
              <FieldLabel htmlFor="featured-slot-code">{copy.slotCode}</FieldLabel>
              <Input
                aria-describedby={codeError ? "featured-slot-code-error" : undefined}
                aria-invalid={Boolean(codeError)}
                autoFocus
                id="featured-slot-code"
                onChange={(event) => {
                  setSlotCode(event.target.value);
                  if (codeError) {
                    setCodeError(undefined);
                  }
                }}
                placeholder={copy.slotCodePlaceholder}
                value={slotCode}
              />
              {codeError ? <FieldError id="featured-slot-code-error">{codeError}</FieldError> : null}
            </Field>
          ) : null}

          <Field invalid={Boolean(listingError)} required>
            <FieldLabel htmlFor="featured-listing-id">{copy.listingId}</FieldLabel>
            <Input
              aria-describedby={listingError ? "featured-listing-id-error" : undefined}
              aria-invalid={Boolean(listingError)}
              autoFocus={!isNew}
              id="featured-listing-id"
              onChange={(event) => {
                setListingId(event.target.value);
                if (listingError) {
                  setListingError(undefined);
                }
              }}
              placeholder={copy.listingIdPlaceholder}
              value={listingId}
            />
            {listingError ? (
              <FieldError id="featured-listing-id-error">{listingError}</FieldError>
            ) : null}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                id: "featured-starts-at",
                label: copy.startsAt,
                onChange: (value: string) => {
                  setStartsAt(value);
                  if (windowError) {
                    setWindowError(undefined);
                  }
                },
                value: startsAt,
              },
              {
                id: "featured-ends-at",
                label: copy.endsAt,
                onChange: (value: string) => {
                  setEndsAt(value);
                  if (windowError) {
                    setWindowError(undefined);
                  }
                },
                value: endsAt,
              },
            ].map((field) => (
              <Field invalid={Boolean(windowError)} key={field.id} required>
                <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
                <Input
                  aria-describedby={windowError ? "featured-window-error" : undefined}
                  aria-invalid={Boolean(windowError)}
                  id={field.id}
                  onChange={(event) => field.onChange(event.target.value)}
                  type="datetime-local"
                  value={field.value}
                />
              </Field>
            ))}
          </div>

          {windowError ? <FieldError id="featured-window-error">{windowError}</FieldError> : null}

          <Field>
            <FieldLabel htmlFor="featured-slot-status">{copy.slotStatus}</FieldLabel>
            <Select
              onValueChange={(value) => setSlotStatus(value as AppStoreFeaturedSlotStatus)}
              value={slotStatus}
            >
              <SelectTrigger id="featured-slot-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {copy.statuses[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{copy.windowHint}</FieldDescription>
          </Field>

          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreFeaturedSlotForbidden(error) ? copy.forbidden : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void submit()} type="button">
            <CalendarClock className="h-3.5 w-3.5" />
            {submitting ? copy.submitting : copy.submit}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function normalizeStatus(status: string | undefined): AppStoreFeaturedSlotStatus {
  return status === "ACTIVE" || status === "ENDED" ? status : "SCHEDULED";
}

function toLocalInput(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
