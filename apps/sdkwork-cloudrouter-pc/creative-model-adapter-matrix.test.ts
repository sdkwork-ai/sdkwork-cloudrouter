/**
 * Creative model catalog ↔ generations provider adapter matrix.
 *
 * The picker lists a model only when its vendor is in
 * `CREATIVE_MODEL_SELECTION_PROFILES`, and it offers only the video modes in
 * `VENDOR_VIDEO_ADAPTER_MODES`. Both tables are a client-side copy of the
 * `dispatch` arms of `sdkwork-generations-provider-adapter` (image.rs /
 * video.rs / music.rs / voice.rs / sfx.rs); this suite pins the client copy so
 * a vendor rename or a mode change on either side fails here.
 *
 * It also pins the "honest refusal" edges: a vendor whose adapter surface
 * cannot serve a mode must not advertise it, or the picker offers a
 * combination that only fails at submit time.
 *
 * Runs with `node --import tsx --test` (no browser, no network).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CREATIVE_MODEL_SELECTION_PROFILES,
  VENDOR_IMAGE_PARAMETERS,
  VENDOR_MUSIC_PARAMETERS,
  VENDOR_SFX_PARAMETERS,
  VENDOR_VIDEO_ADAPTER_MODES,
  VENDOR_VIDEO_GENERATION_MODES,
  VENDOR_VOICE_PARAMETERS,
} from '../../../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/creative-model-catalog/staticCreativeModelCatalog.ts';

/** Creation type → catalog vendor codes the adapter dispatches. */
const EXPECTED_VENDORS: Readonly<Record<string, readonly string[]>> = {
  image: ['openai', 'google', 'kuaishou', 'vidu', 'bytedance'],
  video: ['openai', 'google', 'kuaishou', 'vidu', 'bytedance'],
  music: ['suno', 'minimax'],
  voice: ['elevenlabs', 'bytedance'],
  sound_effects: ['elevenlabs'],
};

test('the picker lists exactly the creation types the adapter dispatches', () => {
  for (const [modality, vendors] of Object.entries(EXPECTED_VENDORS)) {
    const profile = CREATIVE_MODEL_SELECTION_PROFILES[modality as keyof typeof CREATIVE_MODEL_SELECTION_PROFILES];
    assert.ok(profile, `${modality} must declare a selection profile`);
    assert.deepEqual(
      [...profile.vendorCodes].sort(),
      [...vendors].sort(),
      `${modality}: the picker vendor list must match the adapter dispatch table`,
    );
  }
  // Creation types with no wired generation plane must stay null so the picker
  // never offers them.
  assert.equal(CREATIVE_MODEL_SELECTION_PROFILES.digital_human, null);
  assert.equal(CREATIVE_MODEL_SELECTION_PROFILES.action, null);
});

test('every listed vendor has a parameter profile for its own creation type', () => {
  for (const vendorCode of EXPECTED_VENDORS.image) {
    assert.ok(
      VENDOR_IMAGE_PARAMETERS[vendorCode],
      `image vendor ${vendorCode} must declare a parameter profile`,
    );
  }
  for (const vendorCode of EXPECTED_VENDORS.video) {
    assert.ok(
      VENDOR_VIDEO_GENERATION_MODES[vendorCode],
      `video vendor ${vendorCode} must declare generation modes`,
    );
    assert.ok(
      VENDOR_VIDEO_ADAPTER_MODES[vendorCode],
      `video vendor ${vendorCode} must declare adapter modes`,
    );
  }
  for (const vendorCode of EXPECTED_VENDORS.music) {
    assert.ok(VENDOR_MUSIC_PARAMETERS[vendorCode], `music vendor ${vendorCode} must declare a parameter profile`);
  }
  for (const vendorCode of EXPECTED_VENDORS.voice) {
    assert.ok(VENDOR_VOICE_PARAMETERS[vendorCode], `voice vendor ${vendorCode} must declare a parameter profile`);
  }
  for (const vendorCode of EXPECTED_VENDORS.sound_effects) {
    assert.ok(VENDOR_SFX_PARAMETERS[vendorCode], `sound effects vendor ${vendorCode} must declare a parameter profile`);
  }
});

