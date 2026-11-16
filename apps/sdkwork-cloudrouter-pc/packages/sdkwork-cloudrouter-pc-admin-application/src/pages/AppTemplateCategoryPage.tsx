import { AppTemplateCategoryPanel } from "../components/AppTemplateCategoryPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center template taxonomy route. */
export function AppTemplateCategoryPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppTemplateCategoryPanel messages={messages} />
    </div>
  );
}
