from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiNamedFunctionChoice:
    """OpenAI-compatible open ai named function choice schema exposed by Claw Router."""
    name: str
