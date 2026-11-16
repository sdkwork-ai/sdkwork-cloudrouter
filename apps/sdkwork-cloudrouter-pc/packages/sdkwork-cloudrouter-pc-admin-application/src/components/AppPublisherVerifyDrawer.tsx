import { useState } from "react";
import { Building2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { isAppStorePublisherForbidden } from "../services/appstore-publishers";
import type {
  AppStorePublisher,
  AppStorePublisherService,
  AppStorePublisherVerificationDecision,
  AppStorePublisherVerificationType,
} from "../types/appstore-publishers";

const VERIFICATION_TYPES: readonly AppStorePublisherVerificationType[] = [
  "IDENTITY",
  "BUSINESS",
  "TAX",
  "PAYOUT",
];

const DECISIONS: readonly AppStorePublisherVerificationDecision[] = [
  "APPROVE",
  "REJECT",
  "REQUEST_MORE_INFO",
];

export interface AppPublisherVerifyDrawerProps {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onVerified: () => void;
  publisher: AppStorePublisher;
  service: AppStorePublisherService;
}

/** Record one publisher verification decision. */
export function AppPublisherVerifyDrawer({
  messages,
  onClose,
  onVerified,
  publisher,
  service,
}: AppPublisherVerifyDrawerProps) {
  const copy = messages.publishers.dialog;
  const [verificationType, setVerificationType] = useState<AppStorePublisherVerificationType>("IDENTITY");
  const [decision, setDecision] = useState<AppStorePublisherVerificationDecision>("APPROVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await service.verify(publisher.publisherId, { verificationType, decision });
      onVerified();
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
            {publisher.displayName} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="publisher-verification-type">{copy.verificationType}</FieldLabel>
            <Select
              onValueChange={(value) => setVerificationType(value as AppStorePublisherVerificationType)}
              value={verificationType}
            >
              <SelectTrigger id="publisher-verification-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERIFICATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {copy.verificationTypes[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.decision}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DECISIONS.map((candidate) => {
                const active = candidate === decision;
                return (
                  <button
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-[var(--sdk-radius-control)] border px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]"
                        : "border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]"
                    }`}
                    key={candidate}
                    onClick={() => setDecision(candidate)}
                    type="button"
                  >
                    <Building2 className="h-4 w-4" />
                    {decisionLabel(candidate, copy)}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <StatusNotice tone="danger">
              {isAppStorePublisherForbidden(error) ? copy.forbidden : copy.error}
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

function decisionLabel(
  decision: AppStorePublisherVerificationDecision,
  copy: ApplicationCatalogMessages["publishers"]["dialog"],
): string {
  if (decision === "REJECT") {
    return copy.reject;
  }
  return decision === "REQUEST_MORE_INFO" ? copy.requestMoreInfo : copy.approve;
}
