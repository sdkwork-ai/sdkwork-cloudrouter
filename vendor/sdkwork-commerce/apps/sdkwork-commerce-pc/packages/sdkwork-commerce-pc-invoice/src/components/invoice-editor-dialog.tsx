import {
  useEffect,
  useState,
} from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type { SdkworkInvoiceController } from "../invoice-controller";
import { useSdkworkInvoiceControllerState } from "../invoice-controller";
import { useSdkworkInvoiceIntl } from "../invoice-intl";
import type {
  SdkworkInvoiceTitleType,
  SdkworkInvoiceType,
} from "../invoice";

export interface SdkworkInvoiceEditorDialogProps {
  controller: SdkworkInvoiceController;
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function toOptionalNumber(value: string): number | null | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SdkworkInvoiceEditorDialog({
  controller,
}: SdkworkInvoiceEditorDialogProps) {
  const state = useSdkworkInvoiceControllerState(controller);
  const {
    copy,
    formatInvoiceType,
    formatTitleType,
  } = useSdkworkInvoiceIntl();
  const selectedInvoice = state.dashboard.invoices.find((invoice) => invoice.id === state.selectedInvoiceId);
  const editableDetail = state.detail && state.detail.id === state.selectedInvoiceId ? state.detail : undefined;
  const editableInvoice = editableDetail ?? selectedInvoice;
  const mode = state.editorMode ?? "create";
  const [title, setTitle] = useState("");
  const [titleType, setTitleType] = useState<SdkworkInvoiceTitleType>("company");
  const [invoiceType, setInvoiceType] = useState<SdkworkInvoiceType>("special");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [registerAddress, setRegisterAddress] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  useEffect(() => {
    if (!state.isEditorOpen) {
      return;
    }

    setTitle(editableInvoice?.title ?? "");
    setTitleType(editableInvoice?.titleType ?? "company");
    setInvoiceType(editableInvoice?.type ?? "special");
    setTotalAmount(
      editableInvoice?.totalAmountCny !== null && editableInvoice?.totalAmountCny !== undefined
        ? String(editableInvoice.totalAmountCny)
        : "",
    );
    setTaxNo(editableDetail?.taxNo ?? "");
    setBankName(editableDetail?.bankName ?? "");
    setBankAccount(editableDetail?.bankAccount ?? "");
    setRegisterAddress(editableDetail?.registerAddress ?? "");
    setRegisterPhone(editableDetail?.registerPhone ?? "");
  }, [editableDetail, editableInvoice, state.isEditorOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (mode === "create") {
      await controller.createInvoice({
        taxNo: toOptionalString(taxNo),
        title: title.trim(),
        titleType,
        totalAmountCny: toOptionalNumber(totalAmount),
        type: invoiceType,
      });
      return;
    }

    if (!state.selectedInvoiceId) {
      return;
    }

    await controller.updateInvoice({
      bankAccount: toOptionalString(bankAccount),
      bankName: toOptionalString(bankName),
      invoiceId: state.selectedInvoiceId,
      registerAddress: toOptionalString(registerAddress),
      registerPhone: toOptionalString(registerPhone),
      taxNo: toOptionalString(taxNo),
      title: toOptionalString(title),
    });
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          controller.closeEditor();
        }
      }}
      open={state.isEditorOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? copy.editor.createTitle : copy.editor.editTitle}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? copy.editor.createDescription
              : copy.editor.editDescription}
          </DialogDescription>
        </DialogHeader>

        {state.lastError ? (
          <StatusNotice title={copy.editor.errorTitle} tone="danger">
            {state.lastError}
          </StatusNotice>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
              <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.invoiceTitle}</span>
              <Input onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>

            <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
              <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.taxNumber}</span>
              <Input onChange={(event) => setTaxNo(event.target.value)} value={taxNo} />
            </label>

            {mode === "create" ? (
              <>
                <div className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.titleType}</span>
                  <Select onValueChange={(value) => setTitleType(value as SdkworkInvoiceTitleType)} value={titleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">{formatTitleType("company")}</SelectItem>
                      <SelectItem value="personal">{formatTitleType("personal")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.invoiceType}</span>
                  <Select onValueChange={(value) => setInvoiceType(value as SdkworkInvoiceType)} value={invoiceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="special">{formatInvoiceType("special")}</SelectItem>
                      <SelectItem value="normal">{formatInvoiceType("normal")}</SelectItem>
                      <SelectItem value="electronic">{formatInvoiceType("electronic")}</SelectItem>
                      <SelectItem value="paper">{formatInvoiceType("paper")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)] md:col-span-2">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.totalAmount}</span>
                  <Input min="0" onChange={(event) => setTotalAmount(event.target.value)} step="0.01" type="number" value={totalAmount} />
                </label>
              </>
            ) : (
              <>
                <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.bankName}</span>
                  <Input onChange={(event) => setBankName(event.target.value)} value={bankName} />
                </label>

                <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.bankAccount}</span>
                  <Input onChange={(event) => setBankAccount(event.target.value)} value={bankAccount} />
                </label>

                <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.registerAddress}</span>
                  <Input onChange={(event) => setRegisterAddress(event.target.value)} value={registerAddress} />
                </label>

                <label className="space-y-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <span className="font-medium text-[var(--sdk-color-text-primary)]">{copy.editor.fields.registerPhone}</span>
                  <Input onChange={(event) => setRegisterPhone(event.target.value)} value={registerPhone} />
                </label>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => controller.closeEditor()} type="button" variant="ghost">
              {copy.actions.close}
            </Button>
            <Button disabled={state.isMutating || !title.trim()} type="submit">
              {mode === "create" ? copy.actions.createDraft : copy.actions.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
