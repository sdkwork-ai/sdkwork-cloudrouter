from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceConsentMultipartRequest:
    """OpenAI-compatible open ai voice consent multipart request schema exposed by Claw Router."""
    file: str
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
