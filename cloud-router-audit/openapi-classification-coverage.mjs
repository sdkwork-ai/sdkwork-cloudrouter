// @audit — open-api 契约 → 分类器覆盖矩阵（只读，不改仓库）
//
// 目的：逐个契约操作判定它在运行时是否能被分类器识别。
//   1. /v1/*  → OpenAiResourceClassifier (openai_classifier.rs)
//   2. /<provider>/... → ProviderNativeResourceClassifier (provider_native_classifier.rs
//      的 provider_native_api_code_from_standard_path 臂表)
//
// 规则：契约声明了、但两个分类器都不认的操作 = 运行时必然 4xx/5xx 的死接口。

import { readFileSync } from 'node:fs';

const OPENAPI = 'apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json';
const doc = JSON.parse(readFileSync(OPENAPI, 'utf8'));

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

// ---------- OpenAiResourceClassifier 覆盖判定（从 openai_classifier.rs 转录） ----------
// 每个判定器返回 true 表示该 (method, path) 被 classify_openai_spec 接受。
const seg = (p) => p.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

function openAiClassified(method, path) {
  const M = method.toUpperCase();
  const POST = M === 'POST';
  const GET = M === 'GET';

  if (POST && path === '/v1/chat/completions') return true;
  if (path === '/v1/chat/completions') return true;
  if (path.startsWith('/v1/chat/completions/') && path.slice('/v1/chat/completions/'.length) !== '') return true;
  if (POST && path === '/v1/completions') return true;
  if (POST && path === '/v1/embeddings') return true;
  if (POST && path === '/v1/responses') return true;
  if (path.startsWith('/v1/responses/')) return true;
  if (POST && path === '/v1/images/generations') return true;
  if (POST && path === '/v1/images/edits') return true;
  if (POST && path === '/v1/images/variations') return true;
  if (POST && path === '/v1/audio/speech') return true;
  if (POST && path === '/v1/audio/transcriptions') return true;
  if (POST && path === '/v1/audio/translations') return true;
  if (path === '/v1/audio/voices') return true;
  if (GET && path.startsWith('/v1/audio/voices/')) return true;
  if (path.startsWith('/v1/audio/voice_consents/')) return true;
  if (path === '/v1/audio/voice_consents') return true;
  if (POST && path === '/v1/moderations') return true;
  if (GET && path === '/v1/models') return true;
  if (GET && path.startsWith('/v1/models/')) return true;
  if (GET && path === '/v1/vendors') return true;
  if (path === '/v1/files') return true;
  if (path.startsWith('/v1/files/')) return true;
  if (path === '/v1/uploads') return true;
  if (path.startsWith('/v1/uploads/')) return true;
  if (path === '/v1/threads') return true;
  if (POST && path === '/v1/threads/runs') return true;
  if (POST && path.startsWith('/v1/threads/') && path.endsWith('/runs')) return true;
  if (path.startsWith('/v1/threads/')) return true;
  if (path === '/v1/assistants') return true;
  if (path.startsWith('/v1/assistants/')) return true;
  if (path === '/v1/vector_stores') return true;
  if (path.startsWith('/v1/vector_stores/')) return true;
  if (path === '/v1/batches') return true;
  if (path.startsWith('/v1/batches/')) return true;
  if (path === '/v1/conversations') return true;
  if (path.startsWith('/v1/conversations/')) return true;
  if (path === '/v1/containers') return true;
  if (path.startsWith('/v1/containers/')) return true;
  if (path === '/v1/videos') return true;
  if (POST && path === '/v1/videos/generations') return true;
  if (path.startsWith('/v1/videos/')) return true;
  if (['/v1/realtime/calls', '/v1/realtime/translations', '/v1/realtime/sessions', '/v1/realtime/transcription_sessions'].includes(path)) return true;
  if (path.startsWith('/v1/realtime/calls/')) return true;
  if (POST && path === '/v1/realtime/client_secrets') return true;
  // DeepSeek 的独立 web 工具（deepseek.web_search / web_fetch，见
  // openai_classifier.rs 的 /v1/tools 臂）。
  if (POST && path === '/v1/tools/search') return true;
  if (POST && path === '/v1/tools/fetch') return true;
  return false;
}

