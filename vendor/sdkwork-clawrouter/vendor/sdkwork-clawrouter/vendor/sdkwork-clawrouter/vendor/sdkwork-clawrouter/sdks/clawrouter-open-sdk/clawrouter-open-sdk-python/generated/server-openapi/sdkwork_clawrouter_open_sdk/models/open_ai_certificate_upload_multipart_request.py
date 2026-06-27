from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiCertificateUploadMultipartRequest:
    """OpenAI-compatible multipart request to upload a certificate."""
    file: str
    certificate: Optional[str] = None
    metadata: Optional[str] = None
    name: Optional[str] = None
