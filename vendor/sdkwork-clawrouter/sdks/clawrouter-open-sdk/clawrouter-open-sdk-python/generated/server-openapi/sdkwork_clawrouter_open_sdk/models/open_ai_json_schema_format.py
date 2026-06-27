from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_json_schema import OpenAiJsonSchema


@dataclass
class OpenAiJsonSchemaFormat:
    """OpenAI-compatible open ai json schema format schema exposed by Claw Router."""
    name: str
    description: Optional[str] = None
    schema: Optional[OpenAiJsonSchema] = None
    strict: Optional[bool] = None
