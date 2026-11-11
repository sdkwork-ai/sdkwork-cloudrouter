from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingVideoToAudioRequest:
    """Kling video-to-sound-effect request (`POST /v1/audio/video-to-audio`). Supply `video_id` or `video_url`."""
    asmr_mode: Optional[bool] = None
    bgm_prompt: Optional[str] = None
    callback_url: Optional[str] = None
    external_task_id: Optional[str] = None
    sound_effect_prompt: Optional[str] = None
    video_id: Optional[str] = None
    video_url: Optional[str] = None
