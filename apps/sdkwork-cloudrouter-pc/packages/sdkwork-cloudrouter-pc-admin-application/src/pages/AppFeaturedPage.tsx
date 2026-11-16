import { AppFeaturedSlotsPanel } from "../components/AppFeaturedSlotsPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center featured-slot administration route. */
export function AppFeaturedPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppFeaturedSlotsPanel messages={messages} />
    </div>
  );
}
