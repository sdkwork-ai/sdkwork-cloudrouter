# @sdkwork/commerce-pc-host

Commerce PC host embedding package for external applications such as Claw Router.

This package composes `@sdkwork/commerce-pc-*` capability pages with route-prefix navigation so host apps only mount routes and pass a prefix such as `/console`.

It must not own business services, SDK clients, or generated SDK output.

## Usage

```tsx
import {
  SdkworkCommerceHostNavbarActions,
  SdkworkCommerceHostWalletPage,
} from "@sdkwork/commerce-pc-host";

<Route path="wallet" element={<SdkworkCommerceHostWalletPage routePrefix="/console" />} />
<ConsoleLayout navbarAuthenticatedActionsStart={<SdkworkCommerceHostNavbarActions routePrefix="/console" />} />
```
