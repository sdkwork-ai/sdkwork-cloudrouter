import type { ApiKey } from '../apiKeyService';
export type QuickImportTargetId = 'birdcoder' | 'cc-switch' | 'deepseek-harness';
/**
 * CC Switch manages providers per app; the import link must carry one of
 * these `app` values — the exact set the CC Switch `v1/import` parser accepts
 * in released builds. `claude-desktop` is deliberately NOT included: the
 * upstream deep link whitelist rejects it (AppType supports Claude Desktop,
 * but the parser does not), so a link with it always fails on released
 * versions. The official Claude Desktop path is to import into `claude`
 * (Claude Code) first, then use the "Import providers from Claude Code"
 * one-click migration in the CC Switch Claude Desktop panel.
 */
export declare const CC_SWITCH_APPS: readonly ["claude", "codex", "gemini", "grokbuild", "opencode", "openclaw", "hermes"];
export type CcSwitchApp = (typeof CC_SWITCH_APPS)[number];
/**
 * Official website of the currently running relay station. Derives from the
 * gateway API base this console is talking to (absolute base → its origin;
 * relative base, e.g. local/standalone deployments → the page origin), so
 * self-hosted relays advertise their own domain instead of a hardcoded
 * product page. Carried as the provider `homepage` in import links (CC Switch
 * shows it on the imported provider card; Birdcoder ignores the parameter).
 */
export declare function resolveRelayHomepage(): string;
export interface QuickImportTarget {
    id: QuickImportTargetId;
    labelKey: string;
    fallbackLabel: string;
    summaryKey: string;
    fallbackSummary: string;
    stepsKey: string;
    fallbackSteps: string;
    configPathKey: string;
    fallbackConfigPath: string;
    fileName: string;
    /**
     * Custom URL protocol scheme the desktop app registers, for example
     * `birdcoder` (birdcoder://) or `ccswitch` (ccswitch://). Import links are
     * built with the CC Switch `v1/import` contract so every target shares the
     * same query semantics.
     */
    scheme: string;
    /** Where to send the user when the app is not detected on this machine. */
    homepageUrl: string;
    /**
     * Whether the user must pick a target app before importing. CC Switch keeps
     * separate provider lists per app; Birdcoder unifies model configuration,
     * so it imports directly without a picker.
     */
    requiresAppSelection: boolean;
    /**
     * Whether import is manual-only. The desktop app registers its own protocol
     * scheme (`scheme`) but does not yet accept the `v1/import` deep-link
     * contract, so the flow skips the protocol probe and goes straight to the
     * manual import dialog (config content + install banner). `scheme` still
     * records the app's protocol for a future hand-off.
     */
    requiresManualImport?: boolean;
}
export declare const QUICK_IMPORT_TARGETS: QuickImportTarget[];
export interface QuickImportResult {
    targetId: QuickImportTargetId;
    keyId: string;
    keyName: string;
    maskedKey: string;
    content: string;
}
export declare function resolveQuickImportTarget(targetId: QuickImportTargetId): QuickImportTarget;
/**
 * Builds the importable config content for a target tool from the plaintext
 * gateway API key. Returns null when the key has no plaintext value (for
 * example keys stored in ciphertext-only mode).
 */
export declare function buildQuickImportResult(key: ApiKey, targetId: QuickImportTargetId): QuickImportResult | null;
/**
 * Optional overrides for the import link: display name and default model.
 * Empty values keep the defaults (key display name / no model).
 */
export interface QuickImportDeepLinkOptions {
    name?: string;
    model?: string;
}
/**
 * Builds the CC Switch compatible `v1/import` deep link for a target tool
 * (`{scheme}://v1/import?resource=provider&app=claude&name=..&endpoint=..&apiKey=..`).
 * Birdcoder registers the same contract under its own `birdcoder://` scheme,
 * so one link format works for both targets. Returns null when the key has no
 * plaintext value.
 *
 * For CC Switch the link additionally carries the usage-query configuration
 * (`usageEnabled` + `usageBaseUrl`/`usageApiKey` pointing at the gateway's own
 * `GET /v1/user/balance` + the matching `usageScript`), so the imported
 * provider shows the Token Bank balance without further configuration.
 *
 * For Birdcoder the link additionally carries the gateway's OpenAI-compatible
 * base URL as `modelsBaseUrl`: Birdcoder queries `GET {modelsBaseUrl}/vendors`
 * with the same API key during import and writes the reachable vendors and
 * their models straight into the channel offerings — no vendor selection in
 * the console needed.
 *
 * Note: the link carries the plaintext gateway key, matching the CC Switch
 * deep link standard; the console only opens it after an explicit user click.
 */
export declare function buildQuickImportDeepLink(key: ApiKey, targetId: QuickImportTargetId, app?: CcSwitchApp, options?: QuickImportDeepLinkOptions): string | null;
/**
 * Fetches the model list the gateway exposes for this API key via the
 * OpenAI-compatible `GET /v1/models` endpoint (Bearer key auth). Different
 * keys can resolve different account groups, so the available models are
 * key-specific. Returns an empty list when the key has no plaintext value or
 * the endpoint is unavailable.
 */
export declare function fetchGatewayModelList(rawKey: string): Promise<string[]>;
export declare function downloadQuickImportContent(result: QuickImportResult): void;
//# sourceMappingURL=quickImport.d.ts.map