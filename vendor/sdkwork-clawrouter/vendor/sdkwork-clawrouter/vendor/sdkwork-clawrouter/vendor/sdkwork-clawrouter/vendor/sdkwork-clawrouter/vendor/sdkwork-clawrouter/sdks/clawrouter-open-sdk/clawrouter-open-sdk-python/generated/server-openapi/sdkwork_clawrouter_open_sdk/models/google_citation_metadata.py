from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .google_citation_source import GoogleCitationSource


@dataclass
class GoogleCitationMetadata:
    """Citation metadata returned by Gemini."""
    citation_sources: Optional[List[GoogleCitationSource]] = None
