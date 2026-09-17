# scripts/

HarmonyOS build/release helper scripts belong here once the DevEco toolchain
is available. Static checks currently run from the repository root:

```bash
node ../sdkwork-specs/tools/check-apps-directory-index.mjs --root .
node ../sdkwork-specs/tools/check-frontend-composition.mjs --root .
node --test apps/sdkwork-cloudrouter-harmony-mobile/tests/harmony-surface-contract.test.mjs
```

There is deliberately no `check:harmony-native` script: no HarmonyOS build
command can run until the DevEco Studio / HarmonyOS SDK toolchain and an ArkTS
app SDK target exist, and a script that cannot execute would be a false signal.
