import { useState } from "react";
import { Button, Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, Field, FieldError, FieldLabel, StatusNotice, Textarea } from "@sdkwork/ui-pc-react";

import { AppCenterDecisionGroup } from "./AppCenterDecisionGroup";
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
          <AppCenterDecisionGroup
            columns={2}
            label={copy.decision}
            onChange={setDecision}
            options={[
              { label: copy.approve, tone: "positive", value: "APPROVE" },
              { label: copy.reject, tone: "negative", value: "REJECT" },
            ]}
            value={decision}
          />

          <Field invalid={Boolean(validationError)} required>
            <FieldLabel htmlFor="appeal-decision-note">{copy.note}</FieldLabel>
            <Textarea
              aria-describedby={validationError ? "appeal-decision-note-error" : undefined}
              aria-invalid={Boolean(validationError)}
              autoFocus
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
            {validationError ? (
              <FieldError id="appeal-decision-note-error">{validationError}</FieldError>
            ) : null}
          </Field>

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
