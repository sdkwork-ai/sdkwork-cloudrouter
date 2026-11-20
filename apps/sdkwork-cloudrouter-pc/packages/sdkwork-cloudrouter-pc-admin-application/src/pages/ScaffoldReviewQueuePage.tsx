import { ApplicationScaffoldPanel } from "../components/ApplicationScaffoldPanel";
import { useApplicationCatalogMessages } from "../i18n";

/** Focused queue of scaffolds awaiting review. */
export function ScaffoldReviewQueuePage() {
  const messages = useApplicationCatalogMessages();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <ApplicationScaffoldPanel
        description={messages.scaffolds.reviewQueue.description}
        initialStatus="PENDING_REVIEW"
        messages={messages}
        title={messages.scaffolds.reviewQueue.title}
      />
    </div>
  );
}
