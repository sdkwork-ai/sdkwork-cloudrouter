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
  Textarea,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  isDeployTemplateAdminForbidden,
  isDeployTemplateAdminUnavailable,
  type DeployTemplateAdminService,
  type DeployTemplateAdminStatus,
} from "../services/deploy-template-admin";
import type { DeployAppTemplate } from "../types/deploy-app-templates";

const REVIEW_STATUSES: readonly DeployTemplateAdminStatus[] = [
  "PUBLISHED",
  "REJECTED",
  "PENDING_REVIEW",
  "DISABLED",
];

export interface TemplateReviewDrawerProps {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onReviewed: () => void;
  service: DeployTemplateAdminService;
  template: DeployAppTemplate;
}

/** Backend-admin moderation of one Deploy app template. */
export function TemplateReviewDrawer({
  messages,
  onClose,
  onReviewed,
  service,
  template,
}: TemplateReviewDrawerProps) {
  const copy = messages.templates.review;
  const [status, setStatus] = useState<DeployTemplateAdminStatus>(normalizeStatus(template.status));
  const [note, setNote] = useState("");
  const [featured, setFeatured] = useState(template.isFeatured);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const submit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await service.updateTemplate(template.id, {
        status,
        ...(note.trim() ? { reviewNote: note.trim() } : {}),
        isFeatured: featured,
      });
      onReviewed();
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
            {template.displayName} · {copy.description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          {template.reviewNote ? (
            <StatusNotice tone="default">
              {copy.note}: {template.reviewNote}
            </StatusNotice>
          ) : null}
          <Field>
            <FieldLabel htmlFor="template-review-status">{copy.status}</FieldLabel>
            <Select onValueChange={(value) => setStatus(value as DeployTemplateAdminStatus)} value={status}>
              <SelectTrigger id="template-review-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_STATUSES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {messages.templates.statuses[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="template-review-note">{copy.note}</FieldLabel>
            <Textarea
              id="template-review-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder={copy.notePlaceholder}
              rows={4}
              value={note}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--sdk-color-text-secondary)]">
            <input
              checked={featured}
              className="h-4 w-4 rounded border-[var(--sdk-color-border-default)]"
              onChange={(event) => setFeatured(event.target.checked)}
              type="checkbox"
            />
            {copy.featured}
          </label>

          {error ? (
            <StatusNotice tone="danger">
              {isDeployTemplateAdminForbidden(error)
                ? copy.forbidden
                : isDeployTemplateAdminUnavailable(error)
                  ? copy.unavailable
                  : copy.error}
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

function normalizeStatus(status: DeployAppTemplate["status"]): DeployTemplateAdminStatus {
  return status === "PUBLISHED" || status === "REJECTED" || status === "DISABLED"
    ? status
    : "PENDING_REVIEW";
}
