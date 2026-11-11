# SDK 重新生成与消费方迁移（2026-11-11）

## 1. 为什么之前生成不出来

`@sdkwork/sdk-generator`（1.0.14）在 `framework/external-protocol.ts` 里**无条件**剔除
`x-sdkwork-wire-protocol: external` 的 operation，而本仓 open-api 的 218 个 operation
全部带该标记（API_SPEC §4.5.2）——因此按原样生成会得到 `models: 0, apis: 0`。

注意：`sdks/cloudrouter-open-sdk/bin/generate-sdk.mjs` 是生成器脚手架产出的文件，
手工改动会在下一次生成时被覆盖，所以修复必须落在**生成链的权威环节**。

## 2. 本轮修复（一处、可复现）

`tools/cloudrouter_sdk_runtime_standardizer.py` 的 `_derive_sdkgen_openapi()` 现在在派生
sdkgen（`openapi/cloudrouter-open-sdk.sdkgen.json`）时调用
`_strip_external_protocol_markers()`：

- **权威契约**（`openapi/cloudrouter-open-sdk.openapi.json`、`apps/.../public/openapi.json`、
  `apis/.../openapi.json`）继续保留 external 标记，供契约/一致性/计费审计使用；
- **派生生成输入**（sdkgen）去掉两个标记，语义就是"给生成器的输入"，
  这样生成器不再把整份文档判为 external 而清空。

于是仓库自带的 `node sdks/cloudrouter-open-sdk/bin/generate-sdk.mjs --all` 无需任何
修改即可生成全部 9 种语言。

## 3. 生成结果（`--all`）

| 语言 | 文件 | Models | APIs |
| --- | ---: | ---: | ---: |
| typescript | 506 | — | — |
| rust | 493 | 410 | 65 |
| java | 488 | 410 | 65 |
| csharp | 488 | 410 | 65 |
| kotlin | 489 | 410 | 65 |
| go | 501 | 418 | 65 |
| python | 492 | 410 | 65 |
| swift | 79 | 410 | 65 |
| flutter | — | 410 | 65 |

验证：

| 检查 | 结果 |
| --- | --- |
| Rust `cargo check` | 通过 |
| Rust `cargo test` | 通过（0 tests） |
| TypeScript `node custom/build-runtime.mjs` | exit 0，产出 `dist/` |
| C# `dotnet build` | **0 errors**（608 个 nullable 警告） |
| Java `mvn compile` | **0 errors**：先修好 `sdkwork-sdk-common-java` 的 pom（`maven.compiler.source/target` 11→17，源码用了 record），`mvn install` 后再编译 Java SDK |
| Python `python -m compileall` | 通过 |
| PC 应用 `pnpm typecheck`（消费 `@sdkwork/cloudrouter-open-sdk`） | 通过 |
| H5 应用 `pnpm typecheck` | 通过 |
| Rust `cargo check` / `cargo test` | 通过 |
| TypeScript `node custom/build-runtime.mjs` | exit 0，产出 `dist/` |
| Go `go build` | **失败（生成器缺陷）**，详见下节 |
| Kotlin | 本机无 gradle |
| Swift / Flutter | 本机无 swift/dart Flutter SDK；Flutter 依赖已发布的 `sdkwork_common_flutter` |

另：`apps/sdkwork-cloudrouter-pc` 的 `vite-config-runtime.test.ts` 有一批**既有失败**
（`package.json` 的 dev 脚本与测试期望不一致，HEAD 已如此，与本次 SDK 再生无关）。

### Go SDK 的两个生成器缺陷

1. `http/client.go` 导入 `github.com/sdkwork/sdk-common-go/common`，但该模块的
   `common/` 目录只有子包（`common/core` 才是 `package common` 并定义 `SdkConfig`）。
