from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_schema import GoogleSchema


@dataclass
class GoogleFunctionDeclaration:
    """Google Gemini google function declaration schema exposed by Claw Router vendor routing."""
    name: str
    description: Optional[str] = None
    parameters: Optional[GoogleSchema] = None
    response: Optional[GoogleSchema] = None
