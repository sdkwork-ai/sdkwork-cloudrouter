from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ListFilesItem:
    """Item module returned inside the listFiles list response."""
    bytes: Optional[int] = None
    created: Optional[int] = None
    created_at: Optional[int] = None
    filename: Optional[str] = None
    id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    object: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[str] = None
