import type { StatusBadgeVariant } from "@sdkwork/ui-pc-react";

/**
 * Presentation mapping for App Store listing state.
 *
 * The list table, the inspector drawer, and the detail summary all render the
 * same two facets (publication state and storefront visibility), so the badge
 * tone of each value is decided once here rather than per surface.
 */

/** Badge tone for `listing_status`. */
export function listingStatusVariant(status: string | undefined): StatusBadgeVariant {
  const normalized = status?.toUpperCase();
  if (normalized === "PUBLISHED" || normalized === "ACTIVE") {
    return "success";
  }
  if (normalized === "SUSPENDED") {
    return "danger";
  }
  return normalized === "DRAFT" ? "warning" : "secondary";
}

/** Badge tone for `storefront_visibility`. */
export function visibilityVariant(visibility: string | undefined): StatusBadgeVariant {
  if (visibility === "VISIBLE") {
    return "success";
  }
  if (visibility === "DELISTED") {
    return "danger";
  }
  return visibility === "HIDDEN" || visibility === "REGION_RESTRICTED" ? "warning" : "default";
}
