from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiPromptReference:
    """OpenAI-compatible open ai prompt reference schema exposed by Claw Router."""
    id: Optional[str] = None
    variables: Optional[Dict[str, str]] = None
    version: Optional[str] = None
