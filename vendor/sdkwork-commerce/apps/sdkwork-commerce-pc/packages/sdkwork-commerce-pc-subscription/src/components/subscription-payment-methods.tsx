import {
  CreditCard,
  QrCode,
  Wallet,
} from "lucide-react";
import type { SdkworkSubscriptionPaymentMethodOption } from "../subscription";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionPaymentMethodsProps {
  methods: SdkworkSubscriptionPaymentMethodOption[];
  onSelectPaymentMethod: (paymentMethodId: string) => void;
  selectedPaymentMethodId: string | null;
}

function resolveMethodIcon(kind: SdkworkSubscriptionPaymentMethodOption["kind"]) {
  if (kind === "card") {
    return CreditCard;
  }

  if (kind === "wallet") {
    return Wallet;
  }

  return QrCode;
}

export function SdkworkSubscriptionPaymentMethods({
  methods,
  onSelectPaymentMethod,
  selectedPaymentMethodId,
}: SdkworkSubscriptionPaymentMethodsProps) {
  const {
    copy,
    formatPaymentMethodDescription,
    formatPaymentMethodLabel,
    formatPaymentMethodSelection,
    formatPaymentProductTypeLabel,
  } = useSdkworkSubscriptionIntl();

  return (
    <section>
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
        {copy.paymentMethods.eyebrow}
      </div>
      <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
        {copy.paymentMethods.description}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {methods.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-5 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.paymentMethods.noMethods}
          </div>
        ) : methods.map((method) => {
          const Icon = resolveMethodIcon(method.kind);
          const isSelected = selectedPaymentMethodId === method.id;
          const description = formatPaymentMethodDescription(method) ?? method.description;
          const label = formatPaymentMethodLabel(method);
          const productTypeLabel = formatPaymentProductTypeLabel(method);

          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-[1.5rem] border px-4 py-4 text-left shadow-[var(--sdk-shadow-soft)] transition-colors ${
                isSelected
                  ? ""
                  : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] hover:bg-[var(--sdk-color-surface-hover)]"
              } ${method.available ? "" : "opacity-60"}`}
              disabled={!method.available}
              key={method.id}
              onClick={() => onSelectPaymentMethod(method.id)}
              style={isSelected
                ? createSdkworkSubscriptionPanelStyle("brand", {
                  backgroundWeight: 10,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                  surfaceWeight: 98,
                })
                : undefined}
              type="button"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[1rem] border bg-[color-mix(in_srgb,var(--sdk-color-surface-panel)_88%,transparent)] shadow-[var(--sdk-shadow-soft)]"
                  style={createSdkworkSubscriptionToneStyle(
                    isSelected ? "brand" : "accent",
                    {
                      backgroundWeight: isSelected ? 14 : 10,
                      borderWeight: isSelected ? 26 : 18,
                    },
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                      {label}
                    </div>
                    {method.recommended ? (
                      <span
                        className="rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
                        style={createSdkworkSubscriptionToneStyle("success", {
                          backgroundWeight: 12,
                          borderWeight: 22,
                        })}
                      >
                        {copy.paymentMethods.recommended}
                      </span>
                    ) : null}
                  </div>
                  {description ? (
                    <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                      {description}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] shadow-[var(--sdk-shadow-soft)]"
                      style={createSdkworkSubscriptionToneStyle("neutral", {
                        backgroundWeight: 10,
                        borderWeight: 18,
                      })}
                    >
                      {productTypeLabel}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                      {formatPaymentMethodSelection(isSelected)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