test('the adapter mode table is a superset of the conservative picker modes', () => {
  for (const [vendorCode, conservativeModes] of Object.entries(VENDOR_VIDEO_GENERATION_MODES)) {
    const adapterModes = VENDOR_VIDEO_ADAPTER_MODES[vendorCode];
    assert.ok(adapterModes, `${vendorCode} must declare adapter modes`);
    for (const mode of conservativeModes) {
      assert.ok(
        adapterModes.includes(mode),
        `${vendorCode}: conservative mode ${mode} must also be an adapter mode`,
      );
    }
  }
});

test('only vendors whose adapter surface supports a mode advertise it', () => {
  // Mirrors the adapter dispatch arms: which vendor surface serves each
  // generation mode.
  const adapterSurfaces: Readonly<Record<string, readonly string[]>> = {
    text_to_video: ['openai', 'google', 'kuaishou', 'vidu', 'bytedance'],
    image_to_video: ['openai', 'kuaishou', 'vidu', 'bytedance'],
    reference_to_video: ['vidu', 'bytedance'],
    start_end_frame: ['kuaishou', 'vidu', 'bytedance'],
  };
  for (const [vendorCode, modes] of Object.entries(VENDOR_VIDEO_ADAPTER_MODES)) {
    for (const mode of modes) {
      const surfaces = adapterSurfaces[mode];
      assert.ok(
        surfaces?.includes(vendorCode),
        `${vendorCode} must not advertise ${mode}: the adapter has no such surface`,
      );
    }
  }
  for (const [mode, vendors] of Object.entries(adapterSurfaces)) {
    for (const vendorCode of vendors) {
      assert.ok(
        VENDOR_VIDEO_ADAPTER_MODES[vendorCode]?.includes(mode),
        `${vendorCode} must advertise ${mode}: the adapter dispatches it`,
      );
    }
  }
});

test('Google video advertises text_to_video only because its reference surfaces need base64 frames', () => {
  // `dispatch_gemini` rejects image_to_video / reference_to_video /
  // start_end_frame with guidance rather than accepting an unfetchable URL.
  // Offering them in the picker would manufacture a guaranteed failure.
  assert.deepEqual([...VENDOR_VIDEO_ADAPTER_MODES.google], ['text_to_video']);
  assert.deepEqual([...VENDOR_VIDEO_GENERATION_MODES.google], ['text_to_video']);
});

test('Kling maps start_end_frame onto its image_tail surface', () => {
  assert.ok(VENDOR_VIDEO_ADAPTER_MODES.kuaishou.includes('start_end_frame'));
  // Kling's adapter does not implement reference_to_video; a multi-reference
  // request there must not be advertised.
  assert.ok(!VENDOR_VIDEO_ADAPTER_MODES.kuaishou.includes('reference_to_video'));
});

test('unsupported modes are refused instead of silently downgraded', () => {
  // Open Sora has no first/last-frame surface.
  assert.ok(!VENDOR_VIDEO_ADAPTER_MODES.openai.includes('start_end_frame'));
  // Suno / MiniMax are music-only; no video vendor table entry exists for them.
  assert.equal(VENDOR_VIDEO_ADAPTER_MODES.suno, undefined);
  assert.equal(VENDOR_VIDEO_ADAPTER_MODES.minimax, undefined);
  // ElevenLabs is sound-effect / speech only.
  assert.equal(VENDOR_VIDEO_ADAPTER_MODES.elevenlabs, undefined);
});

test('no vendor advertises the unimplemented multi_shot surface', () => {
  // The composer's `smart_multi` mode resolves to `multi_shot`, but no wired
  // video adapter (OpenAI / Gemini / Kling / Vidu / Volcengine) implements a
  // multi-shot surface. Advertising it would manufacture a deterministic
  // failure, so the adapter mode table must never carry it.
  for (const [vendorCode, modes] of Object.entries(VENDOR_VIDEO_ADAPTER_MODES)) {
    assert.ok(
      !modes.includes('multi_shot'),
      `${vendorCode} must not advertise multi_shot: no adapter implements it`,
    );
  }
  // The credential estimator resolves depth through the same composer mode, so
  // the picker must not offer `smart_multi` on any vendor either.
  assert.ok(
    !Object.values(VENDOR_VIDEO_ADAPTER_MODES).some((modes) => (modes as readonly string[]).includes('multi_shot')),
    'no vendor may list multi_shot anywhere',
  );
});
