from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ProviderTaskError:
    """Reusable provider provider task error schema shared by Claw Router vendor modules."""
    code: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None
