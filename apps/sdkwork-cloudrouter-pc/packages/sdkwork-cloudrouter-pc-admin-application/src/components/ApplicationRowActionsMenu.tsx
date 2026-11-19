import { CreditCard, GitBranch, KeyRound, MessageCircle, Settings2, Smartphone } from "lucide-react";
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
  canReadSource,
  messages,
  onAccessToken,
  onIntegration,
  onSource,
}: {
  appKind?: string;
  canReadSource: boolean;
  messages: ApplicationCatalogMessages;
  onAccessToken: () => void;
  onIntegration: (kind: ApplicationIntegrationKind) => void;
  onSource: () => void;
}) {
  const surface = resolveApplicationIntegrationSurface(appKind);
  const showOfficialAccount = surface.channelKinds.includes("official-account");
  const showMiniProgram = surface.channelKinds.includes("mini-program");
  const showPayment = surface.paymentApplies;
  const hasIntegrationActions = showOfficialAccount || showMiniProgram || showPayment;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <Settings2 className="h-3.5 w-3.5" />
          {messages.integrations.actions.config}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {showOfficialAccount ? (
          <DropdownMenuItem onSelect={() => onIntegration("official-account")}>
            <MessageCircle className="h-4 w-4" />
            {messages.integrations.actions.officialAccount}
          </DropdownMenuItem>
        ) : null}
        {showMiniProgram ? (
          <DropdownMenuItem onSelect={() => onIntegration("mini-program")}>
            <Smartphone className="h-4 w-4" />
            {messages.integrations.actions.miniProgram}
          </DropdownMenuItem>
        ) : null}
        {showPayment ? (
          <DropdownMenuItem onSelect={() => onIntegration("payment")}>
            <CreditCard className="h-4 w-4" />
            {messages.integrations.actions.payment}
          </DropdownMenuItem>
        ) : null}
        {hasIntegrationActions ? <DropdownMenuSeparator /> : null}
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
