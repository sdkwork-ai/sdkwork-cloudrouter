import { useEffect, useMemo } from 'react';
import {
  createSdkworkOrderController,
  SdkworkOrderPage,
} from '@sdkwork/order-pc-order';

export function ConsoleSettlementsView() {
  const controller = useMemo(() => createSdkworkOrderController(), []);

  useEffect(() => {
    void controller.bootstrap();
  }, [controller]);

  return <SdkworkOrderPage controller={controller} />;
}
