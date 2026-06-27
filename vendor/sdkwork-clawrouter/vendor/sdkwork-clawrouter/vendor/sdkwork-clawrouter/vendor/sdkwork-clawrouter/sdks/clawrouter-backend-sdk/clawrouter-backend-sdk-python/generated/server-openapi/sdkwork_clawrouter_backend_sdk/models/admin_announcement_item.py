from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAnnouncementItem:
    """Persisted announcement snapshot returned by the backend."""
    content: str
    date: str
    id: str
    show_as_popup: bool
    status: str
    target: str
    title: str
