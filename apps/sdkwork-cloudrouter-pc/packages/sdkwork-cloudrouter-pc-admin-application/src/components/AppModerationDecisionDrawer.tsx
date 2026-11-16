import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { loadStoredAppSessionToken } from "@sdkwork/cloudroutes-pc-commons/runtime";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldLabel,
  Input,
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  isAppStoreModerationForbidden,
} from "../services/appstore-moderation";
import type {
  AppStoreModerationDecision,
  AppStoreModerationQueueItem,
  AppStoreModerationService,
} from "../types/appstore-moderation";

export interface AppModerationDecisionDrawerProps {
  item: AppStoreModerationQueueItem;
  messages: ApplicationCatalogMessages;
  onAssigned?: () => void;
  onClose: () => void;
  onDecided: () => void;
  service: AppStoreModerationService;
}

const DECISIONS: readonly AppStoreModerationDecision[] = ["APPROVE", "REJECT", "REQUEST_CHANGES"];

/** Record one moderation decision; non-approval decisions require a reason. */
export function AppModerationDecisionDrawer({
  item,
  messages,
  onAssigned,
  onClose,
  onDecided,
  service,
}: AppModerationDecisionDrawerProps) {
  const copy = messages.moderation.decision;
  const [decisionType, setDecisionType] = useState<AppStoreModerationDecision>("APPROVE");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState<unknown>();
  const [errorSource, setErrorSource] = useState<"decide" | "assign">("decide");
  const [validationError, setValidationError] = useState<string>();
  const operatorUserId = loadStoredAppSessionToken()?.context?.userId ?? "";
  const canAssign = Boolean(service.assign && operatorUserId && item.assignedTo !== operatorUserId);

  const reasonRequired = decisionType !== "APPROVE" && !reasonDetail.trim();

  const submit = async () => {
    if (reasonRequired) {
      setValidationError(copy.reasonRequired);
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    setErrorSource("decide");
    try {
      await service.decide(item.reviewId, {
        decisionType,
        ...(reasonCode.trim() ? { reasonCode: reasonCode.trim() } : {}),
        ...(reasonDetail.trim() ? { reasonDetail: reasonDetail.trim() } : {}),
      });
      onDecided();
      onClose();
    } catch (nextError) {
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  const assignToMe = async () => {
    if (!service.assign || !operatorUserId) {
      return;
    }
    setAssigning(true);
    setError(undefined);
    setErrorSource("assign");
    try {
      await service.assign(item.reviewId, operatorUserId);
      setAssigned(true);
      onAssigned?.();
    } catch (nextError) {
      setError(nextError);
    } finally {
      setAssigning(false);
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
            {item.listingName ? `${item.listingName} · ${copy.description}` : copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.type}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DECISIONS.map((decision) => {
                const active = decision === decisionType;
                return (
                  <button
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-[var(--sdk-radius-control)] border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                        : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]"
                    }`}
                    key={decision}
                    onClick={() => {
                      setDecisionType(decision);
                      setValidationError(undefined);
                    }}
                    type="button"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {decisionLabel(decision, copy)}
                  </button>
                );
              })}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="moderation-reason-code">{copy.reasonCode}</FieldLabel>
            <Input
              id="moderation-reason-code"
              onChange={(event) => setReasonCode(event.target.value)}
              placeholder={copy.reasonCodePlaceholder}
              value={reasonCode}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="moderation-reason-detail">{copy.reasonDetail}</FieldLabel>
            <Textarea
              id="moderation-reason-detail"
              onChange={(event) => {
                setReasonDetail(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              placeholder={copy.reasonDetailPlaceholder}
              rows={4}
              value={reasonDetail}
            />
          </Field>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreModerationForbidden(error)
                ? copy.forbidden
                : errorSource === "assign"
                  ? copy.assignError
                  : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting || assigning} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          {canAssign ? (
            <Button
              disabled={submitting || assigning || assigned}
              onClick={() => void assignToMe()}
              type="button"
              variant="outline"
            >
              {assigned ? copy.assigned : assigning ? copy.submitting : copy.assignToMe}
            </Button>
          ) : null}
          <Button disabled={submitting || assigning} onClick={() => void submit()} type="button">
            {submitting ? copy.submitting : copy.submit}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function decisionLabel(
  decision: AppStoreModerationDecision,
  copy: ApplicationCatalogMessages["moderation"]["decision"],
): string {
  if (decision === "REJECT") {
    return copy.reject;
  }
  return decision === "REQUEST_CHANGES" ? copy.requestChanges : copy.approve;
}
