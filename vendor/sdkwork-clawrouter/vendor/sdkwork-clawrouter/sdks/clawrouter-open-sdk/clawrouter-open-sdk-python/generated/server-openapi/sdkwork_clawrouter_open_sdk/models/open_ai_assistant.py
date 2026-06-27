from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAssistant:
    """OpenAI-compatible assistant object."""
    created_at: int
    id: str
    model: str
    object: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    response_format: Optional[str] = None
    temperature: Optional[float] = None
    tool_resources: Optional[str] = None
    tools: Optional[List[str]] = None
    top_p: Optional[float] = None
