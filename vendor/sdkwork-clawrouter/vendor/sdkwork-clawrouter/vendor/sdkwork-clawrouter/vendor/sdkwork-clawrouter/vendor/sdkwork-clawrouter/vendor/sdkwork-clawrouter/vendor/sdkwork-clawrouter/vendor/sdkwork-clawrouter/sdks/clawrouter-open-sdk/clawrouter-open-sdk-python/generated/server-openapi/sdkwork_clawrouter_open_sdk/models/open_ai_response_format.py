from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_json_schema_format import OpenAiJsonSchemaFormat


@dataclass
class OpenAiResponseFormat:
    """OpenAI-compatible open ai response format schema exposed by Claw Router."""
    type: str
    json_schema: Optional[OpenAiJsonSchemaFormat] = None
