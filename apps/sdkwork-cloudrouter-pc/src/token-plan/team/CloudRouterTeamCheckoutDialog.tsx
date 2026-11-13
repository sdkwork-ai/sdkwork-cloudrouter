import { useTranslation } from 'react-i18next';
import {
  SDKWORK_SUBSCRIPTION_I18N_KEYS,
} from '@sdkwork/membership-pc-subscription/catalog';
import {
  SdkworkOrderCheckoutDialog,
  type SdkworkOrderCheckoutSummary,
} from '@sdkwork/order-pc-checkout';

import {
  getTeamCheckoutStatus,
  type TeamCheckoutPayment,
} from './teamSubscriptionService.ts';

export interface CloudRouterTeamCheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once the provider reports the team subscription payment completed. */
  onCompleted: () => void;
  /**
   * Payment already created by the card CTA. The dialog reuses it instead of
   * creating a second membership order for the same seat count.
   */
  payment: TeamCheckoutPayment | null;
  summary: SdkworkOrderCheckoutSummary | null;
}

/**
 * Team subscription checkout.
 *
 * The dialog itself is the order-owned `SdkworkOrderCheckoutDialog`; this
 * component only supplies team copy and the team checkout driver, so QR
 * presentation, expiry countdown, and polling behavior stay identical to the
 * personal token plan (`CloudRouterTokenPlanCheckoutModal`).
 */
export function CloudRouterTeamCheckoutDialog({
  isOpen,
  onClose,
  onCompleted,
  payment,
  summary,
}: CloudRouterTeamCheckoutDialogProps) {
  const { t } = useTranslation();

  return (
    <SdkworkOrderCheckoutDialog
      copy={{
        activationDescription: t(
          'token_plan.team.checkout_hint',
          'Payment activates the team subscription automatically. Assign seats to members afterwards.',
        ),
        activationTitle: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.activationTitle, 'Instant activation'),
        close: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.close, 'Close'),
        completed: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.completed, 'Payment completed'),
        creatingPayment: t(
          SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.creatingPayment,
          'Creating payment QR code...',
        ),
        expired: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.expired, 'Order expired'),
        expiredDescription: t(
          SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.expiredDescription,
          'This order has expired. Create a new order to continue paying.',
        ),
        expiresIn: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.expiresIn, 'Order expires in'),
        paymentUnavailable: t(
          SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.paymentUnavailableTitle,
          'Payment QR code unavailable',
        ),
        paymentUnavailableDescription: t(
          'token_plan.team.checkout_failed',
          'Team subscription payment could not be started.',
        ),
        payByQr: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.payByQr, 'Scan to pay'),
        price: t('token_plan.team.total', 'Total'),
        retry: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.retry, 'Retry'),
        scanPrompt: t(
          SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.scanPrompt,
          'Scan with a mobile payment app to complete payment',
        ),
        secureDescription: t(
          SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.secureDescription,
          'Payment data is used for this order only.',
        ),
        secureTitle: t(SDKWORK_SUBSCRIPTION_I18N_KEYS.checkout.secureTitle, 'Secure checkout'),
        selectedItem: t('token_plan.team.checkout_item', 'Team subscription'),
        title: t('token_plan.team.checkout_title', 'Team subscription checkout'),
      }}
      driver={{
        createPayment: () => (
          payment
            ? Promise.resolve(payment)
            : Promise.resolve({ status: 'failed' as const })
        ),
        getPaymentStatus: (current) => (
          current.orderId
            ? getTeamCheckoutStatus(current.orderId)
            : Promise.resolve({ ...current, status: 'failed' as const })
        ),
        onPaymentCompleted: onCompleted,
      }}
      isOpen={isOpen}
      onClose={onClose}
      summary={summary}
    />
  );
}
