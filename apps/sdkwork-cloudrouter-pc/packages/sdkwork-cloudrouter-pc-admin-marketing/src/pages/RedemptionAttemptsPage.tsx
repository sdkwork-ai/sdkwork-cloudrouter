import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons';
import { formatTokenBankPoints, type ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  MarketingListView,
  type MarketingColumn,
  type MarketingLoadParams,
  type MarketingStatusOption,
} from '../components/MarketingListView';
import {
  MarketingStatusBadge,
  type MarketingTranslate,
} from '../components/MarketingValueBadge';
import {
  backendRedemptionAttemptsList,
  formatMarketingAmountMinor,
  formatMarketingInteger,
  formatMarketingTimestamp,
  MARKETING_EMPTY_VALUE,
  type PromotionRedemptionAttemptOutcome,
} from '../marketingService';

/** 结果筛选：`outcome` 是后端闭集，页面只允许把这两个值送进 query。 */
const redemptionOutcomeStatusOptions: MarketingStatusOption[] = [
  { value: 'succeeded', labelKey: 'admin.marketing.enums.redemptionOutcome.succeeded', fallback: 'Succeeded' },
  { value: 'failed', labelKey: 'admin.marketing.enums.redemptionOutcome.failed', fallback: 'Failed' },
];

/** 结果徽标文案：始终有文字，未知值原样展示，不依赖徽章的词表解析顺序。 */
const redemptionOutcomeLabels: Record<string, { key: string; fallback: string }> = {
  succeeded: {
    key: 'admin.marketing.enums.redemptionOutcome.succeeded',
    fallback: 'Succeeded',
  },
  failed: {
    key: 'admin.marketing.enums.redemptionOutcome.failed',
    fallback: 'Failed',
  },
};

/**
 * 失败码词表：运营可读文案，未知码回退原始值（绝不显示空白）。
 * `failureDetail` 是后端人类可读消息，只展示不解析（分类只看 `failureCode`）。
 */
const redemptionFailureCodeLabels: Record<string, { key: string; fallback: string }> = {
  code_unavailable: {
    key: 'admin.marketing.enums.redemptionFailureCode.code_unavailable',
    fallback: 'Code invalid or unavailable',
  },
  issue_limit_reached: {
    key: 'admin.marketing.enums.redemptionFailureCode.issue_limit_reached',
    fallback: 'Issue limit reached',
  },
  per_user_limit_reached: {
    key: 'admin.marketing.enums.redemptionFailureCode.per_user_limit_reached',
    fallback: 'Per-user limit reached',
  },
  idempotency_conflict: {
    key: 'admin.marketing.enums.redemptionFailureCode.idempotency_conflict',
    fallback: 'Idempotency conflict',
  },
  redemption_in_progress: {
    key: 'admin.marketing.enums.redemptionFailureCode.redemption_in_progress',
    fallback: 'Redemption in progress',
  },
  benefit_invalid: {
    key: 'admin.marketing.enums.redemptionFailureCode.benefit_invalid',
    fallback: 'Benefit rule invalid',
  },
  internal_error: {
    key: 'admin.marketing.enums.redemptionFailureCode.internal_error',
    fallback: 'System error',
  },
  rate_limited: {
    key: 'admin.marketing.enums.redemptionFailureCode.rate_limited',
    fallback: 'Too many attempts',
  },
  coupon_not_redeemable: {
    key: 'admin.marketing.enums.redemptionFailureCode.coupon_not_redeemable',
    fallback: 'Coupon no longer redeemable',
  },
  coupon_expired: {
    key: 'admin.marketing.enums.redemptionFailureCode.coupon_expired',
    fallback: 'Coupon expired',
  },
  audience_not_eligible: {
    key: 'admin.marketing.enums.redemptionFailureCode.audience_not_eligible',
    fallback: 'Audience not eligible',
  },
};

/** 权益类型词表：复用优惠券表单的账户口径；未知值原样展示。 */
const redemptionBenefitLabels: Record<string, { key: string; fallback: string }> = {
  token_bank_credit: {
    key: 'admin.marketing.coupon.form.benefit.account.token_bank_credit',
    fallback: 'Token Bank',
  },
  points_credit: {
    key: 'admin.marketing.coupon.form.benefit.account.points_credit',
    fallback: 'Membership Points',
  },
  cash_credit: {
    key: 'admin.marketing.coupon.form.benefit.account.cash_credit',
    fallback: 'Cash',
  },
  subscription: {
    key: 'admin.marketing.coupon.form.benefit.account.subscription',
    fallback: 'Subscription',
  },
};

