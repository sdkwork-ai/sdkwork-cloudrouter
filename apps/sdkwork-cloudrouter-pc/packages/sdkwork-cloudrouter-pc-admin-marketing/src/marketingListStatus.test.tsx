// 状态过滤契约：各域状态值必须原样作为 `status` 查询参数交给生成的 SDK，
// 不能被收窄成 active/disabled，也不能在服务层做大小写或词表映射。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendPromotionDiscountApplicationsList,
  backendPromotionUserCouponsList,
} from './marketingService';

const sdkMocks = vi.hoisted(() => ({
  listUserCoupons: vi.fn(),
  listDiscountApplications: vi.fn(),
}));

vi.mock('@sdkwork/cloudroutes-pc-commons/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sdkwork/cloudroutes-pc-commons/runtime')>();
  return {
    ...actual,
    getSdkworkPromotionBackendSdkClient: () => ({
      promotions: {
        userCoupons: { list: sdkMocks.listUserCoupons },
        discountApplications: { list: sdkMocks.listDiscountApplications },
      },
    }),
  };
});

const emptyPage = {
  items: [],
  pageInfo: { page: '1', pageSize: '20', totalItems: '0', totalPages: '0', hasMore: false },
};

beforeEach(() => {
  sdkMocks.listUserCoupons.mockReset();
  sdkMocks.listUserCoupons.mockResolvedValue(emptyPage);
  sdkMocks.listDiscountApplications.mockReset();
  sdkMocks.listDiscountApplications.mockResolvedValue(emptyPage);
});

describe('promotion list status filtering', () => {
  it('forwards a user coupon lifecycle status unchanged', async () => {
    await backendPromotionUserCouponsList({ page: 2, pageSize: 50, q: 'abc', status: 'claimed' });

    expect(sdkMocks.listUserCoupons).toHaveBeenCalledWith({
      page: 2,
      pageSize: 50,
      q: 'abc',
      status: 'claimed',
    });
  });

  it('forwards each user coupon status value, including used and active', async () => {
    for (const status of ['redeemed', 'expired', 'disabled', 'voided', 'cancelled', 'used', 'active']) {
      sdkMocks.listUserCoupons.mockClear();
      await backendPromotionUserCouponsList({ page: 1, pageSize: 20, status });
      expect(sdkMocks.listUserCoupons).toHaveBeenCalledWith({ page: 1, pageSize: 20, status });
    }
  });

  it('forwards a discount application lifecycle status unchanged', async () => {
    await backendPromotionDiscountApplicationsList({ page: 1, pageSize: 20, status: 'rolled_back' });

    expect(sdkMocks.listDiscountApplications).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'rolled_back',
    });
  });
});
