from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .provider_json_schema import ProviderJsonSchema


@dataclass
class AnthropicTool:
    """Anthropic Claude anthropic tool schema exposed by Claw Router vendor routing."""
    input_schema: ProviderJsonSchema
    name: str
    description: Optional[str] = None
