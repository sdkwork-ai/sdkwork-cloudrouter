import { AppPublishersPanel } from "../components/AppPublishersPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center publisher administration route. */
export function AppPublishersPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppPublishersPanel messages={messages} />
    </div>
  );
}
