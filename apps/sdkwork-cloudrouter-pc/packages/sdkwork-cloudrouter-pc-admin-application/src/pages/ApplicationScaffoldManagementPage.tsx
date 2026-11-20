import { ApplicationScaffoldPanel } from "../components/ApplicationScaffoldPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center scaffold library route. */
export function ApplicationScaffoldManagementPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ApplicationScaffoldPanel messages={messages} />
    </div>
  );
}
