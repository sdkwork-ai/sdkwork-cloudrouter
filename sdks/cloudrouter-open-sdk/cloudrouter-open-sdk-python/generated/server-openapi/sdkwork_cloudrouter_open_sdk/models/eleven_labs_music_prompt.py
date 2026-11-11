from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsMusicPrompt:
    """Structured music prompt (deprecated in favor of `composition_plan`)."""
    negative_global_styles: List[str]
    positive_global_styles: List[str]
    sections: List[Dict[str, str]]
