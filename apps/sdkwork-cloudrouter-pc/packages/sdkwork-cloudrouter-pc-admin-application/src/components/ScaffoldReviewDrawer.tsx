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
  type ApplicationScaffoldAdminService,
  type ApplicationScaffoldAdminStatus,
} from "../services/application-scaffold-admin";
import type { ApplicationScaffold } from "../types/application-scaffolds";

const REVIEW_STATUSES: readonly ApplicationScaffoldAdminStatus[] = [
  "PUBLISHED",
  "REJECTED",
  "PENDING_REVIEW",
  "DISABLED",
];

export interface ScaffoldReviewDrawerProps {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onReviewed: () => void;
  service: ApplicationScaffoldAdminService;
  scaffold: ApplicationScaffold;
}

/** Backend-admin moderation of one Deploy app scaffold. */
export function ScaffoldReviewDrawer({
  messages,
  onClose,
  onReviewed,
  service,
  scaffold,
}: ScaffoldReviewDrawerProps) {
  const copy = messages.scaffolds.review;
  const [status, setStatus] = useState<ApplicationScaffoldAdminStatus>(normalizeStatus(scaffold.status));
  const [note, setNote] = useState("");
  const [featured, setFeatured] = useState(scaffold.isFeatured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await service.updateScaffold(scaffold.id, {
        status,
        ...(note.trim() ? { reviewNote: note.trim() } : {}),
        isFeatured: featured,
      });
      onReviewed();
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
            {scaffold.displayName} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {scaffold.reviewNote ? (
            <StatusNotice tone="default">
              {copy.note}: {scaffold.reviewNote}
            </StatusNotice>
          ) : null}
          <Field>
            <FieldLabel htmlFor="scaffold-review-status">{copy.status}</FieldLabel>
            <Select onValueChange={(value) => setStatus(value as ApplicationScaffoldAdminStatus)} value={status}>
              <SelectTrigger id="scaffold-review-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_STATUSES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {messages.scaffolds.statuses[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="scaffold-review-note">{copy.note}</FieldLabel>
            <Textarea
              id="scaffold-review-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder={copy.notePlaceholder}
              rows={4}
              value={note}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--sdk-color-text-secondary)]">
            <input
              checked={featured}
              className="h-4 w-4 rounded border-[var(--sdk-color-border-default)]"
              onChange={(event) => setFeatured(event.target.checked)}
              type="checkbox"
            />
            {copy.featured}
          </label>

          {error ? (
            <StatusNotice tone="danger">
              {isApplicationScaffoldAdminForbidden(error)
                ? copy.forbidden
                : isApplicationScaffoldAdminUnavailable(error)
                  ? copy.unavailable
                  : copy.error}
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

function normalizeStatus(status: ApplicationScaffold["status"]): ApplicationScaffoldAdminStatus {
  return status === "PUBLISHED" || status === "REJECTED" || status === "DISABLED"
    ? status
    : "PENDING_REVIEW";
}
