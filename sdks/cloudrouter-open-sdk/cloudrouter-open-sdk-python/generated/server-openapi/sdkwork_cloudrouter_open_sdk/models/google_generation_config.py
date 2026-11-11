from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_schema import GoogleSchema
    from .google_thinking_config import GoogleThinkingConfig


@dataclass
class GoogleGenerationConfig:
    """Google Gemini google generation config schema exposed by Cloud Router vendor routing."""
    audio_transcription_config: Optional[Dict[str, str]] = None
    candidate_count: Optional[int] = None
    enable_affective_dialog: Optional[bool] = None
    enable_enhanced_civic_answers: Optional[bool] = None
    frequency_penalty: Optional[float] = None
    image_config: Optional[Dict[str, str]] = None
    logprobs: Optional[int] = None
    max_output_tokens: Optional[int] = None
    media_resolution: Optional[str] = None
    presence_penalty: Optional[float] = None
    response_format: Optional[Dict[str, str]] = None
    response_json_schema: Optional[str] = None
    response_logprobs: Optional[bool] = None
    response_mime_type: Optional[str] = None
    response_modalities: Optional[List[str]] = None
    response_schema: Optional[GoogleSchema] = None
    seed: Optional[int] = None
    speech_config: Optional[Dict[str, str]] = None
    stop_sequences: Optional[List[str]] = None
    temperature: Optional[float] = None
    thinking_config: Optional[GoogleThinkingConfig] = None
    top_k: Optional[int] = None
    top_p: Optional[float] = None
    translation_config: Optional[Dict[str, str]] = None
