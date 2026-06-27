import {
  createEmptySdkworkEntitlementDashboard,
  createSdkworkStarterEntitlementCatalog,
  evaluateSdkworkEntitlementDecision,
  selectTopSdkworkEntitlementAction,
  sortSdkworkEntitlementDecisions,
  summarizeSdkworkEntitlementDecisions,
  type CreateSdkworkEntitlementEvaluationOptions,
  type SdkworkEntitlementDashboardData,
  type SdkworkEntitlementDescriptor,
} from "./entitlement";
import {
  createSdkworkEntitlementMessages,
  type SdkworkEntitlementMessagesOverrides,
} from "./entitlement-copy";

export interface SdkworkOfferDashboardData {
  featuredOffers: Array<unknown>;
  inventory: {
    currentLevelName?: string | null;
  };
}

export interface SdkworkPointsDashboardData {
  summary: {
    balancePoints: number;
  };
}

export interface SdkworkSubscriptionDashboardData {
  plans: Array<unknown>;
}

export interface SdkworkMembershipDashboardData {
  summary: {
    currentLevelName?: string | null;
    currentLevelValue: number | null;
    remainingDays?: number | null;
  };
}

export interface SdkworkWalletOverview {
  isAuthenticated: boolean;
}

export interface SdkworkOfferService {
  getDashboard(): Promise<SdkworkOfferDashboardData>;
}

export interface SdkworkPointsService {
  getDashboard(): Promise<SdkworkPointsDashboardData>;
}

export interface SdkworkSubscriptionService {
  getDashboard(): Promise<SdkworkSubscriptionDashboardData>;
}

export interface SdkworkMembershipService {
  getDashboard(): Promise<SdkworkMembershipDashboardData>;
}

export interface SdkworkWalletService {
  getOverview(): Promise<SdkworkWalletOverview>;
}

export interface SdkworkEntitlementDashboardSources {
  descriptors: readonly SdkworkEntitlementDescriptor[];
  offerDashboard: SdkworkOfferDashboardData;
  pointsDashboard: SdkworkPointsDashboardData;
  subscriptionDashboard: SdkworkSubscriptionDashboardData;
  membershipDashboard: SdkworkMembershipDashboardData;
  walletOverview: SdkworkWalletOverview;
}

export interface CreateSdkworkEntitlementServiceOptions {
  descriptors?: readonly SdkworkEntitlementDescriptor[];
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
  offerService?: Pick<SdkworkOfferService, "getDashboard">;
  pointsService?: Pick<SdkworkPointsService, "getDashboard">;
  subscriptionService?: Pick<SdkworkSubscriptionService, "getDashboard">;
  membershipService?: Pick<SdkworkMembershipService, "getDashboard">;
  walletService?: Pick<SdkworkWalletService, "getOverview">;
}

export interface SdkworkEntitlementService {
  getDashboard(): Promise<SdkworkEntitlementDashboardData>;
  getEmptyDashboard(): SdkworkEntitlementDashboardData;
}

function createDefaultWalletService(): SdkworkWalletService {
  return {
    async getOverview() {
      return {
        isAuthenticated: false,
      };
    },
  };
}

function createDefaultMembershipService(): SdkworkMembershipService {
  return {
    async getDashboard() {
      return {
        summary: {
          currentLevelName: "Guest",
          currentLevelValue: null,
          remainingDays: null,
        },
      };
    },
  };
}

function createDefaultPointsService(): SdkworkPointsService {
  return {
    async getDashboard() {
      return {
        summary: {
          balancePoints: 0,
        },
      };
    },
  };
}

function createDefaultOfferService(): SdkworkOfferService {
  return {
    async getDashboard() {
      return {
        featuredOffers: [],
        inventory: {
          currentLevelName: "Guest",
        },
      };
    },
  };
}

function createDefaultSubscriptionService(): SdkworkSubscriptionService {
  return {
    async getDashboard() {
      return {
        plans: [],
      };
    },
  };
}

