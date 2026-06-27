import { describe, expect, it, vi } from "vitest";
import { createSdkworkCommerceService } from "../src";

describe("sdkwork-commerce-pc-commerce service", () => {
  it("composes wallet, points, membership, and order summaries into one commercial hub snapshot", async () => {
    const service = createSdkworkCommerceService({
      couponService: {
        getDashboard: vi.fn().mockResolvedValue({
          availableCoupons: [
            {
              amountCny: 80,
              couponId: "200",
              id: "user-coupon-UC-200",
              name: "Pro Monthly 80",
              remainingDays: 15,
              status: "available",
              type: "cash",
              userCouponId: "UC-200",
            },
          ],
          catalogCoupons: [
            {
              amountCny: 120,
              canReceive: true,
              couponId: "200",
              description: "Claimable launch discount",
              id: "coupon-200",
              name: "Launch 120",
              pointCost: null,
              pointsExchange: false,
              status: "available",
              type: "cash",
            },
          ],
          catalogDigest: {
            claimableCoupons: 1,
            pointsExchangeCoupons: 1,
            totalCoupons: 1,
          },
          myCoupons: [
            {
              amountCny: 80,
              couponId: "200",
              id: "user-coupon-UC-200",
              name: "Pro Monthly 80",
              remainingDays: 15,
              status: "available",
              type: "cash",
              userCouponId: "UC-200",
            },
          ],
          statistics: {
            expiredCount: 0,
            totalCoupons: 1,
            unusedCount: 1,
            usedCount: 0,
          },
          userDigest: {
            availableCoupons: 1,
            expiringSoonCoupons: 0,
            highestDiscountAmountCny: 80,
            totalCoupons: 1,
          },
        }),
      },
      orderService: {
        getDashboard: vi.fn().mockResolvedValue({
          orders: [
            {
              createdAt: "2026-04-03T09:00:00.000Z",
              id: "ORDER-3",
              paidAmountCny: 0,
              status: "pending-payment",
              statusLabel: "Pending payment",
              subject: "Pro Monthly",
              totalAmountCny: 199,
            },
          ],
          statistics: {
            completed: 8,
            pendingPayment: 1,
            pendingReceipt: 0,
            pendingShipment: 0,
            totalAmountCny: 2999,
            totalOrders: 9,
          },
        }),
      },
      invoiceService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 1,
            archivedInvoices: 1,
            completedInvoices: 1,
            processingInvoices: 1,
            totalAmountCny: 598,
            totalInvoices: 3,
          },
          invoices: [
            {
              canCancel: false,
              canDownload: true,
              canEdit: false,
              canSubmit: false,
              createdAt: "2026-04-03T08:00:00.000Z",
              currency: "CNY",
              id: "INV-1002",
              invoiceCode: "3100231130",
              invoiceNo: "00012291",
              status: "completed",
              statusLabel: "Completed",
              title: "SDKWORK Technology",
              titleType: "company",
              totalAmountCny: 399,
              type: "electronic",
              updatedAt: "2026-04-03T10:30:00.000Z",
            },
          ],
          statistics: {
            completedInvoices: 1,
            pendingInvoices: 1,
            totalAmountCny: 598,
            totalInvoices: 3,
          },
        }),
      },
      paymentService: {
        getDashboard: vi.fn().mockResolvedValue({
          clientType: "WEB",
          digest: {
            actionablePayments: 1,
            closedPayments: 0,
            failedPayments: 0,
            successfulPayments: 1,
            timedOutPayments: 0,
            totalAmountCny: 598,
            totalPayments: 2,
          },
          methods: [
            {
              available: true,
              code: "WECHAT_PAY",
              id: "wechat-pay",
              label: "WeChat Pay",
              productTypes: [],
              recommendedProductType: "native",
              sort: 100,
            },
            {
              available: true,
              code: "ALIPAY",
              id: "alipay",
              label: "Alipay",
              productTypes: [],
              recommendedProductType: "pc",
              sort: 90,
            },
          ],
          records: [
            {
              amountCny: 399,
              canClose: false,
              canReconcile: false,
              canRefreshStatus: false,
              createdAt: "2026-04-03T09:10:00.000Z",
              id: "PAY-3",
              orderId: "ORDER-3",
              outTradeNo: "OUT-ORDER-3",
              paymentMethod: "WECHAT_PAY",
              paymentProvider: "WECHAT_PAY",
              paymentSn: "PAYMENT-0003",
              status: "success",
              statusLabel: "Success",
            },
            {
              amountCny: 199,
              canClose: true,
              canReconcile: true,
              canRefreshStatus: true,
              createdAt: "2026-04-03T09:00:00.000Z",
              id: "PAY-2",
              orderId: "ORDER-2",
              outTradeNo: "OUT-ORDER-2",
              paymentMethod: "ALIPAY",
              paymentProvider: "ALIPAY",
              paymentSn: "PAYMENT-0002",
              status: "pending",
              statusLabel: "Pending",
            },
          ],
          statistics: {
            closedPayments: 0,
            failedPayments: 0,
            pendingPayments: 1,
            successPayments: 1,
            timeoutPayments: 0,
            totalPayments: 2,
          },
        }),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue({
          plans: [],
          rechargeOffers: [
            {
              description: "Best for premium creation",
              id: "recharge-pack-2",
              points: 5000,
              priceCny: 38,
              recommended: true,
              title: "5000 Points",
            },
          ],
          summary: {
            balancePoints: 2400,
            currentPlan: {
              level: 3,
              name: "Pro",
              remainingDays: 18,
              status: "active",
              points: 3200,
            },
            earnedThisMonth: 1200,
            isAuthenticated: true,
            pointsToCashRate: 100,
            spentThisMonth: 240,
            totalEarned: 5400,
            totalSpent: 3000,
          },
          transactions: [
            {
              createdAt: "2026-04-02T11:00:00.000Z",
              direction: "spent",
              id: "transaction-2",
              points: 240,
              status: "completed",
              title: "Points usage",
            },
          ],
        }),
      },
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [
            {
              claimed: true,
              id: "membership-benefit-2",
              name: "Priority rendering",
            },
          ],
          levels: [],
          plans: [
            {
              durationDays: 365,
              id: "membership-plan-3",
              includedPoints: 60000,
              name: "Pro Annual",
              originalPriceCny: 999,
              packageId: 3,
              priceCny: 699,
              recommended: true,
              tags: ["Annual"],
            },
            {
              durationDays: 30,
              id: "membership-plan-2",
              includedPoints: 5000,
              name: "Pro Monthly",
              originalPriceCny: 239,
              packageId: 2,
              priceCny: 199,
              recommended: false,
              tags: ["Monthly"],
            },
          ],
          summary: {
            currentLevelName: "Pro",
            currentLevelValue: 3,
            growthValue: 180,
            isAuthenticated: true,
            isMember: true,
            pointBalance: 2400,
            remainingDays: 18,
            status: "active",
            totalSpent: 399,
            upgradeGrowthValue: 500,
            points: 3200,
          },
        }),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          account: {
            availablePoints: 2400,
            cashAvailable: 66,
            cashFrozen: 0,
            experience: 18,
            frozenPoints: 0,
            hasPayPassword: true,
            level: 3,
            levelName: "Pro",
            status: "ACTIVE",
            statusName: "Active",
            tokenBalance: 8,
            totalEarned: 5400,
            totalPoints: 2400,
            totalSpent: 3000,
          },
          isAuthenticated: true,
          pointsToCashRate: 100,
          rechargePackages: [],
          transactions: [],
        }),
      },
    });

    const snapshot = await service.getSnapshot();

    expect(snapshot.summary).toMatchObject({
      actionablePayments: 1,
      availableCoupons: 1,
      availablePoints: 2400,
      availablePaymentMethods: 2,
      bestOfferSavingsCny: 300,
      claimableCoupons: 1,
      currentLevelName: "Pro",
      expiringSoonCoupons: 0,
      featuredOffers: 4,
      invoiceActionRequired: 1,
      invoicePendingCount: 1,
      isAuthenticated: true,
      pendingPaymentOrders: 1,
      totalOrders: 9,
    });
    expect(snapshot.analyticsSummary).toMatchObject({
      activeAlerts: 2,
      averageOrderValueCny: 333.22,
      totalRevenueCny: 2999,
      totalRevenueRecords: 9,
      totalSuccessfulOrders: 8,
    });
    expect(snapshot.revenueTrend[0]).toMatchObject({
      averageOrderValueCny: 399,
      bucketKey: "2026-04-03",
      label: "Apr 03",
      orders: 1,
      revenueCny: 399,
    });
    expect(snapshot.productPerformance[0]).toMatchObject({
      orderCount: 1,
      sharePercent: 100,
      title: "Pro Monthly",
      totalRevenueCny: 399,
      trendDeltaPercent: 0,
    });
    expect(snapshot.recentRevenueRecords[0]).toMatchObject({
      amountCny: 399,
      channel: "WECHAT_PAY",
      id: "ORDER-3",
      productTitle: "Pro Monthly",
      status: "success",
    });
    expect(snapshot.alerts).toEqual([
      expect.objectContaining({
        id: "payments-pending",
        severity: "warning",
      }),
      expect.objectContaining({
        id: "invoices-action-required",
        severity: "danger",
      }),
    ]);
    expect(snapshot.offerDigest).toEqual({
      couponOffers: 1,
      featuredOffers: 4,
      highlightedSavingsCny: 300,
      membershipOffers: 2,
      rechargeOffers: 1,
    });
    expect(snapshot.featuredOffers[0]).toMatchObject({
      action: {
        capability: "subscription",
        route: "/subscription?mode=renew&packageId=3",
      },
      group: "membership",
      id: "offer-membership-3",
      title: "Pro Annual",
    });
    expect(snapshot.recentOrders[0]).toMatchObject({
      id: "ORDER-3",
      status: "pending-payment",
    });
    expect(snapshot.recentPayments[0]).toMatchObject({
      id: "PAY-3",
      paymentMethod: "WECHAT_PAY",
      status: "success",
    });
    expect(snapshot.recentTransactions[0]).toMatchObject({
      id: "transaction-2",
      title: "Points usage",
    });
    expect(snapshot.recentInvoices[0]).toMatchObject({
      id: "INV-1002",
      status: "completed",
      title: "SDKWORK Technology",
    });
    expect(snapshot.recentCoupons[0]).toMatchObject({
      id: "user-coupon-UC-200",
      status: "available",
      userCouponId: "UC-200",
    });
  });

  it("localizes service-generated alerts and fallback commercial labels when a Chinese locale is configured", async () => {
    const service = createSdkworkCommerceService({
      locale: "zh-CN",
      couponService: {
        getDashboard: vi.fn().mockResolvedValue({
          availableCoupons: [],
          catalogCoupons: [],
          catalogDigest: {
            claimableCoupons: 0,
            pointsExchangeCoupons: 0,
            totalCoupons: 0,
          },
          myCoupons: [],
          statistics: {
            expiredCount: 0,
            totalCoupons: 0,
            unusedCount: 0,
            usedCount: 0,
          },
          userDigest: {
            availableCoupons: 0,
            expiringSoonCoupons: 0,
            highestDiscountAmountCny: 0,
            totalCoupons: 0,
          },
        }),
      },
      invoiceService: {
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 1,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 1,
          },
          invoices: [],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 1,
            totalAmountCny: 0,
            totalInvoices: 1,
          },
        }),
      },
      offerService: {
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            couponOffers: 0,
            featuredOffers: 0,
            highlightedSavingsCny: 0,
            membershipOffers: 0,
            rechargeOffers: 0,
          },
          featuredOffers: [],
        }),
      },
      orderService: {
        getDashboard: vi.fn().mockResolvedValue({
          orders: [
            {
              createdAt: "2026-04-03T09:00:00.000Z",
              id: "ORDER-3",
              paidAmountCny: 0,
              status: "pending-payment",
              statusLabel: "Pending payment",
              subject: "",
              totalAmountCny: 199,
            },
          ],
          statistics: {
            completed: 0,
            pendingPayment: 2,
            pendingReceipt: 0,
            pendingShipment: 0,
            totalAmountCny: 199,
            totalOrders: 2,
          },
        }),
      },
      paymentService: {
        getDashboard: vi.fn().mockResolvedValue({
          clientType: "WEB",
          digest: {
            actionablePayments: 2,
            closedPayments: 0,
            failedPayments: 0,
            successfulPayments: 1,
            timedOutPayments: 0,
            totalAmountCny: 199,
            totalPayments: 2,
          },
          methods: [
            {
              available: true,
              code: "WECHAT_PAY",
              id: "wechat-pay",
              label: "WeChat Pay",
              productTypes: [],
              recommendedProductType: "native",
              sort: 100,
            },
          ],
          records: [
            {
              amountCny: 199,
              canClose: false,
              canReconcile: false,
              canRefreshStatus: false,
              createdAt: "2026-04-03T09:10:00.000Z",
              id: "PAY-3",
              orderId: "ORDER-3",
              outTradeNo: "OUT-ORDER-3",
              paymentMethod: "WECHAT_PAY",
              paymentProvider: "WECHAT_PAY",
              paymentSn: "PAYMENT-0003",
              status: "success",
              statusLabel: "Success",
            },
          ],
          statistics: {
            closedPayments: 0,
            failedPayments: 0,
            pendingPayments: 2,
            successPayments: 1,
            timeoutPayments: 0,
            totalPayments: 2,
          },
        }),
      },
      pointsService: {
        getDashboard: vi.fn().mockResolvedValue({
          plans: [],
          rechargeOffers: [],
          summary: {
            balancePoints: 0,
            currentPlan: null,
            earnedThisMonth: 0,
            isAuthenticated: true,
            pointsToCashRate: 100,
            spentThisMonth: 0,
            totalEarned: 0,
            totalSpent: 0,
          },
          transactions: [],
        }),
      },
      membershipService: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [],
          levels: [],
          plans: [],
          summary: {
            currentLevelName: "",
            currentLevelValue: 0,
            growthValue: 0,
            isAuthenticated: true,
            isMember: false,
            pointBalance: 0,
            remainingDays: null,
            status: "guest",
            totalSpent: 0,
            upgradeGrowthValue: 0,
            points: 0,
          },
        }),
      },
      walletService: {
        getOverview: vi.fn().mockResolvedValue({
          account: {
            availablePoints: 0,
            cashAvailable: 0,
            cashFrozen: 0,
            experience: 0,
            frozenPoints: 0,
            hasPayPassword: false,
            level: 0,
            levelName: "",
            status: "ACTIVE",
            statusName: "Active",
            tokenBalance: 0,
            totalEarned: 0,
            totalPoints: 0,
            totalSpent: 0,
          },
          isAuthenticated: true,
          pointsToCashRate: 100,
          rechargePackages: [],
          transactions: [],
        }),
      },
    });

    const snapshot = await service.getSnapshot();

    expect(service.getEmptySnapshot().summary.currentLevelName).toBe("游客");
    expect(snapshot.alerts).toEqual([
      expect.objectContaining({
        id: "payments-pending",
        title: "待跟进支付事项",
        metric: "待完成 2 笔",
      }),
      expect.objectContaining({
        id: "invoices-action-required",
        title: "发票待处理",
        metric: "1 张发票",
      }),
      expect.objectContaining({
        id: "payment-method-coverage",
        title: "支付方式覆盖偏弱",
        metric: "1 种方式",
      }),
    ]);
    expect(snapshot.recentRevenueRecords[0]?.productTitle).toBe("商业化订单");
    expect(snapshot.productPerformance[0]?.title).toBe("商业化订单");
  });
});
