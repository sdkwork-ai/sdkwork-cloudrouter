from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFileUploadRequest:
    """OpenAI-compatible open ai file upload request schema exposed by Cloud Router."""
    file: str
    purpose: str
