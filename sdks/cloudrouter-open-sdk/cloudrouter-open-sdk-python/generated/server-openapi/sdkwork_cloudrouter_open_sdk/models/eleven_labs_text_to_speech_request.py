from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .eleven_labs_audio_effects import ElevenLabsAudioEffects
    from .eleven_labs_pronunciation_dictionary_locator import ElevenLabsPronunciationDictionaryLocator
    from .eleven_labs_voice_settings import ElevenLabsVoiceSettings


@dataclass
class ElevenLabsTextToSpeechRequest:
    """ElevenLabs text-to-speech request (`POST /v1/text-to-speech/{voice_id}`)."""
    text: str
    apply_language_text_normalization: Optional[bool] = None
    apply_text_normalization: Optional[str] = None
    audio_effects: Optional[ElevenLabsAudioEffects] = None
    language_code: Optional[str] = None
    model_id: Optional[str] = None
    next_request_ids: Optional[List[str]] = None
    next_text: Optional[str] = None
    previous_request_ids: Optional[List[str]] = None
    previous_text: Optional[str] = None
    pronunciation_dictionary_locators: Optional[List[ElevenLabsPronunciationDictionaryLocator]] = None
    seed: Optional[int] = None
    use_pvc_as_ivc: Optional[bool] = None
    voice_settings: Optional[ElevenLabsVoiceSettings] = None
