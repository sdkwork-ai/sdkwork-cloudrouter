import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crown, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, StatusNotice } from "@sdkwork/ui-pc-react";
import {
  createMembershipCheckoutRouteIntent,
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
} from "@sdkwork/membership-pc-membership";
import type { SdkworkSubscriptionCatalogCheckoutModalProps } from "@sdkwork/membership-pc-subscription/catalog";
import { useNavigate } from "react-router-dom";

import { useConsoleBusinessNavigation } from "../console-business/consoleBusinessNavigation.ts";
import { resolveMembershipPlanForCatalogCheckout } from "./tokenPlanCheckoutPlan.ts";
import { navigateTokenPlanProtectedRoute } from "./tokenPlanNavigation.ts";

export function ClawRouterTokenPlanCheckoutModal({
  isOpen,
  onClose,
  plan,
}: SdkworkSubscriptionCatalogCheckoutModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { checkoutPath } = useConsoleBusinessNavigation();
  const controller = useSdkworkMembershipController();
  const state = useSdkworkMembershipControllerState(controller);
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, isOpen, state.isBootstrapped, state.isLoading, state.lastError]);

  useEffect(() => {
    if (!isOpen) {
      setIsContinuing(false);
    }
  }, [isOpen]);

  const resolvedPlan = useMemo(() => {
    if (!plan) {
      return null;
    }

    return resolveMembershipPlanForCatalogCheckout(state.dashboard.plans, plan);
  }, [plan, state.dashboard.plans]);

  function handleContinueToCheckout() {
    if (!plan) {
      return;
    }

    setIsContinuing(true);

    if (resolvedPlan) {
      const checkoutRoute = createMembershipCheckoutRouteIntent({
        basePath: checkoutPath,
        mode: "purchase",
        plan: resolvedPlan,
      }).route;

      navigateTokenPlanProtectedRoute(checkoutRoute, navigate);
      onClose();
      return;
    }

    navigateTokenPlanProtectedRoute(checkoutPath, navigate);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && plan ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={t("close", "关闭")}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />

          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-800/60 bg-[#1e1e22] shadow-2xl"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                  <Crown aria-hidden="true" className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {t("token_plan_checkout_eyebrow", "Token Plan")}
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {t("token_plan_checkout_title", "会员订阅")}
                  </h2>
                </div>
              </div>
              <button
                className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">{t("selected_plan", "已选套餐")}</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{plan.name}</div>
                    <div className="mt-2 text-sm text-zinc-400">{plan.packagePeriodLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-400">{t("price", "价格")}</div>
                    <div className="mt-1 text-3xl font-semibold tabular-nums text-white">
                      ¥{plan.priceLabel}
                    </div>
                    {plan.originalPrice ? (
                      <div className="mt-1 text-sm text-zinc-500 line-through">{plan.originalPrice}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-400" />
                    {t("token_plan_secure_checkout", "安全结算")}
                  </div>
                  <p className="mt-2 leading-6 text-zinc-400">
                    {t(
                      "token_plan_secure_checkout_description",
                      "将在控制台完成支付方式选择与订单确认。",
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <Sparkles aria-hidden="true" className="h-4 w-4 text-sky-400" />
                    {t("token_plan_instant_activation", "即时生效")}
                  </div>
                  <p className="mt-2 leading-6 text-zinc-400">
                    {t(
                      "token_plan_instant_activation_description",
                      "支付完成后会员权益将自动同步到你的 Claw Router 账户。",
                    )}
                  </p>
                </div>
              </div>

              {state.lastError ? (
                <StatusNotice tone="danger" title={t("token_plan_checkout_error_title", "无法加载套餐信息")}>
                  <span className="text-sm">{state.lastError}</span>
                </StatusNotice>
              ) : null}

              {!resolvedPlan && state.isBootstrapped ? (
                <StatusNotice tone="warning" title={t("token_plan_checkout_fallback_title", "将使用默认结算页")}>
                  <span className="text-sm">
                    {t(
                      "token_plan_checkout_fallback_description",
                      "暂时无法匹配后台套餐，你仍可在结算页选择具体方案。",
                    )}
                  </span>
                </StatusNotice>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button disabled={isContinuing} onClick={onClose} type="button" variant="ghost">
                  {t("cancel", "取消")}
                </Button>
                <Button
                  disabled={isContinuing || state.isLoading}
                  loading={isContinuing || state.isLoading}
                  onClick={handleContinueToCheckout}
                  type="button"
                  variant="secondary"
                >
                  {state.isLoading ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      {t("loading", "加载中")}
                    </>
                  ) : (
                    t("token_plan_continue_checkout", "继续结算")
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
