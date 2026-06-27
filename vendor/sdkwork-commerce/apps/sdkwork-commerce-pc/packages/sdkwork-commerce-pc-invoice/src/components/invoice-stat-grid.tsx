import {
  FilePenLine,
  Hourglass,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@sdkwork/ui-pc-react";
import type { SdkworkInvoiceStatusDigest } from "../invoice";
import { useSdkworkInvoiceIntl } from "../invoice-intl";
import type { SdkworkInvoiceStatistics } from "../invoice-service";

export interface SdkworkInvoiceStatGridProps {
  digest: SdkworkInvoiceStatusDigest;
  statistics: SdkworkInvoiceStatistics;
}

export function SdkworkInvoiceStatGrid({
  digest,
  statistics,
}: SdkworkInvoiceStatGridProps) {
  const {
    copy,
    formatCurrencyCny,
    formatTemplate,
  } = useSdkworkInvoiceIntl();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        change={formatTemplate(copy.stats.completedAmountMeta, {
          count: String(statistics.totalInvoices),
        })}
        description={copy.stats.completedAmountDescription}
        icon={<WalletCards className="h-5 w-5" />}
        label={copy.stats.completedAmount}
        value={formatCurrencyCny(statistics.totalAmountCny)}
      />

      <StatCard
        change={formatTemplate(copy.stats.processingQueueMeta, {
          count: String(statistics.pendingInvoices),
        })}
        changeTone="warning"
        description={copy.stats.processingQueueDescription}
        icon={<Hourglass className="h-5 w-5" />}
        label={copy.stats.processingQueue}
        value={digest.processingInvoices}
      />

      <StatCard
        change={formatTemplate(copy.stats.actionableDraftsMeta, {
          count: String(digest.actionableInvoices),
        })}
        changeTone={digest.actionableInvoices > 0 ? "warning" : "default"}
        description={copy.stats.actionableDraftsDescription}
        icon={<FilePenLine className="h-5 w-5" />}
        label={copy.stats.actionableDrafts}
        value={digest.actionableInvoices}
      />

      <StatCard
        change={formatTemplate(copy.stats.loadedInvoicesMeta, {
          amount: formatCurrencyCny(digest.totalAmountCny),
        })}
        description={copy.stats.loadedInvoicesDescription}
        icon={<ReceiptText className="h-5 w-5" />}
        label={copy.stats.loadedInvoices}
        value={digest.totalInvoices}
      />
    </div>
  );
}
