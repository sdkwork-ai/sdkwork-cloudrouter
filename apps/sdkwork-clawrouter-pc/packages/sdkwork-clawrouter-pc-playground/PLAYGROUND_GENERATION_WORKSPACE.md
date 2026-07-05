# Playground integration with sdkwork-generations

Playground UI shell lives in `@sdkwork/generations-pc-playground` (`sdkwork-generations` repo). ClawRouter integrates it through a thin host adapter.

## Architecture

```
@sdkwork/clawrouter-pc-playground (host adapter)
  └─ Playground.tsx → PlaygroundPage + PlaygroundHostPort
       └─ @sdkwork/generations-pc-playground/react
            ├─ PlaygroundPage.tsx (routing, preview modal, history orchestration)
            ├─ components/views/*View.tsx (modality adapters + empty states)
            └─ PlaygroundHostPort (fetch history/models, run generation, clipboard)
                 ↑ implemented by clawrouter PlaygroundService + clawroutes-pc-commons

Generation workspace (domain-owned panels):
  @sdkwork/generations-pc-workspace/generation-playground-workspace
    ├─ DomainGenerationWorkspaceView (history + sidebar shell)
    └─ DomainGenerationWorkspaceSidebar (modality accent classes)

  @sdkwork/generations-pc-studio/react
    ├─ SdkworkGenerationModePopupBase
    ├─ SdkworkStudioGenerationBottomBar
    └─ formatGenerationCreditPoints (@sdkwork/utils)

  @sdkwork/{image|video|music|audio}-pc-generation/react
    └─ *GenerationPanel (modality studio UI)
```

## Studio UI theming

All generation modalities share a **borderless flat** studio design under `.theme-aware-dark-surface`:

| CSS namespace | Used by |
| --- | --- |
| `--sdkwork-studio-*` | Canonical surface/text/control tokens (all modalities + chat composer) |
| `sdkwork-image-generation-*` | Image panel class aliases (reference tabs, prompt, settings popup) |
| `sdkwork-studio-*` | Video, music, audio panels + shared bottom bar |
| `sdkwork-sfx-generation-*` | SFX panel (extends studio tokens) |
| `sdkwork-segmented-*` | Reference/history tabs (dark + light via CSS vars) |
| `sdkwork-playground-chat-*` | Chat page, composer, bubbles, markdown, code blocks, agent input, empty/error states |
| `sdkwork-model-picker-*` | Shared model picker menu + trigger (`@sdkwork/models-pc-picker`) |
| `sdkwork-generation-mode-*` | Image/video settings bar, popup, toggles, sliders |
| `sdkwork-playground-preview-*` | Preview modal panel, text output, metadata sidebar, filter bar |
| `sdkwork-playground-workspace-sidebar--{image,video,music,audio,sfx}` | Per-modality accent on sidebar |

Theme tokens are defined in `apps/sdkwork-clawrouter-pc/src/index.css` on `.theme-aware-dark-surface` with `html:not(.dark)` overrides.

## Shared components (DRY)

| Component | Package | Consumers |
| --- | --- | --- |
| `SdkworkGenerationModePopupBase` | `@sdkwork/generations-pc-studio` | Image + video settings bar |
| `SdkworkStudioGenerationBottomBar` | `@sdkwork/generations-pc-studio` | Music, audio, SFX bottom bars |
| `formatGenerationCreditPoints` | `@sdkwork/generations-pc-studio` (`@sdkwork/utils`) | All credit displays |
| `buildMusicGenerationPrompt` | `@sdkwork/music-pc-generation` | Suno-style style tags + instrumental prefix |
| `PlaygroundModalityEmptyState` | `@sdkwork/generations-pc-playground` | All modality history empty states |
| `DomainGenerationWorkspaceView` | `@sdkwork/generations-pc-workspace` | All modality views |
| Generation asset config | `@sdkwork/generations-pc-asset-config` | Workspace + all `*-pc-generation` packages (re-export only) |

## Ownership

| Layer | Package | Repo |
| --- | --- | --- |
| Playground UI shell | `@sdkwork/generations-pc-playground` | sdkwork-generations |
| Generation studio UI | `@sdkwork/generations-pc-studio` | sdkwork-generations |
| Generation history/types | `@sdkwork/generations-pc-workspace` | sdkwork-generations |
| Modality generation panels | `@sdkwork/{image,video,music,audio}-pc-generation` | respective domain repos |
| Model picker | `@sdkwork/models-pc-picker` | sdkwork-models |
| ClawRouter runtime adapter | `@sdkwork/clawrouter-pc-playground` | sdkwork-clawrouter |
| Theme CSS (studio tokens) | `apps/sdkwork-clawrouter-pc/src/index.css` | sdkwork-clawrouter |
| Chat (theme-aware CSS vars) | `clawrouter-pc-playground/components/chat/*` + `@sdkwork/generations-pc-playground` markdown/preview + `index.css` | clawrouter + sdkwork-generations |

Chat and preview markdown use the same flat, borderless token model as generation studio (`sdkwork-playground-chat-*` and `sdkwork-playground-preview-*` classes). Submit actions reuse `--sdkwork-studio-accent` for visual consistency with generation panels.

## Verification

```bash
python -m unittest tests.test_playground_runtime_standard.PlaygroundRuntimeStandardTest.test_playground_ui_shell_is_owned_by_generations_pc_playground -v
python -m unittest tests.test_playground_runtime_standard.PlaygroundRuntimeStandardTest.test_playground_media_generation_uses_fixed_bottom_credit_action_bar -v
python -m unittest tests.test_playground_runtime_standard.PlaygroundRuntimeStandardTest.test_shared_model_picker_migration_is_complete -v
python -m unittest tests.test_playground_runtime_standard.PlaygroundRuntimeStandardTest.test_playground_chat_controls_are_stable_and_polished -v
```

From `apps/sdkwork-clawrouter-pc`:

```bash
node playground-generation-studio-alignment.test.mjs
pnpm exec tsx playground-chat-runtime.test.ts
pnpm --filter @sdkwork/generations-pc-studio test
pnpm --filter @sdkwork/music-pc-generation test
node --import tsx --test commons-runtime.test.ts
```
