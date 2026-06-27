from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRunCreateRequest:
    """OpenAI-compatible request to create a thread run."""
    assistant_id: str
    additional_instructions: Optional[str] = None
    instructions: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    stream: Optional[bool] = None
    tools: Optional[List[str]] = None
