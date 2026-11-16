import { useState } from "react";
import { Button, Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, Field, FieldLabel, StatusNotice, Textarea } from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { isAppStoreModerationForbidden } from "../services/appstore-moderation";
import type {
  AppStoreModerationAppeal,
  AppStoreModerationService,
} from "../types/appstore-moderation";

export interface AppAppealDecisionDrawerProps {
  appeal: AppStoreModerationAppeal;
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onDecided: () => void;
  service: AppStoreModerationService;
}

/** Decide one moderation appeal. */
export function AppAppealDecisionDrawer({
  appeal,
  messages,
  onClose,
  onDecided,
  service,
}: AppAppealDecisionDrawerProps) {
  const copy = messages.appeals.dialog;
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const submit = async () => {
    if (!note.trim()) {
      setValidationError(copy.noteRequired);
      return;
    }
    if (!service.decideAppeal) {
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    try {
      await service.decideAppeal(appeal.appealId, { decision, note: note.trim() });
      onDecided();
      onClose();
    } catch (nextError) {
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      onOpenChange={(open) => {
        if (!open && !submitting) {
          onClose();
        }
      }}
      open
    >
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle>{copy.title}</DrawerTitle>
          <DrawerDescription>
            {appeal.listingName ?? appeal.listingId ?? appeal.reviewId ?? appeal.appealId} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.decision}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["APPROVE", "REJECT"] as const).map((candidate) => {
                const active = candidate === decision;
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-[var(--sdk-radius-control)] border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                        : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]"
                    }`}
                    key={candidate}
                    onClick={() => setDecision(candidate)}
                    type="button"
                  >
                    {candidate === "APPROVE" ? copy.approve : copy.reject}
                  </button>
                );
              })}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="appeal-decision-note">{copy.note}</FieldLabel>
            <Textarea
              id="appeal-decision-note"
              onChange={(event) => {
                setNote(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              placeholder={copy.notePlaceholder}
              rows={4}
              value={note}
            />
          </Field>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreModerationForbidden(error) ? copy.forbidden : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void submit()} type="button">
            {submitting ? copy.submitting : copy.submit}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
