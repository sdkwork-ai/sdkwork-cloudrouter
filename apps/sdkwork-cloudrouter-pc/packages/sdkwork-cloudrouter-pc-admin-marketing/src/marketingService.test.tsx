// 营销服务请求构建契约：自定义券码、每码兑换次数、订阅券会员套餐三元组。
// 本包 vitest 仅收集 `src/**/*.test.tsx`，因此纯函数测试也使用 .tsx 后缀。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  buildCodeBatchCreateRequest,
  buildCouponDiscountTerms,
  buildCouponOfferCreateRequests,
  buildCouponOfferUpdateRequest,
  normalizeCouponDiscountDecimal,
  normalizeCouponDiscountType,
  offerRecordToEditFormValues,
  parseCustomCouponCodes,
  readCouponDiscountTerms,
  readMarketingProblemStatus,
  readPromotionOfferVersion,
  validateCouponDiscountTerms,
  type CouponOfferCreateFormValues,
} from './marketingService';

function baseSubscriptionValues(
  overrides: Partial<CouponOfferCreateFormValues> = {},
): CouponOfferCreateFormValues {
  return {
    displayName: 'Subscription Coupon',
    offerType: 'COUPON',
    audienceScope: 'ALL',
    combinability: 'EXCLUSIVE',
    goodsScope: 'ALL',
    priority: 100,
    startsAt: '2026-08-01T00:00',
    status: 'active',
    benefitKind: 'subscription',
    currencyCode: 'CNY',
    period: 'month',
    durationDays: '30',
    dailyQuota: '1000',
    totalQuota: '30000',
    productId: 'pro-membership',
    skuId: 'sku-pro-monthly',
    packageId: '1002',
    stockType: 'limited',
    codeIssueMode: 'realtime',
    totalQuantity: '100',
    perUserLimit: 1,
    ...overrides,
  };
}

describe('buildCouponOfferCreateRequests subscription target', () => {
  it('maps the membership product, sku, and package ids into the subscription benefit', () => {
    const requests = buildCouponOfferCreateRequests(baseSubscriptionValues(), 'idem-sub');

    expect(requests.offerRequest.couponBenefit).toEqual({
      kind: 'subscription',
      period: 'month',
      durationDays: '30',
      dailyQuota: '1000',
      totalQuota: '30000',
      productId: 'pro-membership',
      skuId: 'sku-pro-monthly',
      packageId: '1002',
    });
  });

  it('omits the membership ids when all three are blank', () => {
    const requests = buildCouponOfferCreateRequests(
      baseSubscriptionValues({ productId: '', skuId: '   ', packageId: '' }),
      'idem-sub-blank',
    );

    expect(requests.offerRequest.couponBenefit).toEqual({
      kind: 'subscription',
      period: 'month',
      durationDays: '30',
      dailyQuota: '1000',
      totalQuota: '30000',
    });
  });

  it('rejects a partially filled membership target', () => {
    expect(() => buildCouponOfferCreateRequests(
      baseSubscriptionValues({ skuId: '' }),
      'idem-sub-partial',
    )).toThrow(/productId, skuId, and packageId/u);
  });
});

/**
 * 超过 `Number.MAX_SAFE_INTEGER`（2^53）的 int64 版本：若被转成 number 会变成
 * 9007199254740992，提交回去即成为过期版本。
 */
const INT64_VERSION = '9007199254740993';

describe('buildCouponOfferUpdateRequest', () => {
  it('attaches the version as an unmodified int64 decimal string', () => {
    const request = buildCouponOfferUpdateRequest(baseSubscriptionValues(), INT64_VERSION);

    expect(request.version).toBe(INT64_VERSION);
    expect(typeof request.version).toBe('string');
    expect(request.version).not.toBe(Number(INT64_VERSION));
  });

  it('keeps create requests free of version so create semantics do not change', () => {
    const { offerRequest } = buildCouponOfferCreateRequests(baseSubscriptionValues(), 'idem-create');

    expect('version' in offerRequest).toBe(false);
    // 未填写抵扣条款 → NONE（仅权益），与存量“只发权益”的优惠券载荷一致。
    expect(offerRequest.discountType).toBe('NONE');
    expect(offerRequest.discountValue).toBe('0');
    expect(offerRequest.minimumAmount).toBe('0');
    expect(offerRequest.maximumDiscountAmount).toBeNull();
  });

  it('preserves discount fields read from the existing offer', () => {
    const request = buildCouponOfferUpdateRequest({
      ...baseSubscriptionValues(),
      discountType: 'PERCENTAGE',
      discountValue: '8.5',
      minimumAmount: '100.50',
      maximumDiscountAmount: '20',
    }, INT64_VERSION);

    expect(request.discountType).toBe('PERCENTAGE');
    expect(request.discountValue).toBe('8.5');
    expect(request.minimumAmount).toBe('100.50');
    expect(request.maximumDiscountAmount).toBe('20');
  });
});