// ---------- ProviderNative 臂表（从 provider_native_classifier.rs 转录） ----------
// 归一化：/providers/<x> 或 /provider/<x> 前缀剥掉；/<supplier>/ 前缀也剥掉
function normalizeProviderPath(supplier, path) {
  let p = path.trim().toLowerCase();
  if (!p.startsWith('/')) p = '/' + p;
  const stripLead = (s, pre) => s.startsWith(pre) ? '/' + s.slice(pre.length) : s;
  p = stripLead(p, `/${supplier}/`);
  p = stripLead(p, `/${supplier.replace(/[\/\-:]/g, '.')}/`);
  return p;
}

const providerPatterns = [];
function addPat(providers, test, apiCode, note) {
  providerPatterns.push({ providers, test, apiCode, note });
}
const eq = (p) => (path) => path === p;
const prefix = (p) => (path) => path.startsWith(p);
const geminiAction = (action) => (path) => path.startsWith('/v1beta/models/') && path.endsWith(`:${action}`);
const taskPoll = (family) => (path) => path === `/${family}/{task_id}` || (path.startsWith(`/${family}/`) && path.slice(family.length + 2).trim() !== '');
// 形如 `path.starts_with(A) && path.ends_with(B)` 的双端锚定臂
const pathRange = (a, b) => (path) => path.startsWith(a) && path.endsWith(b);

