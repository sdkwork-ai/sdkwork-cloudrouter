import { CreditCard, QrCode, Wallet } from "lucide-react";
import { type SdkworkCheckoutPaymentMethod } from "../checkout";
import {
  createSdkworkCheckoutGlassStyle,
  createSdkworkCheckoutPanelStyle,
  createSdkworkCheckoutToneStyle,
} from "../checkout-appearance";
import { useSdkworkCheckoutIntl } from "../checkout-intl";

export interface SdkworkCheckoutPaymentMethodsProps {
  methods: SdkworkCheckoutPaymentMethod[];
  onSelectPaymentMethod: (paymentMethodId: string) => void;
  selectedPaymentMethodId: string | null;
}

function resolveMethodIcon(kind: SdkworkCheckoutPaymentMethod["kind"]) {
  if (kind === "card") {
    return CreditCard;
  }

  if (kind === "wallet") {
    return Wallet;
  }

  return QrCode;
}

export function SdkworkCheckoutPaymentMethods({
  methods,
  onSelectPaymentMethod,
  selectedPaymentMethodId,
}: SdkworkCheckoutPaymentMethodsProps) {
  const { copy } = useSdkworkCheckoutIntl();

  return (
    <section className="rounded-[1.65rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-md)]">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
        {copy.paymentMethods.eyebrow}
      </div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.paymentMethods.title}</h2>
      <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
        {copy.paymentMethods.description}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {methods.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-5 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.paymentMethods.empty}
          </div>
        ) : methods.map((method) => {
          const Icon = resolveMethodIcon(method.kind);
          const isSelected = selectedPaymentMethodId === method.id;

          return (
            <button
              className="rounded-[1.35rem] border px-4 py-4 text-left transition-colors"
              disabled={!method.available}
              key={method.id}
              onClick={() => onSelectPaymentMethod(method.id)}
              style={isSelected
                ? createSdkworkCheckoutPanelStyle("brand", {
                  backgroundWeight: 12,
                  borderWeight: 30,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                })
                : createSdkworkCheckoutPanelStyle("neutral", {
                  backgroundWeight: 8,
                  borderWeight: 24,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                })}
              type="button"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[1rem] border shadow-[var(--sdk-shadow-soft)]"
                  style={isSelected
                    ? createSdkworkCheckoutToneStyle("brand", {
                      backgroundWeight: 16,
                      borderWeight: 28,
                    })
                    : createSdkworkCheckoutGlassStyle("neutral", {
                      backgroundWeight: 8,
                      borderWeight: 20,
                      surfaceColor: "var(--sdk-color-surface-panel)",
                      surfaceWeight: 90,
                    })}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                      {method.label}
                    </div>
                    {method.recommended ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                        {copy.paymentMethods.recommendedBadge}
                      </span>
                    ) : null}
                  </div>
                  {method.description ? (
                    <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                      {method.description}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                    {isSelected ? copy.paymentMethods.selectedHint : copy.paymentMethods.unselectedHint}
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
