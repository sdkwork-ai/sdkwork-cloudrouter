import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import type {
  AppStoreModerationQueueItem,
  AppStoreModerationReview,
  AppStoreModerationService,
} from "../types/appstore-moderation";

export interface AppModerationReviewDrawerProps {
  item: AppStoreModerationQueueItem;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  service: AppStoreModerationService;
}

/** Read-only moderation review inspector. */
export function AppModerationReviewDrawer({
  item,
  messages,
  onClose,
  service,
}: AppModerationReviewDrawerProps) {
  const copy = messages.moderation.detail;
  const [review, setReview] = useState<AppStoreModerationReview | AppStoreModerationQueueItem>(item);
  const [loading, setLoading] = useState(Boolean(service.getReview));
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (!service.getReview) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void service.getReview(item.reviewId).then(
      (detail) => {
        if (!cancelled) {
          if (detail) {
            setReview(detail);
          }
          setLoading(false);
        }
      },
      (nextError: unknown) => {
        if (!cancelled) {
          setError(nextError);
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [item.reviewId, service]);

  const attributes = "attributes" in review ? review.attributes : {};
  const attributeEntries = Object.entries(attributes).filter(([key, value]) =>
    value !== undefined && value !== null && !QUEUE_FIELD_KEYS.has(key));

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>
            {review.listingName} · {review.reviewId}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.moderation.columns.submissionType}</dt>
            <dd>{submissionTypeLabel(review.submissionType, messages)}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.moderation.columns.status}</dt>
            <dd>{statusLabel(review.reviewStatus, messages)}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.moderation.columns.assignee}</dt>
            <dd>{review.assignedTo ?? "—"}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.moderation.columns.submittedAt}</dt>
            <dd>{review.submittedAt ?? "—"}</dd>
          </dl>

          {loading ? (
            <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
              {copy.loading}
            </p>
          ) : null}

          {error ? (
            <StatusNotice tone="danger">{copy.error}</StatusNotice>
          ) : null}

          {!loading && !error ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.attributes}</h3>
              {attributeEntries.length === 0 ? (
                <p className="text-sm text-[var(--sdk-color-text-muted)]">{copy.emptyAttributes}</p>
              ) : (
                <dl className="space-y-1 rounded-[var(--sdk-radius-control)] border border-[var(--sdk-color-border-default)] p-3 text-xs">
                  {attributeEntries.map(([key, value]) => (
                    <div className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2" key={key}>
                      <dt className="truncate font-mono text-[var(--sdk-color-text-muted)]">{key}</dt>
                      <dd className="break-words text-[var(--sdk-color-text-secondary)]">{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            {copy.close}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Fields already rendered as structured rows; keep the raw block readable. */
const QUEUE_FIELD_KEYS = new Set([
  "reviewId",
  "review_id",
  "id",
  "listingId",
  "listing_id",
  "listingName",
  "listing_name",
  "displayName",
  "display_name",
  "submissionType",
  "submission_type",
  "reviewStatus",
  "review_status",
  "status",
  "assignedTo",
  "assigned_to",
  "assigneeId",
  "assignee_id",
  "submittedAt",
  "submitted_at",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "priority",
  "queuePriority",
  "queue_priority",
]);

function submissionTypeLabel(
  type: string,
  messages: ApplicationCatalogMessages,
): string {
  const known = messages.moderation.submissionTypes[
    type as keyof ApplicationCatalogMessages["moderation"]["submissionTypes"]
  ];
  return known ?? messages.moderation.submissionTypes.unknown;
}

function statusLabel(
  status: string,
  messages: ApplicationCatalogMessages,
): string {
  const known = messages.moderation.statuses[
    status as keyof ApplicationCatalogMessages["moderation"]["statuses"]
  ];
  return known ?? messages.moderation.statuses.unknown;
}
