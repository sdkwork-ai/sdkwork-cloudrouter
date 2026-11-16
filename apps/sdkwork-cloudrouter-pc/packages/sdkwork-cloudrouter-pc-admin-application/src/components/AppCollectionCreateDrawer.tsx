import { useState } from "react";
import { Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusNotice,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import {
  COLLECTION_CODE_PATTERN,
  isAppStoreCollectionForbidden,
} from "../services/appstore-collections";
import type { AppStoreCollectionService } from "../types/appstore-collections";

const COLLECTION_TYPES = ["EDITORIAL", "CHART", "CATEGORY", "SEASONAL", "PERSONALIZED"] as const;
const AUDIENCE_SCOPES = ["PUBLIC", "TENANT", "INTERNAL"] as const;

export interface AppCollectionCreateDrawerProps {
  messages: ApplicationCatalogMessages;
  onClose: () => void;
  onCreated: () => void;
  service: AppStoreCollectionService;
}

/** Create an editorial collection. */
export function AppCollectionCreateDrawer({
  messages,
  onClose,
  onCreated,
  service,
}: AppCollectionCreateDrawerProps) {
  const copy = messages.collections.create;
  const [code, setCode] = useState("");
  const [type, setType] = useState<(typeof COLLECTION_TYPES)[number]>("EDITORIAL");
  const [audience, setAudience] = useState<(typeof AUDIENCE_SCOPES)[number]>("PUBLIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState<string>();

  const submit = async () => {
    if (!COLLECTION_CODE_PATTERN.test(code.trim())) {
      setValidationError(copy.invalidCode);
      return;
    }
    setValidationError(undefined);
    setSubmitting(true);
    setError(undefined);
    try {
      await service.create({ collectionCode: code.trim(), collectionType: type, audienceScope: audience });
      onCreated();
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
          <DrawerDescription>{copy.description}</DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="collection-code">{copy.code}</FieldLabel>
            <Input
              id="collection-code"
              onChange={(event) => {
                setCode(event.target.value);
                if (validationError) {
                  setValidationError(undefined);
                }
              }}
              placeholder={copy.codePlaceholder}
              value={code}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-type">{copy.type}</FieldLabel>
            <Select onValueChange={(value) => setType(value as (typeof COLLECTION_TYPES)[number])} value={type}>
              <SelectTrigger id="collection-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_TYPES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {messages.collections.types[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-audience">{copy.audience}</FieldLabel>
            <Select
              onValueChange={(value) => setAudience(value as (typeof AUDIENCE_SCOPES)[number])}
              value={audience}
            >
              <SelectTrigger id="collection-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_SCOPES.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {messages.collections.audiences[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {validationError ? <StatusNotice tone="danger">{validationError}</StatusNotice> : null}
          {error ? (
            <StatusNotice tone="danger">
              {isAppStoreCollectionForbidden(error) ? messages.collections.forbidden : copy.error}
            </StatusNotice>
          ) : null}
        </DrawerBody>
        <DrawerFooter>
          <Button disabled={submitting} onClick={onClose} type="button" variant="secondary">
            {copy.cancel}
          </Button>
          <Button disabled={submitting} onClick={() => void submit()} type="button">
            <Plus className="h-3.5 w-3.5" />
            {submitting ? copy.submitting : copy.submit}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
