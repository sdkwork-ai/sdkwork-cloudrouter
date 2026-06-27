from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiUploadPartMultipartRequest:
    """OpenAI-compatible open ai upload part multipart request schema exposed by Claw Router."""
    data: str
