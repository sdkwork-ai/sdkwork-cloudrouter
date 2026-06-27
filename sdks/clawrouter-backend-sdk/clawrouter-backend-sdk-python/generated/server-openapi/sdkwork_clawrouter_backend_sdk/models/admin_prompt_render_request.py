from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminPromptRenderRequest:
    """Admin prompt render request schema exposed by Claw Router."""
    variables: Optional[Dict[str, str]] = None
