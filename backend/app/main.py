from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .config import settings
from .routers.auth import router as auth_router
from .routers.groups import router as groups_router
from .routers.invites import router as invites_router
from .routers.memberships import router as memberships_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Whose Membership Is Dis?", lifespan=lifespan)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret_key,
    session_cookie="wmd_session",
    same_site="lax",
    https_only=True,
    domain=".climbge.com",
)

_parsed = urlparse(settings.frontend_url)
_frontend_origin = f"{_parsed.scheme}://{_parsed.netloc}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(groups_router)
app.include_router(invites_router)
app.include_router(memberships_router)

# In production Nginx serves /media directly from the filesystem.
# Mounting here covers local development.
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")
