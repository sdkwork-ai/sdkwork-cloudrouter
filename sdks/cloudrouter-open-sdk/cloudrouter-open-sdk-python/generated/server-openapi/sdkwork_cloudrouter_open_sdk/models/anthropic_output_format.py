from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_json_schema import ProviderJsonSchema


@dataclass
class AnthropicOutputFormat:
    """Anthropic JSON output format."""
    schema: ProviderJsonSchema
    type: str