describe('offerRecordToEditFormValues', () => {
  it('prefills the edit form from the offer without the copy suffix', () => {
    const record = {
      id: 'o1',
      displayName: 'Cash Coupon',
      offerType: 'COUPON',
      audienceScope: 'NEW_USER',
      combinability: 'COMBINABLE',
      goodsScope: 'RECHARGE',
      priority: 7,
      startsAt: '2026-11-01T00:00:00Z',
      endsAt: '2026-12-01T00:00:00Z',
      status: 'disabled',
      currencyCode: 'USD',
      discountType: 'PERCENTAGE',
      discountValue: '8.5',
      minimumAmount: '100.50',
      maximumDiscountAmount: '20',
      couponBenefit: { kind: 'cash_credit', grantAmount: '1250' },
      version: INT64_VERSION,
    };

    const values = offerRecordToEditFormValues(record);

    expect(values.displayName).toBe('Cash Coupon');
    // 现金券后端存最小单位，编辑表单以元回显。
    expect(values.grantAmount).toBe('12.50');
    expect(values.priority).toBe(7);
    expect(values.status).toBe('disabled');
    expect(values.audienceScope).toBe('NEW_USER');
    expect(values.combinability).toBe('COMBINABLE');
    expect(values.goodsScope).toBe('RECHARGE');
    expect(values.currencyCode).toBe('USD');
    expect(values.discountType).toBe('PERCENTAGE');
    expect(values.discountValue).toBe('8.5');
    expect(values.minimumAmount).toBe('100.50');
    expect(values.maximumDiscountAmount).toBe('20');
    expect(readPromotionOfferVersion(record)).toBe(INT64_VERSION);
  });

  it('prefills a FIXED discount without inventing a cap amount', () => {
    const values = offerRecordToEditFormValues({
      displayName: 'Amount Off Coupon',
      startsAt: '2026-11-01T00:00:00Z',
      discountType: 'FIXED',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: null,
    });

    expect(values.discountType).toBe('FIXED');
    expect(values.discountValue).toBe('12.5');
    expect(values.minimumAmount).toBe('100');
    expect(values.maximumDiscountAmount).toBeUndefined();
  });
});

describe('coupon discount terms payload', () => {
  it('authoring a FIXED term sends the exact request payload', () => {
    const { offerRequest } = buildCouponOfferCreateRequests(
      baseSubscriptionValues({
        discountType: 'FIXED',
        discountValue: '12.5',
        minimumAmount: '100.50',
      }),
      'idem-fixed',
    );

    expect(offerRequest.discountType).toBe('FIXED');
    expect(offerRequest.discountValue).toBe('12.5');
    expect(offerRequest.minimumAmount).toBe('100.50');
    expect(offerRequest.maximumDiscountAmount).toBeNull();
  });

  it('authoring a PERCENTAGE term sends the percentage, cap, and minimum', () => {
    const { offerRequest } = buildCouponOfferCreateRequests(
      baseSubscriptionValues({
        discountType: 'PERCENTAGE',
        discountValue: '12.5',
        minimumAmount: '100',
        maximumDiscountAmount: '20',
      }),
      'idem-percentage',
    );

    expect(offerRequest.discountType).toBe('PERCENTAGE');
    expect(offerRequest.discountValue).toBe('12.5');
    expect(offerRequest.minimumAmount).toBe('100');
    expect(offerRequest.maximumDiscountAmount).toBe('20');
  });

  it('normalizes whitespace, a leading plus sign, and redundant leading zeros', () => {
    const terms = buildCouponDiscountTerms({
      discountType: 'percentage',
      discountValue: ' +012.50 ',
      minimumAmount: ' 00100 ',
      maximumDiscountAmount: ' +20.0 ',
    });

    expect(terms).toEqual({
      discountType: 'PERCENTAGE',
      discountValue: '12.50',
      minimumAmount: '100',
      maximumDiscountAmount: '20.0',
    });
  });

  it('rejects a comma or a third fraction digit instead of truncating it', () => {
    expect(() => buildCouponOfferCreateRequests(
      baseSubscriptionValues({ discountType: 'FIXED', discountValue: '1,000' }),
      'idem-comma',
    )).toThrow(/plain non-negative decimal/u);

    expect(() => buildCouponOfferCreateRequests(
      baseSubscriptionValues({ discountType: 'FIXED', discountValue: '12.345' }),
      'idem-precision',
    )).toThrow(/plain non-negative decimal/u);
  });

  it('drops a stale cap when the discount is not a percentage', () => {
    const terms = buildCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    });

    expect(terms.maximumDiscountAmount).toBeNull();
  });
});

