import type { ApiKey } from '../apiKeyService';
import { resolveCurrentGatewayEndpoints } from '../usage-details/toolProfiles';

export type QuickImportTargetId = 'birdcoder' | 'cc-switch';

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
  },
  {
    id: 'cc-switch',
    labelKey: 'console.apiKeys.quickImport.ccSwitch',
    fallbackLabel: 'Import to CC Switch',
    summaryKey: 'console.apiKeys.quickImport.ccSwitchSummary',
    fallbackSummary:
      'Claude Code provider env config for CC Switch. Save it as ~/.claude/settings.json, then use "Import current config" in CC Switch to make Claw Router the active provider.',
    stepsKey: 'console.apiKeys.quickImport.ccSwitchSteps',
    fallbackSteps: [
      'Download or copy the config content.',
      'Save it as ~/.claude/settings.json.',
      'In CC Switch, click "Import current config" (or switch provider) to activate Claw Router.',
    ].join('\n'),
    configPathKey: 'console.apiKeys.quickImport.ccSwitchConfigPath',
    fallbackConfigPath: '~/.claude/settings.json',
    fileName: 'cc-switch-claude-settings.json',
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
        ANTHROPIC_BASE_URL: anthropicBaseUrl,
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
