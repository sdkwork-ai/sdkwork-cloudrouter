import { ApplicationScaffoldCategoryPanel } from "../components/ApplicationScaffoldCategoryPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** App Center scaffold taxonomy route. */
export function ApplicationScaffoldCategoryPage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ApplicationScaffoldCategoryPanel messages={messages} />
    </div>
  );
}