describe('buildCouponDiscountTerms NONE', () => {
  it('forces the zero values that keep benefit-only coupons working exactly as before', () => {
    expect(buildCouponDiscountTerms({ discountType: undefined, discountValue: '', minimumAmount: '', maximumDiscountAmount: null }))
      .toEqual({
        discountType: 'NONE',
        discountValue: '0',
        minimumAmount: '0',
        maximumDiscountAmount: null,
      });
  });
});

describe('validateCouponDiscountTerms', () => {
  it('rejects a FIXED discount of 0', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '0',
      minimumAmount: '',
      maximumDiscountAmount: null,
    })).toContainEqual({ field: 'discountValue', code: 'fixedDiscountRequired' });
  });

  it('rejects PERCENTAGE 0 and values above 100', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'PERCENTAGE',
      discountValue: '0',
      minimumAmount: '',
      maximumDiscountAmount: null,
    })).toContainEqual({ field: 'discountValue', code: 'percentageOutOfRange' });

    expect(validateCouponDiscountTerms({
      discountType: 'PERCENTAGE',
      discountValue: '100.01',
      minimumAmount: '',
      maximumDiscountAmount: null,
    })).toContainEqual({ field: 'discountValue', code: 'percentageOutOfRange' });

    expect(validateCouponDiscountTerms({
      discountType: 'PERCENTAGE',
      discountValue: '100',
      minimumAmount: '',
      maximumDiscountAmount: '20',
    })).toEqual([]);
  });

  it('rejects a cap on FIXED and NONE', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '5',
      minimumAmount: '',
      maximumDiscountAmount: '20',
    })).toContainEqual({ field: 'maximumDiscountAmount', code: 'maximumDiscountNotAllowed' });

    expect(validateCouponDiscountTerms({
      discountType: 'NONE',
      discountValue: '',
      minimumAmount: '',
      maximumDiscountAmount: '20',
    })).toContainEqual({ field: 'maximumDiscountAmount', code: 'maximumDiscountNotAllowed' });
  });

  it('rejects a cap of 0 on PERCENTAGE', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minimumAmount: '',
      maximumDiscountAmount: '0',
    })).toContainEqual({ field: 'maximumDiscountAmount', code: 'maximumDiscountInvalid' });
  });

  it('rejects three-decimal values and a negative minimum', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '12.345',
      minimumAmount: '',
      maximumDiscountAmount: null,
    })).toContainEqual({ field: 'discountValue', code: 'decimalInvalid' });

    expect(validateCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '12.34',
      minimumAmount: '-5',
      maximumDiscountAmount: null,
    })).toContainEqual({ field: 'minimumAmount', code: 'minimumAmountInvalid' });
  });

  it('accepts FIXED and PERCENTAGE terms that the server accepts', () => {
    expect(validateCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '12.5',
      minimumAmount: '100.50',
      maximumDiscountAmount: null,
    })).toEqual([]);

    expect(validateCouponDiscountTerms({
      discountType: 'PERCENTAGE',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    })).toEqual([]);
  });
});

