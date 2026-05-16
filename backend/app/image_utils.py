import io
import uuid
from pathlib import Path

from PIL import Image

from .config import settings

_ACCEPTED_CONTENT_TYPES = {"image/jpeg", "image/png"}
_ACCEPTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def validate_image(content_type: str, filename: str) -> None:
    if (
        content_type not in _ACCEPTED_CONTENT_TYPES
        or Path(filename).suffix.lower() not in _ACCEPTED_EXTENSIONS
    ):
        raise ValueError("Only JPG and PNG files are accepted")


def convert_to_webp(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=85, method=6)
    return buf.getvalue()


def save_image(user_id: uuid.UUID, membership_id: uuid.UUID, data: bytes) -> str:
    """Write WebP bytes to disk and return the relative path."""
    dest = Path(settings.upload_dir) / str(user_id)
    dest.mkdir(parents=True, exist_ok=True)
    rel = f"{user_id}/{membership_id}.webp"
    (Path(settings.upload_dir) / rel).write_bytes(data)
    return rel


def delete_image(relative_path: str) -> None:
    (Path(settings.upload_dir) / relative_path).unlink(missing_ok=True)


def image_url(relative_path: str | None) -> str | None:
    if not relative_path:
        return None
    return f"{settings.media_base_url}/{relative_path}"