// 逐条对照 provider_native_api_code_from_standard_path 的 match 臂
addPat(['anthropic'], eq('/v1/claude-code/sessions'), 'anthropic.claude_code');
addPat(['anthropic'], eq('/v1/messages'), 'anthropic.messages');
addPat(['alibaba'], eq('/v1/messages'), 'alibaba.anthropic_messages');
addPat(['deepseek'], eq('/v1/messages'), 'deepseek.anthropic_messages');
addPat(['meituan'], eq('/v1/messages'), 'meituan.anthropic_messages');
addPat(['moonshot'], eq('/v1/messages'), 'moonshot.anthropic_messages');
addPat(['stepfun'], eq('/v1/messages'), 'stepfun.anthropic_messages');
addPat(['tencent'], eq('/v1/messages'), 'tencent.anthropic_messages');
addPat(['xiaomi'], eq('/v1/messages'), 'xiaomi.anthropic_messages');
addPat(['zhipu'], eq('/v1/messages'), 'zhipu.anthropic_messages');
addPat(['google', 'gemini'], eq('/v1beta/live/sessions'), 'gemini.live');
addPat(['google', 'gemini'], geminiAction('generatecontent'), 'gemini.generate_content');
addPat(['google', 'gemini'], geminiAction('streamgeneratecontent'), 'gemini.stream_generate_content');
addPat(['google', 'gemini'], geminiAction('batchembedcontents'), 'gemini.batch_embed_contents');
addPat(['google', 'gemini'], geminiAction('embedcontent'), 'gemini.embed_content');
addPat(['google', 'gemini'], geminiAction('generateimages'), 'gemini.image_generation');
addPat(['google', 'gemini'], geminiAction('generatevideos'), 'gemini.video_generation');
// Veo 长任务轮询面：`GET /v1beta/models/{model}/operations/{operation_id}`。
addPat(['google', 'gemini'], (path) => path.startsWith('/v1beta/models/') && path.includes('/operations/'), 'gemini.video_task_query');
addPat(['kling'], eq('/v1/videos/text2video'), 'kling.text_to_video');
addPat(['kling'], eq('/v1/videos/generations'), 'kling.text_to_video');
addPat(['kling'], eq('/v1/videos/avatar'), 'kling.avatar');
addPat(['kling'], eq('/v1/videos/motion-control'), 'kling.motion_control');
addPat(['kling'], eq('/v1/videos/image2video'), 'kling.image_to_video');
addPat(['kling'], eq('/v1/images/generations'), 'kling.image_generation');
addPat(['kling'], taskPoll('v1/tasks'), 'kling.task_query');
addPat(['kling'], taskPoll('v1/videos/generations'), 'kling.task_query');
addPat(['jimeng'], eq('/v1/images/generations'), 'jimeng.image_generation');
addPat(['jimeng'], eq('/v1/videos/generations'), 'jimeng.video_generation');
addPat(['jimeng'], taskPoll('v1/tasks'), 'jimeng.task_query');
addPat(['bytedance'], eq('/api/v3/images/generations'), 'bytedance.image_generation');
addPat(['bytedance'], eq('/api/v3/contents/generations/tasks'), 'bytedance.video_generation');
addPat(['bytedance'], eq('/api/v3/tts/unidirectional'), 'bytedance.speech');
addPat(['bytedance'], taskPoll('api/v3/contents/generations/tasks'), 'bytedance.task_query');
addPat(['volcengine'], eq('/v1/images/generations'), 'volcengine.image_generation');
addPat(['volcengine'], eq('/v1/videos/generations'), 'volcengine.video_generation');
addPat(['volcengine'], eq('/api/v3/audio/speech'), 'volcengine.speech');
addPat(['volcengine'], eq('/api/v3/images/generations'), 'volcengine.image_generation');
addPat(['volcengine'], eq('/api/v3/contents/generations/tasks'), 'volcengine.video_generation');
addPat(['volcengine'], taskPoll('v1/tasks'), 'volcengine.task_query');
addPat(['volcengine'], taskPoll('api/v3/contents/generations/tasks'), 'volcengine.task_query');
addPat(['xai'], eq('/v1/images/generations'), 'xai.image_generation');
addPat(['xai'], eq('/v1/images/edits'), 'xai.image_edit');
addPat(['xai'], eq('/v1/videos/generations'), 'xai.video_generation');
addPat(['xai'], eq('/v1/videos/edits'), 'xai.video_edit');
addPat(['xai'], eq('/v1/videos/extensions'), 'xai.video_extension');
addPat(['xai'], taskPoll('v1/images'), 'xai.image_generation_task_query');
addPat(['xai'], taskPoll('v1/videos'), 'xai.video_generation_task_query');
addPat(['elevenlabs'], eq('/v1/text-to-speech/{voice_id}'), 'elevenlabs.text_to_speech');
addPat(['elevenlabs'], prefix('/v1/text-to-speech/'), 'elevenlabs.text_to_speech');
addPat(['elevenlabs'], eq('/v1/sound-generation'), 'elevenlabs.sound_generation');
addPat(['elevenlabs'], eq('/v1/music'), 'elevenlabs.music_generation');
addPat(['kling'], eq('/v1/audio/text-to-audio'), 'kling.text_to_audio');
addPat(['kling'], eq('/v1/audio/video-to-audio'), 'kling.video_to_audio');
addPat(['kling'], taskPoll('v1/audio/text-to-audio'), 'kling.audio_task_query');
addPat(['stability_ai'], eq('/v2beta/audio/stable-audio-2/text-to-audio'), 'stability_ai.audio');
addPat(['vidu'], eq('/ent/v2/text2audio'), 'vidu.text_to_audio');
addPat(['vidu'], eq('/ent/v2/timing2audio'), 'vidu.timing_to_audio');
addPat(['minimax'], eq('/v1/t2a_v2'), 'minimax.text_to_speech');
addPat(['minimax'], eq('/v1/music_generation'), 'minimax.music_generation');
addPat(['minimax'], eq('/v1/music/generations'), 'minimax.music_generation');
addPat(['minimax'], eq('/v1/music/generation'), 'minimax.music_generation');
addPat(['minimax'], eq('/v1/image_generation'), 'minimax.image_generation');
addPat(['minimax'], eq('/v1/video_generation'), 'minimax.video_generation');
addPat(['minimax'], eq('/v1/query/video_generation'), 'minimax.video_generation_task_query');
addPat(['minimax'], eq('/v1/files/retrieve'), 'minimax.video_file_retrieve');
addPat(['suno'], eq('/v1/music/generations'), 'suno.music_generation');
addPat(['suno'], taskPoll('v1/music/generations'), 'suno.music_task_query');
addPat(['vidu'], eq('/ent/v2/reference2image'), 'vidu.reference_to_image');
addPat(['alibaba'], eq('/api/v1/services/aigc/text2image/image-synthesis'), 'alibaba.image_generation');
addPat(['alibaba'], eq('/api/v1/services/audio/tts/speechsynthesizer'), 'alibaba.speech');
addPat(['alibaba'], eq('/api/v1/services/aigc/video-generation/video-synthesis'), 'alibaba.video_generation');
addPat(['alibaba'], taskPoll('api/v1/tasks'), 'alibaba.video_generation_task_query');
addPat(['luma_ai'], eq('/dream-machine/v1/generations'), 'luma_ai.video_generation');
addPat(['luma_ai'], taskPoll('dream-machine/v1/generations'), 'luma_ai.video_generation_task_query');
addPat(['pixverse'], eq('/openapi/v2/video/text/generate'), 'pixverse.video_generation');
addPat(['pixverse'], taskPoll('openapi/v2/video/result'), 'pixverse.video_generation_task_query');
addPat(['zhipu'], eq('/api/paas/v4/images/generations'), 'zhipu.image_generation');
addPat(['zhipu'], eq('/api/paas/v4/videos/generations'), 'zhipu.video_generation');
addPat(['zhipu'], taskPoll('api/paas/v4/async-result'), 'zhipu.video_generation_task_query');
addPat(['mureka'], eq('/v1/song/generate'), 'mureka.music_generation');
addPat(['mureka'], taskPoll('v1/song/query'), 'mureka.music_generation_task_query');
addPat(['baidu'], eq('/v2/chat/completions'), 'baidu.chat_completions');
addPat(['typesafe'], eq('/v1/systemone'), 'typesafe.systemone');
addPat(['runway', 'runwayml'], eq('/v1/text_to_image'), 'runway.image_generation');
addPat(['runway', 'runwayml'], eq('/v1/text_to_video'), 'runway.text_to_video');
addPat(['runway', 'runwayml'], eq('/v1/image_to_video'), 'runway.image_to_video');
addPat(['runway', 'runwayml'], taskPoll('v1/tasks'), 'runway.task_query');
addPat(['stability_ai', 'stability'], prefix('/v2beta/stable-image/generate/'), 'stability_ai.image_generation');
addPat(['black_forest_labs', 'bfl'], eq('/v1/get_result'), 'black_forest_labs.task_query');
addPat(['black_forest_labs', 'bfl'], eq('/v1/flux-3-video'), 'black_forest_labs.video_generation');
addPat(['black_forest_labs', 'bfl'], prefix('/v1/flux-'), 'black_forest_labs.image_generation');
addPat(['vidu'], eq('/ent/v2/template'), 'vidu.motion_sync');
addPat(['vidu'], eq('/ent/v2/start-end2video'), 'vidu.start_end_to_video');
addPat(['vidu'], eq('/ent/v2/text2video'), 'vidu.text_to_video');
addPat(['vidu'], eq('/ent/v2/img2video'), 'vidu.image_to_video');
addPat(['vidu'], eq('/ent/v2/reference2video'), 'vidu.reference_to_video');
addPat(['vidu'], pathRange('/ent/v2/tasks/', '/creations'), 'vidu.video_task_query');
addPat(['tencent.cloud'], eq('/vidu/ent/v2/reference2image'), 'vidu.reference_to_image');
addPat(['tencent.cloud'], eq('/vidu/ent/v2/start-end2video'), 'vidu.start_end_to_video');
addPat(['tencent.cloud'], eq('/vidu/ent/v2/text2video'), 'vidu.text_to_video');
addPat(['tencent.cloud'], eq('/vidu/ent/v2/img2video'), 'vidu.image_to_video');
addPat(['tencent.cloud'], eq('/vidu/ent/v2/reference2video'), 'vidu.reference_to_video');
addPat(['tencent.cloud'], pathRange('/vidu/ent/v2/tasks/', '/creations'), 'vidu.video_task_query');

