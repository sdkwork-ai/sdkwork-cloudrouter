from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFunctionCall:
    """OpenAI-compatible open ai function call schema exposed by Claw Router."""
    arguments: str
    name: str