2. 即使把导入改成 `.../common/core`，编译仍在 `http/client.go:536` 报
   `no new variables on left side of :=`：函数参数已有 `contentType`，生成器又用
   `contentType := resp.Header.Get(...)` 重复声明。

两处都属 `@sdkwork/sdk-generator` 1.0.14 的 Go 模板问题，本仓无法修复。

## 4. 消费方迁移（因契约字段变化导致的编译中断）

### `sdkwork-generations`（`crates/sdkwork-generations-provider-adapter`）

- `OpenAiImageEditRequest.image` → `images: Vec<OpenAiImageReferenceInput>`；
- `OpenAiImageGenerationRequest` 补默认值、`model: String`；
- Vidu 删除 `style`/`aspect_ratio`/`movement_amplitude`，模板保留 `video_urls`；
- Ark `content` 改用 `image_url{url}` + `role`，任务查询用 `content/id/status`；
- 移除 `OpenAiSpeechCreateRequest.metadata`、修正 ElevenLabs 类型；
- `audio_suno` → `music_suno`，MiniMax 音乐 → `music_minimax`，
  `vidu_create_template` 返回 `ViduTemplateTask`。

`cargo test -p sdkwork-generations-provider-adapter`：**53 + 1 passed**。

### `sdkwork-agents`

- `tool-image`：Midjourney / Nano-Banana 契约面已不存在，改为 `CapabilityMissing`；
  OpenAI 图片编辑用 `images`；Vidu 图片去 `style`。
- `tool-audio`：语音去 `metadata`；声音创建改用 `{type,name,prompt,script_hint,model}`。
- `tool-music`：`audio_suno` → `music_suno`。
- `tool-video`：OpenAI 视频四操作、Vidu 字段、Ark content、任务查询全部按新契约。

`cargo test`：image 12、audio 13、music 8、video 12 全部通过；`tool-cloudrouter` /
`tool-intelligence` / `tool-file` 编译通过。

## 5. 契约侧伴随修正

恢复 Vidu 场景模板的 `video_urls`（motion-control 模板需要驱动视频），
否则 `sdkwork-generations` 的动作同步会丢失参考视频。

## 6. 本轮验证命令与结果

```bash
# 契约
python -B -m tools.cloudrouter_gateway_openapi_generator --check          # current
python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator    # 94 tests OK
node scripts/materialize-apis-contracts.mjs --check                       # passed
python -B -m tools.cloudrouter_openapi_contract_audit                     # passed
python -B -m tools.cloudrouter_openapi_precision_audit                    # passed
node tools/check-cloudrouter-ai-routing-consistency.mjs --root .          # passed

# SDK 再生
node sdks/cloudrouter-open-sdk/bin/generate-sdk.mjs --all                 # 9 languages, 65 APIs each
(cd sdks/.../cloudrouter-open-sdk-rust/generated/server-openapi && cargo check && cargo test)
(cd sdks/.../cloudrouter-open-sdk-typescript && node custom/build-runtime.mjs)

# 消费方
(cd ../sdkwork-agents && cargo test -p sdkwork-agents-tool-{image,audio,music,video})   # 45 passed
(cd ../sdkwork-generations && cargo test -p sdkwork-generations-provider-adapter)       # 54 passed
```

## 7. 待办

1. **Midjourney / Nano-Banana 门面**是否需要重新发布（产品决策）；当前 agent 工具
   返回 `capability_missing`。
2. **Go SDK 生成器缺陷**：common 导入路径错误 + `contentType` 重复声明；需修
   `@sdkwork/sdk-generator` 的 Go 模板。
3. **Kotlin** 需要 gradle；**Swift/Flutter** 需要对应工具链与已发布的 common 包。
4. Java 侧已就地修复 `sdkwork-sdk-common-java` 的 compiler 配置（11→17），
   否则任何使用 record 的 Java SDK 都无法构建。
5. `vite-config-runtime.test.ts` 的失败是 HEAD 既有问题（包脚本与测试期望不一致）。
