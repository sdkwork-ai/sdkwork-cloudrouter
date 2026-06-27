from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiChatFile:
    """OpenAI-compatible open ai chat file schema exposed by Claw Router."""
    file_data: Optional[str] = None
    file_id: Optional[str] = None
    filename: Optional[str] = None
