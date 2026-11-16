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

/** Upsert one featured slot (listing, window, publication status). */
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const submit = async () => {
    if (!slotCode.trim()) {
      setValidationError(copy.invalidSlot);
      return;
    }
    if (!listingId.trim()) {
      setValidationError(copy.invalidListing);
      return;
    }
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!startsAt || !endsAt || Number.isNaN(start) || Number.isNaN(end) || start >= end) {
      setValidationError(copy.invalidWindow);
      return;
    }
    setValidationError(undefined);
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
            <Field>
              <FieldLabel htmlFor="featured-slot-code">{copy.slotCode}</FieldLabel>
              <Input
                id="featured-slot-code"
                onChange={(event) => setSlotCode(event.target.value)}
                placeholder={copy.slotCodePlaceholder}
                value={slotCode}
              />
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="featured-listing-id">{copy.listingId}</FieldLabel>
            <Input
              id="featured-listing-id"
              onChange={(event) => setListingId(event.target.value)}
              placeholder={copy.listingIdPlaceholder}
              value={listingId}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="featured-starts-at">{copy.startsAt}</FieldLabel>
              <Input
                id="featured-starts-at"
                onChange={(event) => setStartsAt(event.target.value)}
                type="datetime-local"
                value={startsAt}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="featured-ends-at">{copy.endsAt}</FieldLabel>
              <Input
                id="featured-ends-at"
                onChange={(event) => setEndsAt(event.target.value)}
                type="datetime-local"
                value={endsAt}
              />
            </Field>
          </div>

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
          </Field>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
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
