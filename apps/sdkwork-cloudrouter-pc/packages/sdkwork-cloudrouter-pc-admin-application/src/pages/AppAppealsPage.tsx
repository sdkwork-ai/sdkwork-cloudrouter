import { AppAppealsPanel } from "../components/AppAppealsPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center moderation appeals route. */
export function AppAppealsPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppAppealsPanel messages={messages} />
    </div>
  );
}
