from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiNamedToolChoiceFunction:
    """OpenAI-compatible open ai named tool choice function schema exposed by Claw Router."""
    name: str
