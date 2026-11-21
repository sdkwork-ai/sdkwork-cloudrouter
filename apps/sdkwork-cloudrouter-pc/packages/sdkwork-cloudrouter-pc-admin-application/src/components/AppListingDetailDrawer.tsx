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
  StatusBadge,
} from "@sdkwork/ui-pc-react";

import { AppCenterLoadFailure } from "./AppCenterListShell";
import type { ApplicationCatalogMessages } from "../i18n";
import { listingStatusVariant, visibilityVariant } from "../services/appstore-listing-presentation";
import { formatDateTime } from "../services/format";
import type {
  AppStoreListing,
  AppStoreListingDetail,
  AppStoreListingService,
} from "../types/appstore-listings";

export interface AppListingDetailDrawerProps {
  listing: AppStoreListing;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  service: AppStoreListingService;
}

/**
 * Read-only listing inspector.
 *
 * The row that opened the drawer is rendered immediately and the fuller read
 * replaces it in place, so the inspector never shows an empty frame. A failed
 * read keeps the row data and offers a retry instead of blanking the panel.
 */
export function AppListingDetailDrawer({
  listing,
  messages,
  onClose,
  service,
}: AppListingDetailDrawerProps) {
  const copy = messages.listings.detail;
  const [detail, setDetail] = useState<AppStoreListingDetail | AppStoreListing>(listing);
  const [loading, setLoading] = useState(Boolean(service.getListing));
  const [error, setError] = useState<unknown>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!service.getListing) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const getListing = service.getListing.bind(service);
    setLoading(true);
    setError(undefined);
    void getListing(listing.listingId).then(
      (nextDetail) => {
        if (!cancelled) {
          if (nextDetail) {
            setDetail(nextDetail);
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
  }, [listing.listingId, reloadToken, service]);

  const attributes = "attributes" in detail ? detail.attributes : {};
  const attributeEntries = Object.entries(attributes).filter(([key, value]) =>
    value !== undefined && value !== null && !LISTING_FIELD_KEYS.has(key));

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
            {detail.displayName} · {detail.listingId}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody aria-busy={loading || undefined} className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.publisher}</dt>
            <dd>{detail.publisherName ?? detail.publisherId ?? "—"}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.status}</dt>
            <dd>
              <StatusBadge
                label={statusLabel(detail.listingStatus, messages)}
                showIcon
                status={detail.listingStatus}
                variant={listingStatusVariant(detail.listingStatus)}
              />
            </dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.visibility}</dt>
            <dd>
              <StatusBadge
                label={visibilityLabel(detail.storefrontVisibility, messages)}
                showIcon
                status={detail.storefrontVisibility ?? "unknown"}
                variant={visibilityVariant(detail.storefrontVisibility)}
              />
            </dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.category}</dt>
            <dd>{detail.categoryCode ?? "—"}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.platform}</dt>
            <dd>{detail.platform ?? "—"}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.version}</dt>
            <dd>{detail.latestReleaseVersion ?? "—"}</dd>
            <dt className="text-[var(--sdk-color-text-muted)]">{messages.listings.columns.updatedAt}</dt>
            <dd>{formatDateTime(detail.updatedAt)}</dd>
          </dl>

          {loading ? (
            <p className="text-sm text-[var(--sdk-color-text-muted)]" role="status">
              {copy.loading}
            </p>
          ) : null}

          {error ? (
            <AppCenterLoadFailure
              message={copy.error}
              onRetry={() => setReloadToken((token) => token + 1)}
              retryLabel={messages.retry}
            />
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

const LISTING_FIELD_KEYS = new Set([
  "listingId",
  "listing_id",
  "id",
  "listingCode",
  "listing_code",
  "code",
  "displayName",
  "display_name",
  "name",
  "title",
  "publisherId",
  "publisher_id",
  "publisherName",
  "publisher_name",
  "developerName",
  "developer_name",
  "listingStatus",
  "listing_status",
  "status",
  "storefrontVisibility",
  "storefront_visibility",
  "visibility",
  "categoryCode",
  "category_code",
  "category",
  "platform",
  "platformCode",
  "platform_code",
  "latestReleaseVersion",
  "latest_release_version",
  "version",
  "updatedAt",
  "updated_at",
]);

function statusLabel(status: string, messages: ApplicationCatalogMessages): string {
  const known = messages.listings.statuses[
    status as keyof ApplicationCatalogMessages["listings"]["statuses"]
  ];
  return known ?? status;
}

function visibilityLabel(visibility: string | undefined, messages: ApplicationCatalogMessages): string {
  const known = messages.listings.visibility[
    visibility as keyof ApplicationCatalogMessages["listings"]["visibility"]
  ];
  return known ?? messages.listings.visibility.unknown;
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
