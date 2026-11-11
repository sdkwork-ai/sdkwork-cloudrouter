from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .eleven_labs_composition_plan import ElevenLabsCompositionPlan
    from .eleven_labs_music_prompt import ElevenLabsMusicPrompt


@dataclass
class ElevenLabsMusicGenerationRequest:
    """ElevenLabs music generation request (`POST /v1/music`). Supply `prompt`, or `composition_plan`, but not both."""
    composition_plan: Optional[ElevenLabsMusicPrompt] = None
    finetune_id: Optional[str] = None
    finetune_strength: Optional[float] = None
    force_instrumental: Optional[bool] = None
    generation_mode: Optional[str] = None
    lyrics_text: Optional[str] = None
    model_id: Optional[str] = None
    music_length_ms: Optional[int] = None
    music_prompt: Optional[ElevenLabsMusicPrompt] = None
    prompt: Optional[str] = None
    respect_sections_durations: Optional[bool] = None
    seed: Optional[int] = None
    sign_with_c2pa: Optional[bool] = None
    store_for_inpainting: Optional[bool] = None
    use_phonetic_names: Optional[bool] = None
