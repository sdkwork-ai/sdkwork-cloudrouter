import { useState } from "react";
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

import { AppCenterDecisionGroup } from "./AppCenterDecisionGroup";
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

export interface AppPublisherVerifyDrawerProps {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onVerified: () => void;
  publisher: AppStorePublisher;
  service: AppStorePublisherService;
}

/**
 * Record one publisher verification decision.
 *
 * The drawer states which publisher it acts on in the header, keeps the
 * verification type and the decision independent (they are two facets of one
 * decision), and refuses to close while the write is in flight so a slow
 * request cannot hide its own result.
 */
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

          <AppCenterDecisionGroup
            label={copy.decision}
            onChange={setDecision}
            options={[
              { label: copy.approve, tone: "positive", value: "APPROVE" },
              { label: copy.reject, tone: "negative", value: "REJECT" },
              { label: copy.requestMoreInfo, tone: "neutral", value: "REQUEST_MORE_INFO" },
            ]}
            value={decision}
          />

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
