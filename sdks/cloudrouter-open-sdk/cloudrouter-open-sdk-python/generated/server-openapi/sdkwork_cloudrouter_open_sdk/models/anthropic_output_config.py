from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_output_format import AnthropicOutputFormat


@dataclass
class AnthropicOutputConfig:
    """Anthropic output configuration."""
    effort: Optional[str] = None
    format: Optional[AnthropicOutputFormat] = None
