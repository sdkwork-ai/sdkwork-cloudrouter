from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicFileUploadMultipartRequest:
    """Anthropic Claude anthropic file upload multipart request schema exposed by Claw Router vendor routing."""
    file: str
