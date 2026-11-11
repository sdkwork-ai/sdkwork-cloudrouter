import type { ArkAudioSource } from './ark-audio-source';
import type { ArkDraftTask } from './ark-draft-task';
import type { ArkImageSource } from './ark-image-source';
import type { ArkVideoSource } from './ark-video-source';
import type { ProviderJsonValue } from './provider-json-value';

/** One Ark content part. `type` selects the required member: `text` requires `text`; `image_url`, `video_url`, and `audio_url` require the matching source object; `draft_task` requires `draft_task`. */
export interface ArkContentPart {
  /** Audio source; required when `type` is `audio_url`. */
  audio_url?: ArkAudioSource;
  /** Draft task reference; required when `type` is `draft_task`. */
  draft_task?: ArkDraftTask;
  /** Image source; required when `type` is `image_url`. */
  image_url?: ArkImageSource;
  /** Media position or purpose. Images: `first_frame` (optionally omitted for a single first frame), `last_frame` (required for first/last-frame tasks), or `reference_image`. Videos must use `reference_video`; audio must use `reference_audio`. */
  role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
  /** Text prompt; required when `type` is `text`. */
  text?: string;
  /** Content part type. */
  type: 'text' | 'image_url' | 'video_url' | 'audio_url' | 'draft_task';
  /** Video source; required when `type` is `video_url`. */
  video_url?: ArkVideoSource;
}
