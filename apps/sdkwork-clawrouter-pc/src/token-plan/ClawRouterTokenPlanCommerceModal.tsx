import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crown, Sparkles, Wallet, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@sdkwork/ui-pc-react";
import type { SdkworkSubscriptionCatalogModalProps } from "@sdkwork/membership-pc-subscription/catalog";
import { SdkworkPointsRechargeDialog } from "@sdkwork/order-pc-recharge";
import { getClawRouterPointsRechargeService } from "@sdkwork/clawroutes-pc-commons/domain-service-providers";
import { useNavigate } from "react-router-dom";

import { useConsoleBusinessNavigation } from "../console-business/consoleBusinessNavigation.ts";
import { navigateTokenPlanProtectedRoute } from "./tokenPlanNavigation.ts";

type TokenPlanCommerceModalVariant = "points-details" | "redeem";

interface ClawRouterTokenPlanCommerceModalProps extends SdkworkSubscriptionCatalogModalProps {
  variant: TokenPlanCommerceModalVariant;
}

const VARIANT_COPY: Record<
  TokenPlanCommerceModalVariant,
  { ctaKey: string; ctaDefault: string; descriptionKey: string; descriptionDefault: string; titleKey: string; titleDefault: string }
> = {
  "points-details": {
    ctaKey: "token_plan_open_wallet",
    ctaDefault: "查看钱包明细",
    descriptionKey: "token_plan_points_details_description",
    descriptionDefault: "在控制台钱包中查看算力积分余额、充值记录与消费明细。",
    titleKey: "token_plan_points_details_title",
    titleDefault: "积分明细",
  },
  redeem: {
    ctaKey: "token_plan_open_wallet_redeem",
    ctaDefault: "前往兑换",
    descriptionKey: "token_plan_redeem_description",
    descriptionDefault: "在控制台钱包中使用兑换码激活会员或领取积分奖励。",
    titleKey: "token_plan_redeem_title",
    titleDefault: "会员兑换",
  },
};

export function createTokenPlanCommerceModal(variant: TokenPlanCommerceModalVariant) {
  return function TokenPlanCommerceModal(props: SdkworkSubscriptionCatalogModalProps) {
    return <ClawRouterTokenPlanCommerceModal {...props} variant={variant} />;
  };
}

export const ClawRouterTokenPlanPointsDetailsModal = createTokenPlanCommerceModal("points-details");
export const ClawRouterTokenPlanRedeemModal = createTokenPlanCommerceModal("redeem");

export function ClawRouterTokenPlanPointsPurchaseModal({
  currentPoints,
  isOpen,
  onClose,
}: SdkworkSubscriptionCatalogModalProps) {
  const { t } = useTranslation();

  return (
    <SdkworkPointsRechargeDialog
      copy={{
        account: t("points_recharge.account", "Claw Router"),
        agreement: t("points_recharge.agreement", "支付前请阅读并同意《算力元充值服务协议》"),
        agreementAccepted: t("points_recharge.agreement_accepted", "您已同意《算力元充值服务协议》"),
        agreementRequired: t("points_recharge.agreement_required", "请先同意算力元充值服务协议"),
        close: t("close", "关闭"),
        completed: t("points_recharge.completed", "支付完成，算力元已到账"),
        confirmPayment: t("points_recharge.confirm_payment", "同意并支付"),
        creatingPayment: t("points_recharge.creating_payment", "正在生成支付二维码..."),
        emptyPackages: t("points_recharge.empty_packages", "暂无可用充值套餐"),
        loadFailed: t("points_recharge.load_failed", "充值套餐加载失败"),
        loadingPackages: t("points_recharge.loading_packages", "正在加载充值套餐..."),
        myPoints: t("points_recharge.my_points", "我的算力元"),
        notice: t(
          "points_recharge.notice",
          "温馨提示：算力元不可兑换会员、不可转赠，也不可提现；充值后有效期以平台规则为准。",
        ),
        paymentUnavailable: t("points_recharge.payment_unavailable", "支付暂不可用"),
        paymentUnavailableDescription: t(
          "points_recharge.payment_unavailable_description",
          "暂时无法生成支付二维码，请稍后重试。",
        ),
        pointsUnit: t("points_recharge.points_unit", "算力元"),
        retry: t("points_recharge.retry", "重新加载"),
        scanPrompt: t("points_recharge.scan_prompt", "请扫码完成支付"),
        title: t("points_recharge.title", "算力元购买"),
      }}
      currentPoints={currentPoints}
      isOpen={isOpen}
      onClose={onClose}
      service={getClawRouterPointsRechargeService()}
    />
  );
}

function ClawRouterTokenPlanCommerceModal({
  isOpen,
  onClose,
  variant,
}: ClawRouterTokenPlanCommerceModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { walletPath } = useConsoleBusinessNavigation();
  const copy = VARIANT_COPY[variant];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  function handleContinue() {
    navigateTokenPlanProtectedRoute(walletPath, navigate);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen ? (
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
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800/60 bg-[#1e1e22] shadow-2xl"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/70 bg-zinc-900/80">
                  {variant === "redeem" ? (
                    <Crown aria-hidden="true" className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Wallet aria-hidden="true" className="h-5 w-5 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Claw Router
                  </div>
                  <h2 className="text-lg font-semibold text-white">{t(copy.titleKey, copy.titleDefault)}</h2>
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

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-7 text-zinc-300">
                {t(copy.descriptionKey, copy.descriptionDefault)}
              </p>

              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
                <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-400" />
                <span>{t("token_plan_console_wallet_hint", "将在控制台钱包中继续处理。")}</span>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={onClose} type="button" variant="ghost">
                  {t("cancel", "取消")}
                </Button>
                <Button onClick={handleContinue} type="button" variant="secondary">
                  {t(copy.ctaKey, copy.ctaDefault)}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
