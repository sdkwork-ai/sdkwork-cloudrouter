import { AppCollectionsPanel } from "../components/AppCollectionsPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center editorial collections route. */
export function AppCollectionsPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppCollectionsPanel messages={messages} />
    </div>
  );
}
