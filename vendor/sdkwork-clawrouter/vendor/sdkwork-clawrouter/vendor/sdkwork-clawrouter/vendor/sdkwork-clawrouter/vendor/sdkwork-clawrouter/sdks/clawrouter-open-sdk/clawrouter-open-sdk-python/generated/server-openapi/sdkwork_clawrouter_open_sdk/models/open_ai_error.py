from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiError:
    """OpenAI-compatible open ai error schema exposed by Claw Router."""
    code: str
    message: str
    type: str
    param: Optional[str] = None
    path: Optional[str] = None
