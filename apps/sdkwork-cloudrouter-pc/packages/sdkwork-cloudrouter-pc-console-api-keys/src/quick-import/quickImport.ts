import type { ApiKey } from '../apiKeyService';
import { resolveCurrentGatewayEndpoints } from '../usage-details/toolProfiles';

export type QuickImportTargetId = 'birdcoder' | 'cc-switch';

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
export const CC_SWITCH_APPS = [
  'claude',
  'codex',
  'gemini',
  'grokbuild',
  'opencode',
  'openclaw',
  'hermes',
] as const;

export type CcSwitchApp = (typeof CC_SWITCH_APPS)[number];

/**
 * Official website of the currently running relay station. Derives from the
 * gateway API base this console is talking to (absolute base → its origin;
 * relative base, e.g. local/standalone deployments → the page origin), so
 * self-hosted relays advertise their own domain instead of a hardcoded
 * product page. Carried as the provider `homepage` in import links (CC Switch
 * shows it on the imported provider card; Birdcoder ignores the parameter).
 */
export function resolveRelayHomepage(): string {
  const { openAiBaseUrl } = resolveCurrentGatewayEndpoints();
  try {
    return new URL(toAbsoluteGatewayUrl(openAiBaseUrl)).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}

/**
 * Usage-query script shipped inside the CC Switch import link (Base64 in the
 * `usageScript` param). It follows the CC Switch "通用模板" contract
 * (`{{baseUrl}}/user/balance` + `extractor(response)`) against the gateway's
 * own `GET /v1/user/balance` endpoint, which returns the key owner's Token
 * Bank balance, so CC Switch shows the balance without any script editing.
 */
const CC_SWITCH_RELAY_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/user/balance",
    method: "GET",
    headers: {
      "Authorization": "Bearer {{apiKey}}",
      "User-Agent": "cc-switch/1.0"
    }
  },
  extractor: function(response) {
    return {
      isValid: response.object === "balance",
      remaining: Number(response.balance),
      unit: response.unit || "TOKEN_BANK"
    };
  }
})`;

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
}

export const QUICK_IMPORT_TARGETS: QuickImportTarget[] = [
  {
    id: 'birdcoder',
    labelKey: 'console.apiKeys.quickImport.birdcoder',
    fallbackLabel: 'Import to Birdcoder',
    summaryKey: 'console.apiKeys.quickImport.birdcoderSummary',
    fallbackSummary:
      'Claude Code compatible env config for Birdcoder managed model channels. Birdcoder reads it as its Claude Code adapter configuration.',
    stepsKey: 'console.apiKeys.quickImport.birdcoderSteps',
    fallbackSteps: [
      'Download or copy the config content.',
      'Save it as ~/.claude/settings.json.',
      'Restart Birdcoder (or add a relay channel in Settings → Model Access) so it uses the gateway key.',
    ].join('\n'),
    configPathKey: 'console.apiKeys.quickImport.birdcoderConfigPath',
    fallbackConfigPath: '~/.claude/settings.json',
    fileName: 'birdcoder-claude-settings.json',
    scheme: 'birdcoder',
    homepageUrl: 'https://sdkwork.com/apps/sdkwork-birdcoder',
    requiresAppSelection: false,
  },
  {
    id: 'cc-switch',
    labelKey: 'console.apiKeys.quickImport.ccSwitch',
    fallbackLabel: 'Import to CC Switch',
    summaryKey: 'console.apiKeys.quickImport.ccSwitchSummary',
    fallbackSummary:
      'Claude Code provider env config for CC Switch. Save it as ~/.claude/settings.json, then use "Import current config" in CC Switch to make Cloud Router the active provider.',
    stepsKey: 'console.apiKeys.quickImport.ccSwitchSteps',
    fallbackSteps: [
      'Download or copy the config content.',
      'Save it as ~/.claude/settings.json.',
      'In CC Switch, click "Import current config" (or switch provider) to activate Cloud Router.',
    ].join('\n'),
    configPathKey: 'console.apiKeys.quickImport.ccSwitchConfigPath',
    fallbackConfigPath: '~/.claude/settings.json',
    fileName: 'cc-switch-claude-settings.json',
    scheme: 'ccswitch',
    homepageUrl: 'https://github.com/farion1231/cc-switch/releases',
    requiresAppSelection: true,
  },
];

export interface QuickImportResult {
  targetId: QuickImportTargetId;
  keyId: string;
  keyName: string;
  maskedKey: string;
  content: string;
}

export function resolveQuickImportTarget(targetId: QuickImportTargetId): QuickImportTarget {
  return QUICK_IMPORT_TARGETS.find((target) => target.id === targetId) ?? QUICK_IMPORT_TARGETS[0]!;
}

/**
 * Builds the importable config content for a target tool from the plaintext
 * gateway API key. Returns null when the key has no plaintext value (for
 * example keys stored in ciphertext-only mode).
 */
export function buildQuickImportResult(key: ApiKey, targetId: QuickImportTargetId): QuickImportResult | null {
  if (!key.rawKey) {
    return null;
  }
  const { anthropicBaseUrl } = resolveCurrentGatewayEndpoints();
  const content = JSON.stringify(
    {
      env: {
        // Absolute URL: relative bases (local/standalone dev) are unusable
        // both inside the deeplink (CC Switch URL validation) and as Claude
        // Code environment variables.
        ANTHROPIC_BASE_URL: toAbsoluteGatewayUrl(anthropicBaseUrl),
        ANTHROPIC_AUTH_TOKEN: key.rawKey,
        ...(targetId === 'birdcoder' ? { SDKWORK_MANAGED: 'true' } : {}),
      },
    },
    null,
    2,
  );
  return {
    targetId,
    keyId: key.id,
    keyName: key.displayName,
    maskedKey: key.maskedKey,
    content,
  };
}

/**
 * CC Switch validates `endpoint` as an absolute URL (`url::Url::parse`) and
 * rejects relative paths. The console's API base can be relative in local /
 * standalone deployments, so resolve it against the page origin before it
 * goes into the deep link.
 */
function toAbsoluteGatewayUrl(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

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
 * Note: the link carries the plaintext gateway key, matching the CC Switch
 * deep link standard; the console only opens it after an explicit user click.
 */
export function buildQuickImportDeepLink(
  key: ApiKey,
  targetId: QuickImportTargetId,
  app: CcSwitchApp = 'claude',
  options: QuickImportDeepLinkOptions = {},
): string | null {
  if (!key.rawKey) {
    return null;
  }
  const target = resolveQuickImportTarget(targetId);
  const { anthropicBaseUrl, openAiBaseUrl } = resolveCurrentGatewayEndpoints();
  const endpoint = toAbsoluteGatewayUrl(anthropicBaseUrl);
  const homepage = resolveRelayHomepage();
  const name = options.name?.trim() || key.displayName.trim() || 'Cloud Router';
  const model = options.model?.trim();
  const params = new URLSearchParams({
    resource: 'provider',
    app,
    name,
    endpoint,
    apiKey: key.rawKey,
    enabled: 'true',
  });
  if (model) {
    // CC Switch maps `model` to the provider's default model (ANTHROPIC_MODEL
    // for Claude).
    params.set('model', model);
  }
  if (homepage) {
    params.set('homepage', homepage);
  }
  if (targetId === 'cc-switch') {
    // The relay answers balance queries itself; the script below is the CC
    // Switch "通用模板" shape against `{baseUrl}/user/balance`, where
    // baseUrl is the gateway's OpenAI-compatible base (`{host}/v1`).
    params.set('usageEnabled', 'true');
    params.set('usageBaseUrl', toAbsoluteGatewayUrl(openAiBaseUrl));
    params.set('usageApiKey', key.rawKey);
    params.set('usageAutoInterval', '60');
    params.set('usageScript', btoa(CC_SWITCH_RELAY_USAGE_SCRIPT));
  }
  const link = `${target.scheme}://v1/import?${params.toString()}`;
  // Debugging aid: log the link with secrets masked, so the endpoint /
  // usageBaseUrl / usageScript actually shipped can be checked against CC
  // Switch without leaking the gateway key into the browser console.
  console.log(
    `[quick-import] ${target.id} deep link (apiKey/usageApiKey masked):`,
    maskDeepLinkSecrets(link),
  );
  return link;
}

