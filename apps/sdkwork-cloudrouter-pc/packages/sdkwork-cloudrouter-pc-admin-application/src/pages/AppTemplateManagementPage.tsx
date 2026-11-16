import { AppTemplatePanel } from "../components/AppTemplatePanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center template library route. */
export function AppTemplateManagementPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppTemplatePanel messages={messages} />
    </div>
  );
}
