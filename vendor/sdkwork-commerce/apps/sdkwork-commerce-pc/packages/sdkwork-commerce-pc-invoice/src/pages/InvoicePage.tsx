import { useEffect } from "react";
import {
  FilePenLine,
  ReceiptText,
} from "lucide-react";
import {
  Button,
  EmptyState,
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type { SdkworkInvoiceFilter } from "../invoice";
import type { SdkworkInvoiceMessagesOverrides } from "../invoice-copy";
import type { SdkworkInvoiceController } from "../invoice-controller";
import {
  useSdkworkInvoiceController,
  useSdkworkInvoiceControllerState,
} from "../invoice-controller";
import {
  createSdkworkInvoiceBackdropStyle,
  createSdkworkInvoiceGlassStyle,
  createSdkworkInvoiceHeroStyle,
  createSdkworkInvoiceHeroTextStyle,
  createSdkworkInvoicePanelStyle,
  createSdkworkInvoiceToneStyle,
} from "../invoice-appearance";
import {
  resolveSdkworkInvoiceStatusTone,
  SdkworkInvoiceIntlProvider,
  useSdkworkInvoiceIntl,
} from "../invoice-intl";
import { SdkworkInvoiceDetailDrawer } from "../components/invoice-detail-drawer";
import { SdkworkInvoiceEditorDialog } from "../components/invoice-editor-dialog";
import { SdkworkInvoiceStatGrid } from "../components/invoice-stat-grid";

export interface SdkworkInvoicePageProps {
  controller?: SdkworkInvoiceController;
  locale?: string | null;
  messages?: SdkworkInvoiceMessagesOverrides;
}

interface SdkworkInvoicePageContentProps {
  controller?: SdkworkInvoiceController;
  locale?: string | null;
  messages?: SdkworkInvoiceMessagesOverrides;
}

function SdkworkInvoicePageContent({
  controller: controllerProp,
  locale,
  messages,
}: SdkworkInvoicePageContentProps) {
  const controller = useSdkworkInvoiceController(controllerProp, {
    locale,
    messages,
  });
  const state = useSdkworkInvoiceControllerState(controller);
  const {
    copy,
    formatCurrencyCny,
    formatFilter,
    formatInvoiceType,
    formatStatus,
    formatTimestamp,
    formatTitleType,
  } = useSdkworkInvoiceIntl();
  const filterOptions: SdkworkInvoiceFilter[] = [
    "all",
    "actionable",
    "draft",
    "pending",
    "completed",
  ];
  const primaryHeroTextStyle = createSdkworkInvoiceHeroTextStyle();
  const mutedHeroTextStyle = createSdkworkInvoiceHeroTextStyle("muted");
  const subtleHeroTextStyle = createSdkworkInvoiceHeroTextStyle("subtle");

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkInvoiceBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[92rem] space-y-5">
          <section
            className="overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-6 py-7 text-white shadow-[var(--sdk-shadow-lg)]"
            style={createSdkworkInvoiceHeroStyle()}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] backdrop-blur-xl"
                  style={{
                    ...createSdkworkInvoiceGlassStyle("neutral", {
                      backgroundWeight: 8,
                      borderWeight: 18,
                      surfaceWeight: 74,
                    }),
                    ...subtleHeroTextStyle,
                  }}
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {copy.page.eyebrow}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={primaryHeroTextStyle}>{copy.page.title}</h1>
                <p className="mt-3 text-sm leading-7" style={mutedHeroTextStyle}>
                  {copy.page.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => controller.openCreateDialog()} type="button" variant="secondary">
                  <FilePenLine className="mr-2 h-4 w-4" />
                  {copy.actions.newInvoice}
                </Button>
              </div>
            </div>

            <div
              className="mt-8 inline-flex flex-wrap rounded-full border p-1 backdrop-blur-xl"
              style={createSdkworkInvoiceGlassStyle("neutral", {
                backgroundWeight: 8,
                borderWeight: 18,
                surfaceWeight: 72,
              })}
            >
              {filterOptions.map((filter) => (
                <Button
                  className="rounded-full"
                  key={filter}
                  onClick={() => controller.setFilter(filter)}
                  size="sm"
                  type="button"
                  variant={state.activeFilter === filter ? "secondary" : "ghost"}
                >
                  {formatFilter(filter)}
                </Button>
              ))}
            </div>
          </section>

          <SdkworkInvoiceStatGrid digest={state.dashboard.digest} statistics={state.dashboard.statistics} />

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError && !state.isEditorOpen ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <section
            className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]"
            style={createSdkworkInvoicePanelStyle("neutral", {
              backgroundWeight: 6,
              borderWeight: 16,
            })}
          >
            <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.views.eyebrow}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.views.title}</h2>
              </div>
            </div>

            <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
              {state.visibleInvoices.length === 0 ? (
                <div className="px-6 py-10">
                  <EmptyState
                    description={copy.views.empty}
                    title={copy.views.title}
                  />
                </div>
              ) : state.visibleInvoices.map((invoice) => (
                <article className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between" key={invoice.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{invoice.title}</div>
                      <span
                        className="rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
                        style={createSdkworkInvoiceToneStyle(resolveSdkworkInvoiceStatusTone(invoice.status))}
                      >
                        {formatStatus(invoice.status, invoice.statusLabel)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--sdk-color-text-secondary)]">
                      <span>{formatInvoiceType(invoice.type)}</span>
                      <span>{formatTimestamp(invoice.createdAt)}</span>
                      <span>{invoice.invoiceCode || invoice.invoiceNo ? `${invoice.invoiceCode || copy.common.emptyValue} / ${invoice.invoiceNo || copy.common.emptyValue}` : copy.views.draftDocument}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                        {formatCurrencyCny(invoice.totalAmountCny)}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                        {formatTitleType(invoice.titleType)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {invoice.canEdit ? (
                        <Button onClick={() => controller.openEditDialog(invoice.id)} type="button" variant="outline">
                          {copy.actions.edit}
                        </Button>
                      ) : null}
                      <Button onClick={() => void controller.openDetail(invoice.id)} type="button" variant="outline">
                        {copy.actions.viewDetails}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <SdkworkInvoiceEditorDialog controller={controller} />
      <SdkworkInvoiceDetailDrawer controller={controller} />
    </div>
  );
}

export function SdkworkInvoicePage({
  locale,
  messages,
  ...props
}: SdkworkInvoicePageProps) {
  const content = (
    <SdkworkInvoicePageContent
      {...props}
      locale={locale}
      messages={messages}
    />
  );

  if (locale || messages) {
    return (
      <SdkworkInvoiceIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkInvoiceIntlProvider>
    );
  }

  return content;
}
