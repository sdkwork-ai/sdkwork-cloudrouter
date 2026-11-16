import { AppListingsPanel } from "../components/AppListingsPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center listing visibility route. */
export function AppListingsPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppListingsPanel messages={messages} />
    </div>
  );
}
