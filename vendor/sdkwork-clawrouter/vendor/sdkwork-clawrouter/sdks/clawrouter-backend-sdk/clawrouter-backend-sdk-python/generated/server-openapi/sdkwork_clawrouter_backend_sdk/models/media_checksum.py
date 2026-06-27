from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MediaChecksum:
    """Media checksum schema exposed by Claw Router."""
    algorithm: str
    value: str
