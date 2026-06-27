from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ProviderGeneratedMedia:
    """Reusable provider provider generated media schema shared by Claw Router vendor modules."""
    duration: Optional[float] = None
    height: Optional[int] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    mime_type: Optional[str] = None
    uri: Optional[str] = None
    url: Optional[str] = None
    width: Optional[int] = None
