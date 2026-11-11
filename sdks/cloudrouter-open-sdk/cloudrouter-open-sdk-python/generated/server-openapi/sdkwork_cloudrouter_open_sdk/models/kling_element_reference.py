from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingElementReference:
    """Reference to a subject in the Kling element library."""
    element_id: int
