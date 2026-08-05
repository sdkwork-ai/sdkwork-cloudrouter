/**
 * Registers the cloud router session-authenticated base-data SDK client as
 * the shared client factory for the sdkwork-appbase base-data selects.
 *
 * Imported from the commons index so every admin package that consumes
 * commons gets the registration without any explicit wiring.
 */

import { configureSdkworkBaseDataPcReact } from '@sdkwork/appbase-pc-react';
import { getSdkworkBaseDataBackendSdkClient } from './sdk-clients';

configureSdkworkBaseDataPcReact({
  createClient: () => getSdkworkBaseDataBackendSdkClient(),
});
