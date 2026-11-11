from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .ark_audio_source import ArkAudioSource
    from .ark_draft_task import ArkDraftTask
    from .ark_image_source import ArkImageSource
    from .ark_video_source import ArkVideoSource


@dataclass
class ArkContentPart:
    """One Ark content part. `type` selects the required member: `text` requires `text`; `image_url`, `video_url`, and `audio_url` require the matching source object; `draft_task` requires `draft_task`."""
    type: str
    audio_url: Optional[ArkAudioSource] = None
    draft_task: Optional[ArkDraftTask] = None
    image_url: Optional[ArkImageSource] = None
    role: Optional[str] = None
    text: Optional[str] = None
    video_url: Optional[ArkVideoSource] = None