function providerNativeClassified(supplierRaw, path) {
  const supplier = supplierRaw.trim().toLowerCase();
  const key = supplier.replace(/[\/\-:]/g, '.');
  const normalized = normalizeProviderPath(supplier, path);
  for (const pat of providerPatterns) {
    if (!pat.providers.includes(supplier) && !pat.providers.includes(key)) continue;
    if (pat.test(normalized)) return pat.apiCode;
  }
  return null;
}

// 镜像 provider_native_classifier.rs 的兜底：infer_endpoint_key 取最后一个非空
// 段并归一化（小写、分隔符折叠成 `.`），fallback_route_key 拼成
// `<vendor>.<endpoint_key>`。与 golden 计费矩阵里的 `anthropic.{file_id}`、
// `google.{model}.counttokens` 一一对应。
function synthesizedFallbackCode(provider, rest) {
  const lastSegment = rest.split('/').filter(Boolean).pop() || 'native_api';
  // normalize_key（classification.rs）：小写、`/` `:` `-` 折叠成 `.`、去首尾 `.`；
  // `{file_id}` 的花括号保留，与 golden 的 `anthropic.{file_id}` 一致。
  const normalized = lastSegment.toLowerCase().replace(/[/:\-]/g, '.').replace(/^\.+|\.+$/g, '');
  return `${provider.toLowerCase()}.${normalized || 'native_api'}`;
}