function readRecordText(record: ApiRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readRedemptionOutcome(status: string | undefined): PromotionRedemptionAttemptOutcome | undefined {
  return status === 'succeeded' || status === 'failed' ? status : undefined;
}

/** 页面筛选状态（`MarketingLoadParams.status`）→ `outcome` query 参数。 */
function loadRedemptionAttempts(params: MarketingLoadParams) {
  const outcome = readRedemptionOutcome(params.status);
  return backendRedemptionAttemptsList({
    page: params.page,
    pageSize: params.pageSize,
    ...(params.q ? { q: params.q } : {}),
    ...(outcome ? { outcome } : {}),
  });
}

function redemptionFailureLabel(code: string, t: MarketingTranslate): string {
  const entry = redemptionFailureCodeLabels[code];
  return entry ? t(entry.key, entry.fallback) : code;
}

function redemptionOutcomeLabel(value: unknown, t: MarketingTranslate): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return MARKETING_EMPTY_VALUE;
  }
  const entry = redemptionOutcomeLabels[raw];
  return entry ? t(entry.key, entry.fallback) : raw;
}

function redemptionBenefitLabel(kind: string, t: MarketingTranslate): string {
  const entry = redemptionBenefitLabels[kind];
  return entry ? t(entry.key, entry.fallback) : kind;
}

/**
 * 兑换尝试台账：每一次兑换请求的追加式证据（成功与失败都保留）。
 *
 * 展示契约：
 * - 券码只展示后四位（`submittedCodeSuffix`），完整券码从不入库也不返回；
 * - 失败原因以失败码为分类，`failureDetail` 只作为次要说明展示，绝不解析；
 * - traceId 可复制，复制按钮的可访问名称包含该行的请求编号。
 */
