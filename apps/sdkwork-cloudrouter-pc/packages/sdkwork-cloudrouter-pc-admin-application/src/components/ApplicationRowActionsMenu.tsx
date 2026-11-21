import { CreditCard, GitBranch, KeyRound, MessageCircle, RefreshCw, Settings2, Smartphone, Wrench } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sdkwork/ui-pc-react";

import type { ApplicationCatalogMessages } from "../i18n";
import { resolveApplicationIntegrationSurface } from "../services/application-integration-requirements";
import type { ApplicationIntegrationKind } from "../types/application-integrations";

/**
 * One configuration entry for every application row.
 *
 * Official-account / mini-program / payment configuration used to be three
 * separate row buttons, which crowded the table and made the official-account
 * action easy to miss. The menu keeps the configuration discoverable and leaves
 * room for the application name, and it only offers the bindings the row's
 * application kind can actually use (an iOS app has no official account, an API
 * service has no channel at all).
 */
export function ApplicationRowActionsMenu({
  appKind,
  canCorrectKind = false,
  canProvisionIdentity,
  canReadSource,
  identityStatus,
  messages,
  onAccessToken,
  onCorrectKind,
  onIntegration,
  onRetryIdentity,
  onSource,
}: {
  appKind?: string;
  canCorrectKind?: boolean;
  canProvisionIdentity: boolean;
  canReadSource: boolean;
  identityStatus?: string;
  messages: ApplicationCatalogMessages;
  onAccessToken: () => void;
  onCorrectKind?: () => void;
  onIntegration: (kind: ApplicationIntegrationKind) => void;
  onRetryIdentity: () => void;
  onSource: () => void;
}) {
  const surface = resolveApplicationIntegrationSurface(appKind);
  const showOfficialAccount = surface.channelKinds.includes("official-account");
  const showMiniProgram = surface.channelKinds.includes("mini-program");
  const showPayment = surface.paymentApplies;
  const hasIntegrationActions = showOfficialAccount || showMiniProgram || showPayment;
  // A mini program surface owns its channel account as the primary setting, so
  // the mini program entry leads the menu; a web surface leads with its official
  // account. The order is the only difference, never availability.
  const miniProgramFirst = surface.autoLogin === "mini-program";
  const showIdentityRetry = canProvisionIdentity
    && identityStatus !== undefined
    && identityStatus !== "active";
  const officialAccountItem = showOfficialAccount ? (
    <DropdownMenuItem
      data-application-integration-action="official-account"
      onSelect={() => onIntegration("official-account")}
    >
      <MessageCircle className="h-4 w-4" />
      {messages.integrations.actions.officialAccount}
    </DropdownMenuItem>
  ) : null;
  const miniProgramItem = showMiniProgram ? (
    <DropdownMenuItem
      data-application-integration-action="mini-program"
      onSelect={() => onIntegration("mini-program")}
    >
      <Smartphone className="h-4 w-4" />
      {messages.integrations.actions.miniProgram}
    </DropdownMenuItem>
  ) : null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <Settings2 className="h-3.5 w-3.5" />
          {messages.integrations.actions.config}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {miniProgramFirst ? miniProgramItem : officialAccountItem}
        {miniProgramFirst ? officialAccountItem : miniProgramItem}
        {showPayment ? (
          <DropdownMenuItem
            data-application-integration-action="payment"
            onSelect={() => onIntegration("payment")}
          >
            <CreditCard className="h-4 w-4" />
            {messages.integrations.actions.payment}
          </DropdownMenuItem>
        ) : null}
        {showIdentityRetry ? (
          <DropdownMenuItem onSelect={onRetryIdentity}>
            <RefreshCw className="h-4 w-4" />
            {messages.identity.retryAction}
          </DropdownMenuItem>
        ) : null}
        {canCorrectKind ? (
          <DropdownMenuItem
            data-deploy-app-kind-correct="true"
            onSelect={() => onCorrectKind?.()}
          >
            <Wrench className="h-4 w-4" />
            {messages.kindCorrection.action}
          </DropdownMenuItem>
        ) : null}
        {hasIntegrationActions || showIdentityRetry || canCorrectKind ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onSelect={onAccessToken}>
          <KeyRound className="h-4 w-4" />
          {messages.accessToken.action}
        </DropdownMenuItem>
        {canReadSource ? (
          <DropdownMenuItem onSelect={onSource}>
            <GitBranch className="h-4 w-4" />
            {messages.sourceRemix.action}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
