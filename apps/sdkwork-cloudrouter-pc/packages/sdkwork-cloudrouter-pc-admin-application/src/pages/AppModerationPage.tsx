import { AppModerationPanel } from "../components/AppModerationPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center moderation queue route. */
export function AppModerationPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppModerationPanel messages={messages} />
    </div>
  );
}
