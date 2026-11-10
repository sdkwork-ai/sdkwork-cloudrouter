import { useEffect, useState } from 'react';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { backendPromotionCouponStocksList, backendPromotionOffersList } from './marketingService';

/**
 * 列表页引用名称映射：offer id → 展示名称、stock id → 库存编号，
 * 以及 offer id → 库存列表（用于运营指标列与发放设置展示）。
 * 另提供 offer id → 币种，供库存预算等「只有最小单位金额」的记录格式化金额时使用
 * （`CouponStock` 契约本身没有币种字段）。
 * 加载失败时保持空映射，各列渲染回退展示原始 id。
 */
export function usePromotionReferences() {
  const [offerNames, setOfferNames] = useState<Record<string, string>>({});
  const [offerCurrencies, setOfferCurrencies] = useState<Record<string, string>>({});
  const [stockNames, setStockNames] = useState<Record<string, string>>({});
  const [stockByOffer, setStockByOffer] = useState<Record<string, ApiRecord[]>>({});

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      backendPromotionOffersList({ page: 1, pageSize: 200 }),
      backendPromotionCouponStocksList({ page: 1, pageSize: 200 }),
    ])
      .then(([offers, stocks]) => {
        if (cancelled) {
          return;
        }
        const offerMapping: Record<string, string> = {};
        const offerCurrencyMapping: Record<string, string> = {};
        for (const item of offers.items) {
          const offerId = String(item['id']);
          offerMapping[offerId] = String(item['displayName'] ?? '');
          offerCurrencyMapping[offerId] = String(item['currencyCode'] ?? '').trim();
        }
        const stockMapping: Record<string, string> = {};
        const stockByOfferMapping: Record<string, ApiRecord[]> = {};
        for (const item of stocks.items) {
          stockMapping[String(item['id'])] = String(item['stockNo'] ?? '');
          const offerId = String(item['offerId'] ?? '');
          if (offerId) {
            (stockByOfferMapping[offerId] ??= []).push(item);
          }
        }
        setOfferNames(offerMapping);
        setOfferCurrencies(offerCurrencyMapping);
        setStockNames(stockMapping);
        setStockByOffer(stockByOfferMapping);
      })
      .catch(() => {
        // 名称映射失败不影响列表
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { offerNames, offerCurrencies, stockNames, stockByOffer };
}
