import { configurePartnerJoinAppClientFactory, PartnerJoin } from '@sdkwork/partner-pc-join';
import { getSdkworkPartnerAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

// Bind the partner join pages to the Cloud Router portal session-auth app
// SDK client (token manager, base URL, locale propagation, 401 redirect
// handling). Standalone partner shells keep the built-in factory defaults.
configurePartnerJoinAppClientFactory(() => getSdkworkPartnerAppSdkClient());

export function PartnerJoinLanding() {
  return <PartnerJoin sectionId="landing" />;
}

export function PartnerJoinApply() {
  return <PartnerJoin sectionId="apply" />;
}

export function PartnerJoinStatus() {
  return <PartnerJoin sectionId="status" />;
}
