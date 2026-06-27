from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiImage:
    """OpenAI-compatible image output object."""
    b64_json: Optional[str] = None
    mime_type: Optional[str] = None
    revised_prompt: Optional[str] = None
    url: Optional[str] = None