/** Masks `apiKey` / `usageApiKey` / `usageAccessToken` query values for logs. */
function maskDeepLinkSecrets(link: string): string {
  return link.replace(/([?&](?:apiKey|usageApiKey|usageAccessToken)=)[^&]*/g, '$1***');
}

/**
 * Fetches the model list the gateway exposes for this API key via the
 * OpenAI-compatible `GET /v1/models` endpoint (Bearer key auth). Different
 * keys can resolve different account groups, so the available models are
 * key-specific. Returns an empty list when the key has no plaintext value or
 * the endpoint is unavailable.
 */
export async function fetchGatewayModelList(rawKey: string): Promise<string[]> {
  if (!rawKey) {
    return [];
  }
  const { openAiBaseUrl } = resolveCurrentGatewayEndpoints();
  try {
    const response = await fetch(`${toAbsoluteGatewayUrl(openAiBaseUrl)}/models`, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    if (!response.ok) {
      return [];
    }
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
      return [];
    }
    const data = (payload as { data?: unknown }).data;
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((item) => (
        typeof item === 'object' && item !== null && 'id' in item
          ? String((item as { id: unknown }).id)
          : ''
      ))
      .filter((id) => id.length > 0);
  } catch {
    return [];
  }
}

export function downloadQuickImportContent(result: QuickImportResult): void {
  const target = resolveQuickImportTarget(result.targetId);
  const blob = new Blob([result.content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = target.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
