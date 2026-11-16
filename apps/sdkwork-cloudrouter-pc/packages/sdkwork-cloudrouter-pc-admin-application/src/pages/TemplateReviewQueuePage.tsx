import { AppTemplatePanel } from "../components/AppTemplatePanel";
import { useApplicationCatalogMessages } from "../i18n";

/** Focused queue of templates awaiting review. */
export function TemplateReviewQueuePage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <AppTemplatePanel
        description={messages.templates.reviewQueue.description}
        initialStatus="PENDING_REVIEW"
        messages={messages}
        title={messages.templates.reviewQueue.title}
      />
    </div>
  );
}
