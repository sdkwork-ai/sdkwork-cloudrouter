import { useState } from "react";
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
  FieldError,
  FieldLabel,
  Input,
  StatusNotice,
  Textarea,
} from "@sdkwork/ui-pc-react";

import { AppCenterDecisionGroup } from "./AppCenterDecisionGroup";
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

/**
 * Record one moderation decision.
 *
 * The decision type and the reason are one form: a non-approval outcome without
 * a reason is rejected before the write, and the reason fields are marked
 * invalid so the operator can see which control the message refers to. Taking
 * the item is a separate command because it changes the queue, not the listing.
 */
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
          <AppCenterDecisionGroup
            label={copy.type}
            onChange={(next) => {
              setDecisionType(next);
              setValidationError(undefined);
            }}
            options={[
              { label: copy.approve, tone: "positive", value: "APPROVE" },
              { label: copy.reject, tone: "negative", value: "REJECT" },
              { label: copy.requestChanges, tone: "neutral", value: "REQUEST_CHANGES" },
            ]}
            value={decisionType}
          />

          <Field>
            <FieldLabel htmlFor="moderation-reason-code">{copy.reasonCode}</FieldLabel>
            <Input
              id="moderation-reason-code"
              onChange={(event) => setReasonCode(event.target.value)}
              placeholder={copy.reasonCodePlaceholder}
              value={reasonCode}
            />
          </Field>

          <Field invalid={Boolean(reasonRequired && validationError)} required={reasonRequired}>
            <FieldLabel htmlFor="moderation-reason-detail">{copy.reasonDetail}</FieldLabel>
            <Textarea
              aria-describedby={reasonRequired && validationError ? "moderation-reason-error" : undefined}
              aria-invalid={Boolean(reasonRequired && validationError)}
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
            {validationError ? (
              <FieldError id="moderation-reason-error">{validationError}</FieldError>
            ) : null}
          </Field>

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
