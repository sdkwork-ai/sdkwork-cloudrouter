# sdkwork-cloudrouter-harmony-mobile-shell

App shell, page stack assembly, and AuthGate integration for the SDKWork Cloud
Router HarmonyOS root.

Layer role `frontend-shell`: route guards and navigation containers live here.
Capability packages contribute route metadata and screens; they do not own the
navigation container or authentication decisions.
