import { CircleAlert } from 'lucide-react';
import { useState } from 'react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import { formatTeamCnyAmount } from '../team/teamPricing.js';
import type { TeamBuyDraft } from './TeamPlanCards.js';
import { PaymentMethodPicker } from './CommerceSheets.js';
import { MobileSheet } from './MobileSheet.js';
import type { MembershipPaymentMethod } from '../runtime.js';

export interface TeamCheckoutSheetProps {
  readonly draft: TeamBuyDraft | null;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onConfirm: (method: MembershipPaymentMethod) => void;
  readonly open: boolean;
  readonly submitting: boolean;
  readonly t: MembershipTranslate;
}

/** Team purchase / add-seat confirmation sheet with the H5 cashier hand-off. */
export function TeamCheckoutSheet({
  draft,
  error,
  onClose,
  onConfirm,
  open,
  submitting,
  t,
}: TeamCheckoutSheetProps) {
  const [method, setMethod] = useState<MembershipPaymentMethod>('wechat_pay');
  return (
    <MobileSheet
      closeLabel={t('close', '关闭')}
      description={t(
        'team.checkout.description',
        '支付成功后团队坐席立即生效，可在席位管理中分配成员',
      )}
      footer={(
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="flex items-start gap-1.5 text-[12px] text-danger" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
          <button
            className="min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
            disabled={submitting || !draft}
            onClick={() => onConfirm(method)}
            type="button"
          >
            {submitting
              ? t('team.checkout.submitting', '正在创建订单…')
              : t('team.checkout.confirm', '确认支付')}
          </button>
        </div>
      )}
      onClose={onClose}
      open={open}
      title={draft?.action === 'add_seats'
        ? t('team.checkout.addSeatsTitle', '扩容团队坐席')
        : t('team.checkout.title', '开通团队会员')}
    >
      {draft ? (
        <div data-team-checkout>
          <div className="rounded-2xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{draft.packageName}</p>
                <p className="mt-0.5 text-[12px] text-ink-subtle">{draft.periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-bold leading-none text-brand tabular-nums">
                  {formatTeamCnyAmount(draft.total)}
                </p>
                {draft.originalPriceLabel ? (
                  <p className="mt-1 text-[11px] text-ink-subtle line-through">
                    {draft.originalPriceLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <PaymentMethodPicker onChange={setMethod} t={t} value={method} />
          <p className="mt-4 rounded-xl bg-surface-elevated px-3 py-2 text-[11px] leading-snug text-ink-muted">
            {t('team.checkout.cashierHint', '将跳转到收银台完成支付，支付结果以收银台为准。')}
          </p>
        </div>
      ) : null}
    </MobileSheet>
  );
}
