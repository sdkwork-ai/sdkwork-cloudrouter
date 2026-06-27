from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiStreamOptions:
    """OpenAI-compatible open ai stream options schema exposed by Claw Router."""
    include_usage: Optional[bool] = None
