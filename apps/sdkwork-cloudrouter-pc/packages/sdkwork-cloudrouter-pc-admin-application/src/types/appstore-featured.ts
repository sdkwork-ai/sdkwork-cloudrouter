/**
 * App Store featured-slot administration models.
 *
 * A featured slot pins one listing to a storefront placement for a window of
 * time. Operators list every slot (regardless of window) and upsert one slot at
 * a time through the App Store catalog contract.
 */

export type AppStoreFeaturedSlotStatus = "SCHEDULED" | "ACTIVE" | "ENDED";

export interface AppStoreFeaturedSlot {
  slotCode: string;
  listingId: string;
  status?: string;
  audienceScope?: string;
  platformScope?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface AppStoreFeaturedSlotPage {
  items: readonly AppStoreFeaturedSlot[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface AppStoreFeaturedSlotInput {
  listingId: string;
  startsAt: string;
  endsAt: string;
  slotStatus?: AppStoreFeaturedSlotStatus;
}

export interface AppStoreFeaturedSlotService {
  list(): Promise<AppStoreFeaturedSlotPage>;
  update(slotCode: string, input: AppStoreFeaturedSlotInput): Promise<void>;
}