export function RedemptionAttemptsPage() {
  const { t, i18n } = useTranslation();

  const columns: MarketingColumn<ApiRecord>[] = [
    {
      key: 'occurredAt',
      label: t('admin.marketing.promotions.redemptionAttempts.time', 'Time'),
      render: (_value, record) => formatMarketingTimestamp(
        readRecordText(record, 'occurredAt') || undefined,
        i18n.language,
      ),
    },
    {
      key: 'submittedCodeSuffix',
      label: t('admin.marketing.promotions.redemptionAttempts.codeSuffix', 'Code Suffix'),
      render: (_value, record) => {
        const codeId = readRecordText(record, 'codeId');
        const suffix = readRecordText(record, 'submittedCodeSuffix');
        if (!codeId || !suffix) {
          return MARKETING_EMPTY_VALUE;
        }
        return (
          <span
            className="font-mono text-xs text-slate-700 dark:text-slate-200"
            title={t(
              'admin.marketing.promotions.redemptionAttempts.codeSuffixHint',
              'last 4 characters of the submitted code',
            )}
          >
            {suffix}
          </span>
        );
      },
    },
    {
      key: 'subjectId',
      label: t('admin.marketing.promotions.redemptionAttempts.subject', 'Subject'),
      truncate: true,
    },
    {
      key: 'outcome',
      label: t('admin.marketing.promotions.redemptionAttempts.outcome', 'Outcome'),
      render: (value) => (
        <MarketingStatusBadge
          status={value}
          domain="redemptionAttempt"
          label={redemptionOutcomeLabel(value, t)}
        />
      ),
    },
    {
      key: 'failureCode',
      label: t('admin.marketing.promotions.redemptionAttempts.failureReason', 'Failure Reason'),
      render: (value, record) => {
        if (readRecordText(record, 'outcome') !== 'failed') {
          return MARKETING_EMPTY_VALUE;
        }
        const code = String(value ?? '').trim();
        const detail = readRecordText(record, 'failureDetail');
        return (
          <div className="flex min-w-0 flex-col">
            <span>{code ? redemptionFailureLabel(code, t) : MARKETING_EMPTY_VALUE}</span>
            {detail ? (
              <span
                className="block max-w-[18rem] truncate text-xs text-slate-500 dark:text-slate-400"
                title={detail}
              >
                {detail}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'benefitKind',
      label: t('admin.marketing.promotions.redemptionAttempts.benefit', 'Benefit'),
      render: (value, record) => {
        const kind = String(value ?? '').trim();
        const grantedAmount = readRecordText(record, 'grantedAmount');
        const currencyCode = readRecordText(record, 'currencyCode');
        const kindLabel = kind ? redemptionBenefitLabel(kind, t) : '';
        // Token Bank attempts store the account minor unit (micro-points);
        // cash attempts store currency minor units and carry their ISO code;
        // membership points are integers.
        let amountLabel = '';
        if (kind === 'token_bank_credit' && grantedAmount) {
          // Token Bank is points-denominated; the attempt's currencyCode is the
          // offer's pricing currency and must not be appended as a unit.
          amountLabel = formatTokenBankPoints(grantedAmount, i18n.language);
        } else if (kind === 'cash_credit' && grantedAmount) {
          amountLabel = formatMarketingAmountMinor(
            grantedAmount,
            currencyCode || 'CNY',
            i18n.language,
          );
        } else {
          const formatted = formatMarketingInteger(grantedAmount || undefined, {
            locale: i18n.language,
          });
          amountLabel = formatted === MARKETING_EMPTY_VALUE
            ? ''
            : `${formatted}${currencyCode ? ` ${currencyCode}` : ''}`;
        }
        if (!kindLabel && !amountLabel) {
          return MARKETING_EMPTY_VALUE;
        }
        return (
          <span className="whitespace-nowrap">
            {kindLabel}
            {kindLabel && amountLabel ? ' · ' : ''}
            {amountLabel}
          </span>
        );
      },
    },
    {
      key: 'requestNo',
      label: t('admin.marketing.promotions.redemptionAttempts.requestNo', 'Request No'),
      truncate: true,
    },
    {
      key: 'traceId',
      label: t('admin.marketing.promotions.redemptionAttempts.traceId', 'Trace ID'),
      render: (value, record) => {
        const traceId = String(value ?? '').trim();
        if (!traceId) {
          return MARKETING_EMPTY_VALUE;
        }
        const requestNo = readRecordText(record, 'requestNo');
        // 可访问名称带行上下文：同一页多个「复制追踪 ID」按钮互不混淆。
        const copyLabel = requestNo
          ? t(
              'admin.marketing.promotions.redemptionAttempts.copyTraceId',
              'Copy trace ID for request {{requestNo}}',
              { requestNo },
            )
          : t('admin.marketing.promotions.redemptionAttempts.copyTraceIdNoRequest', 'Copy trace ID');
        return (
          <div className="flex max-w-[16rem] items-center gap-1">
            <code className="truncate font-mono text-xs" title={traceId}>
              {traceId}
            </code>
            <CopyButton
              text={traceId}
              label={copyLabel}
              copiedLabel={t('admin.marketing.codes.copied', 'Copied')}
              errorLabel={t('admin.marketing.codes.copyFailed', 'Copy failed')}
              title={copyLabel}
              iconClassName="h-3.5 w-3.5"
            />
          </div>
        );
      },
    },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.promotions.redemptionAttempts.title', 'Redemption Attempts')}
      description={t(
        'admin.marketing.promotions.redemptionAttempts.desc',
        'Every code-redemption attempt in the selected window, including failures. The redeemable code is never stored; only the last four characters of the submitted code are shown.',
      )}
      load={loadRedemptionAttempts}
      columns={columns}
      showStatusFilter
      statusOptions={redemptionOutcomeStatusOptions}
      searchPlaceholder={t(
        'admin.marketing.promotions.redemptionAttempts.search',
        'Search by code suffix, user id, or request no',
      )}
      emptyTitle={t('admin.marketing.promotions.redemptionAttempts.empty', 'No redemption attempts')}
      emptyDescription={t(
        'admin.marketing.promotions.redemptionAttempts.emptyDesc',
        'No redemption has been attempted yet in this window. Adjust the search or status filter to look at other attempts.',
      )}
      exportable
      exportFileName="redemption-attempts.csv"
    />
  );
}
