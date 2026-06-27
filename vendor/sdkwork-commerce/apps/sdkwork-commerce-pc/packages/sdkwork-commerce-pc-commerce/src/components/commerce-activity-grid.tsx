import { CreditCard } from "lucide-react";
import { StatusBadge } from "@sdkwork/ui-pc-react";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type { SdkworkCommerceSnapshot } from "../commerce-service";

export interface SdkworkCommerceActivityGridProps {
  snapshot: Pick<
    SdkworkCommerceSnapshot,
    "recentCoupons" | "recentInvoices" | "recentOrders" | "recentPayments" | "recentTransactions"
  >;
}

export function SdkworkCommerceActivityGrid({
  snapshot,
}: SdkworkCommerceActivityGridProps) {
  const {
    copy,
    formatCurrency,
    formatDate,
    formatPoints,
  } = useSdkworkCommerceIntl();

  return (
    <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-5">
      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.activity.couponsEyebrow}</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.activity.couponsTitle}</h2>
        </div>

        <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {snapshot.recentCoupons.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.activity.couponsEmpty}
            </div>
          ) : snapshot.recentCoupons.map((coupon) => (
            <div className="flex items-center justify-between gap-4 px-6 py-4" key={coupon.id}>
              <div>
                <div className="font-medium text-[var(--sdk-color-text-primary)]">{coupon.name}</div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {coupon.code || coupon.userCouponId || coupon.couponId || coupon.id}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatCurrency(coupon.amountCny)}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                  {coupon.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.activity.transactionsEyebrow}</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.activity.transactionsTitle}</h2>
        </div>

        <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {snapshot.recentTransactions.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.activity.transactionsEmpty}
            </div>
          ) : snapshot.recentTransactions.map((transaction) => (
            <div className="flex items-center justify-between gap-4 px-6 py-4" key={transaction.id}>
              <div>
                <div className="font-medium text-[var(--sdk-color-text-primary)]">{transaction.title}</div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatDate(transaction.createdAt)}
                </div>
              </div>
              <div
                className={`text-sm font-semibold ${
                  transaction.direction === "earned" ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {transaction.direction === "earned" ? "+" : "-"}
                {formatPoints(transaction.points)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.activity.ordersEyebrow}</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.activity.ordersTitle}</h2>
        </div>

        <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {snapshot.recentOrders.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.activity.ordersEmpty}
            </div>
          ) : snapshot.recentOrders.map((order) => (
            <div className="flex items-center justify-between gap-4 px-6 py-4" key={order.id}>
              <div>
                <div className="font-medium text-[var(--sdk-color-text-primary)]">{order.subject}</div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {order.statusLabel} / {formatDate(order.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatCurrency(order.totalAmountCny)}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                  {order.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.activity.invoicesEyebrow}</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.activity.invoicesTitle}</h2>
        </div>

        <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {snapshot.recentInvoices.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.activity.invoicesEmpty}
            </div>
          ) : snapshot.recentInvoices.map((invoice) => (
            <div className="flex items-center justify-between gap-4 px-6 py-4" key={invoice.id}>
              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--sdk-color-text-primary)]">{invoice.title}</div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatDate(invoice.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <StatusBadge className="justify-end" label={invoice.statusLabel} status={invoice.status} />
                <div className="mt-2 font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatCurrency(invoice.totalAmountCny)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
        <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.activity.paymentsEyebrow}</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.activity.paymentsTitle}</h2>
        </div>

        <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {snapshot.recentPayments.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.activity.paymentsEmpty}
            </div>
          ) : snapshot.recentPayments.map((payment) => (
            <div className="flex items-center justify-between gap-4 px-6 py-4" key={payment.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-medium text-[var(--sdk-color-text-primary)]">
                    {payment.paymentMethod || payment.paymentProvider || copy.activity.unknownPayment}
                  </div>
                  <StatusBadge label={payment.statusLabel} status={payment.status} />
                </div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {payment.paymentSn || payment.orderId || payment.id}
                </div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatDate(payment.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatCurrency(payment.amountCny)}
                </div>
                <div className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                  <CreditCard className="h-3.5 w-3.5" />
                  {payment.paymentProvider || "--"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
