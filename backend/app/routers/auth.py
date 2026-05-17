from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models import GroupMember, GroupRole, Invite, InviteStatus, User
from ..schemas import UserResponse


class UpdateProfileRequest(BaseModel):
    name: str

    def model_post_init(self, __context: object) -> None:
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("Name cannot be empty")

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/callback", name="auth_callback")
async def callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info = token["userinfo"]

    result = await db.execute(select(User).where(User.google_sub == info["sub"]))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_sub=info["sub"],
            email=info["email"],
            name=info["name"],
            picture_url=info.get("picture"),
        )
        db.add(user)
        await db.flush()

        # Auto-accept any pending invites on first login.
        pending = await db.execute(
            select(Invite).where(
                Invite.invited_email == user.email,
                Invite.status == InviteStatus.pending,
            )
        )
        for invite in pending.scalars().all():
            existing = await db.get(GroupMember, (invite.group_id, user.id))
            if not existing:
                db.add(GroupMember(group_id=invite.group_id, user_id=user.id, user_role=GroupRole.viewer))
            invite.status = InviteStatus.accepted
    else:
        user.name = info["name"]
        user.picture_url = info.get("picture")

    await db.commit()
    request.session["user_id"] = str(user.id)
    return RedirectResponse(url=settings.frontend_url)


@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.name = body.name
    await db.commit()
    return user
