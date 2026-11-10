// 经营报表服务契约：调用生成 SDK 的 `promotions.promotionReports.retrieve`
// （`promotionReports.retrieve`，wire `GET /promotions/reports`），并把
// `from`/`to` 映射成生成 SDK 的 `from_` 查询参数；省略的边界不发送，
// 让服务端继续使用“最近 30 天”默认值。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backendPromotionReport } from './marketingService';

const { retrieve } = vi.hoisted(() => ({ retrieve: vi.fn() }));

vi.mock('@sdkwork/cloudroutes-pc-commons/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sdkwork/cloudroutes-pc-commons/runtime')>();
  return {
    ...actual,
    getSdkworkPromotionBackendSdkClient: () => ({
      promotions: { promotionReports: { retrieve } },
    }),
  };
});

const report = {
  from: '2026-09-01T00:00:00Z',
  to: '2026-09-30T23:59:59Z',
  counts: {
    issuedCodes: '0',
    claimedCoupons: '0',
    redeemedCoupons: '0',
    expiredCoupons: '0',
    voidedCoupons: '0',
    disabledCodes: '0',
    applicationsApplied: '0',
    applicationsSettled: '0',
    applicationsReleased: '0',
  },
  rates: { claimRateBp: '0', redemptionRateBp: '0', voidRateBp: '0' },
  byCurrency: [],
  topOffers: [],
};

beforeEach(() => {
  retrieve.mockReset();
  retrieve.mockResolvedValue(report);
});

describe('backendPromotionReport', () => {
  it('calls promotionReports.retrieve and maps from/to onto the generated from_ query key', async () => {
    const result = await backendPromotionReport({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });

    expect(retrieve).toHaveBeenCalledWith({
      from_: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    });
    expect(result).toEqual(report);
  });

  it('omits an absent bound so the server keeps the last-30-days default', async () => {
    await backendPromotionReport({ to: '2026-09-30T23:59:59.000Z' });

    expect(retrieve).toHaveBeenCalledWith({ to: '2026-09-30T23:59:59.000Z' });
  });

  it('rejects a payload that is not a record instead of returning undefined', async () => {
    retrieve.mockResolvedValueOnce(undefined);

    await expect(backendPromotionReport()).rejects.toThrow('Promotion report is required');
  });
});