// ---------- 遍历契约 ----------
const rows = [];
for (const [path, item] of Object.entries(doc.paths)) {
  for (const m of HTTP_METHODS) {
    const op = item[m];
    if (!op) continue;
    const upper = m.toUpperCase();
    const tag = (op.tags && op.tags[0]) || '';
    let verdict, detail;
    if (path === '/v1' || path.startsWith('/v1/')) {
      if (openAiClassified(upper, path)) { verdict = 'OK'; detail = 'openai-classifier'; }
      else { verdict = 'MISS'; detail = 'openai-classifier 无此 (method,path) 分支'; }
    } else {
      const segs = seg(path);
      const provider = segs[0];
      const rest = '/' + segs.slice(1).join('/');
      const code = providerNativeClassified(provider, rest);
      if (code) { verdict = 'OK'; detail = code; }
      else {
        // 臂表未命中时运行时并非死接口：classify_provider_native_spec 会用
        // `<vendor>.<末段>` 合成键兜底（infer_endpoint_key + fallback_route_key）。
        // 合成键只在无 meter 的 Free 读上可用，带价的路径会被定价预检 fail-closed，
        // 所以单列 FALLBACK 档：活着，但不是已编目的路由。
        verdict = 'FALLBACK';
        detail = synthesizedFallbackCode(provider, rest);
      }
    }
    rows.push({ method: upper, path, tag, operationId: op.operationId, verdict, detail });
  }
}

const miss = rows.filter((r) => r.verdict === 'MISS');
const fallback = rows.filter((r) => r.verdict === 'FALLBACK');
const ok = rows.filter((r) => r.verdict === 'OK');

console.log(`契约操作总数: ${rows.length}   已编目: ${ok.length}   Free 读兜底: ${fallback.length}   死接口: ${miss.length}\n`);
console.log('=== 未覆盖（运行时无法分类 = 死接口） ===');
if (miss.length === 0) console.log('(无)');
for (const r of miss) {
  console.log(`${r.method.padEnd(7)} ${r.path.padEnd(56)} [${r.tag}] -> ${r.detail}`);
}
console.log('\n=== 合成键兜底（分类活着，但不是已编目路由：无 meter，按 Free 读结算；带价路径会被定价预检 fail-closed） ===');
if (fallback.length === 0) console.log('(无)');
for (const r of fallback) {
  console.log(`${r.method.padEnd(7)} ${r.path.padEnd(56)} [${r.tag}] -> ${r.detail}`);
}

// 按 tag 汇总
const byTag = {};
for (const r of rows) {
  byTag[r.tag] ??= { ok: 0, miss: 0, fallback: 0 };
  byTag[r.tag][r.verdict === 'OK' ? 'ok' : r.verdict === 'FALLBACK' ? 'fallback' : 'miss']++;
}
console.log('\n=== 按 tag 覆盖汇总 ===');
for (const [tag, c] of Object.entries(byTag).sort()) {
  const flag = c.miss > 0 ? '  <<< GAP' : '';
  console.log(`${tag.padEnd(24)} ok=${String(c.ok).padStart(3)} fallback=${String(c.fallback).padStart(3)} miss=${String(c.miss).padStart(3)}${flag}`);
}

// 死接口（两个分类器都不认）是审计失败；合成键兜底是已声明的运行时行为，
// 只报告不计失败——它们的计费口径由 openapi_billing_matrix 黄金快照看管。
process.exit(miss.length === 0 ? 0 : 1);
