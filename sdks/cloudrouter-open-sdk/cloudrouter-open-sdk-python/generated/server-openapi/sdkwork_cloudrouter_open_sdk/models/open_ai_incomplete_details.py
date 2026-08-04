from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiIncompleteDetails:
    """OpenAI-compatible open ai incomplete details schema exposed by Cloud Router."""
    reason: str