function resolveCurrentLevelName(
  sources: Pick<SdkworkEntitlementDashboardSources, "offerDashboard" | "membershipDashboard">,
  guestLabel: string,
): string {
  return sources.membershipDashboard.summary.currentLevelName
    || sources.offerDashboard.inventory.currentLevelName
    || guestLabel;
}

export function composeSdkworkEntitlementDashboard(
  sources: SdkworkEntitlementDashboardSources,
  options: Pick<CreateSdkworkEntitlementServiceOptions, "locale" | "messages"> = {},
): SdkworkEntitlementDashboardData {
  const copy = createSdkworkEntitlementMessages(options.locale, options.messages);
  const evaluationOptions: CreateSdkworkEntitlementEvaluationOptions = {
    locale: options.locale,
    messages: options.messages,
  };
  const availablePoints = sources.pointsDashboard.summary.balancePoints;
  const currentLevelValue = sources.membershipDashboard.summary.currentLevelValue;
  const decisions = sortSdkworkEntitlementDecisions(
    sources.descriptors.map((descriptor) =>
      evaluateSdkworkEntitlementDecision(descriptor, {
        availablePoints,
        currentLevelValue,
        isAuthenticated: sources.walletOverview.isAuthenticated,
      }, evaluationOptions),
    ),
  );

  return {
    decisions,
    digest: summarizeSdkworkEntitlementDecisions(decisions),
    inventory: {
      availablePoints,
      currentLevelName: resolveCurrentLevelName(sources, copy.service.guestLabel),
      currentLevelValue,
      featuredOfferCount: sources.offerDashboard.featuredOffers.length,
      isAuthenticated: sources.walletOverview.isAuthenticated,
      subscriptionPlanCount: sources.subscriptionDashboard.plans.length,
      membershipRemainingDays: sources.membershipDashboard.summary.remainingDays ?? null,
    },
    topAction: selectTopSdkworkEntitlementAction(decisions),
  };
}

export function createSdkworkEntitlementService(
  options: CreateSdkworkEntitlementServiceOptions = {},
): SdkworkEntitlementService {
  const walletService = options.walletService ?? createDefaultWalletService();
  const membershipService = options.membershipService ?? createDefaultMembershipService();
  const pointsService = options.pointsService ?? createDefaultPointsService();
  const offerService = options.offerService ?? createDefaultOfferService();
  const subscriptionService = options.subscriptionService ?? createDefaultSubscriptionService();
  const descriptors = options.descriptors ?? createSdkworkStarterEntitlementCatalog();
  const serviceOptions = {
    locale: options.locale,
    messages: options.messages,
  };
  const copy = createSdkworkEntitlementMessages(options.locale, options.messages);

  return {
    async getDashboard() {
      const walletOverview = await walletService.getOverview();
      if (!walletOverview.isAuthenticated) {
        const guestDecisions = sortSdkworkEntitlementDecisions(
          descriptors.map((descriptor) =>
            evaluateSdkworkEntitlementDecision(descriptor, {
              availablePoints: 0,
              currentLevelValue: null,
              isAuthenticated: false,
            }, serviceOptions),
          ),
        );

        return {
          ...createEmptySdkworkEntitlementDashboard(serviceOptions),
          decisions: guestDecisions,
          digest: summarizeSdkworkEntitlementDecisions(guestDecisions),
          inventory: {
            ...createEmptySdkworkEntitlementDashboard(serviceOptions).inventory,
            currentLevelName: copy.service.guestLabel,
          },
          topAction: selectTopSdkworkEntitlementAction(guestDecisions),
        };
      }

      const [membershipDashboard, pointsDashboard, offerDashboard, subscriptionDashboard] = await Promise.all([
        membershipService.getDashboard(),
        pointsService.getDashboard(),
        offerService.getDashboard(),
        subscriptionService.getDashboard(),
      ]);

      return composeSdkworkEntitlementDashboard({
        descriptors,
        offerDashboard,
        pointsDashboard,
        subscriptionDashboard,
        membershipDashboard,
        walletOverview,
      }, serviceOptions);
    },

    getEmptyDashboard() {
      return createEmptySdkworkEntitlementDashboard(serviceOptions);
    },
  };
}

export const sdkworkEntitlementService = createSdkworkEntitlementService();