describe('discount normalization helpers', () => {
  it('maps the closed discount-type set case-insensitively', () => {
    expect(normalizeCouponDiscountType('fixed')).toBe('FIXED');
    expect(normalizeCouponDiscountType('percentage')).toBe('PERCENTAGE');
    expect(normalizeCouponDiscountType('PERCENT')).toBe('PERCENTAGE');
    expect(normalizeCouponDiscountType('NONE')).toBe('NONE');
    expect(normalizeCouponDiscountType(null)).toBe('NONE');
    expect(normalizeCouponDiscountType('unexpected')).toBe('NONE');
  });

  it('accepts at most two fraction digits and no sign', () => {
    expect(normalizeCouponDiscountDecimal(' +12.50 ')).toBe('12.50');
    expect(normalizeCouponDiscountDecimal('12.')).toBeNull();
    expect(normalizeCouponDiscountDecimal('-12.5')).toBeNull();
    expect(normalizeCouponDiscountDecimal('1,000')).toBeNull();
    expect(normalizeCouponDiscountDecimal('1e3')).toBeNull();
    expect(normalizeCouponDiscountDecimal('12.345')).toBeNull();
  });
});

describe('readCouponDiscountTerms', () => {
  it('renders nothing extra for NONE or a missing discount type', () => {
    expect(readCouponDiscountTerms({ discountType: 'NONE' })).toBeNull();
    expect(readCouponDiscountTerms({})).toBeNull();
  });

  it('returns the FIXED and PERCENTAGE terms for the detail drawer', () => {
    expect(readCouponDiscountTerms({
      discountType: 'FIXED',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    })).toEqual({
      discountType: 'FIXED',
      discountValue: '12.5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    });

    expect(readCouponDiscountTerms({
      discount_type: 'PERCENTAGE',
      discount_value: '8.5',
      minimum_amount: '100',
      maximum_discount_amount: '20',
    })).toEqual({
      discountType: 'PERCENTAGE',
      discountValue: '8.5',
      minimumAmount: '100',
      maximumDiscountAmount: '20',
    });
  });
});

describe('readMarketingProblemStatus', () => {
  it('reads 409 and 404 from SDK errors, error codes, and ProblemDetail', () => {
    expect(readMarketingProblemStatus({ httpStatus: 409 })).toBe(409);
    expect(readMarketingProblemStatus({ code: 'CONFLICT' })).toBe(409);
    expect(readMarketingProblemStatus({ problem: { status: 404 } })).toBe(404);
    expect(readMarketingProblemStatus({ code: 'NOT_FOUND' })).toBe(404);
    expect(readMarketingProblemStatus(new Error('network down'))).toBeNull();
  });
});

describe('buildCodeBatchCreateRequest', () => {
  it('keeps the generated prefix, length, and redemption cap', () => {
    const request = buildCodeBatchCreateRequest({
      stockId: '42',
      codeType: 'PUBLIC',
      codeSource: 'generated',
      quantity: '300',
      maxClaims: 3,
      codeLength: 20,
      codePrefix: 'VIP',
    }, 'idem-generated');

    expect(request.requestedQuantity).toBe('300');
    expect(request.maxClaims).toBe(3);
    expect(request.codeLength).toBe(20);
    expect(request.codePrefix).toBe('VIP');
    expect(request.customCodes).toBeUndefined();
  });

  it('derives the requested quantity from custom codes and locks single use', () => {
    const customCodes = ['WELCOME-2026-0001', 'WELCOME-2026-0002'];
    const request = buildCodeBatchCreateRequest({
      stockId: '42',
      codeType: 'PUBLIC',
      codeSource: 'custom',
      quantity: '999',
      customCodes,
      maxClaims: 5,
      codeLength: 16,
      codePrefix: 'IGNORED',
    }, 'idem-custom');

    expect(request.customCodes).toEqual(customCodes);
    expect(request.requestedQuantity).toBe(String(customCodes.length));
    expect(request.maxClaims).toBe(1);
    expect(request.codeLength).toBeUndefined();
    expect(request.codePrefix).toBeUndefined();
  });

  it('normalizes custom code lines before they reach the request', () => {
    expect(parseCustomCouponCodes(' welcome-2026-0001 \r\n\r\nWELCOME_2026-0002\n')).toEqual([
      'WELCOME-2026-0001',
      'WELCOME_2026-0002',
    ]);
  });
});
