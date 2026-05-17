import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..dependencies import get_current_user
from ..models import FailedInvite, Group, GroupMember, GroupRole, Invite, InviteStatus, User
from ..schemas import InviteRequest, InviteResponse

router = APIRouter(tags=["invites"])


@router.get("/invites", response_model=list[InviteResponse])
async def list_pending_invites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invite)
        .options(selectinload(Invite.group), selectinload(Invite.inviter))
        .where(Invite.invited_email == user.email, Invite.status == InviteStatus.pending)
    )
    return [
        InviteResponse(
            id=inv.id,
            group_id=inv.group_id,
            group_name=inv.group.name,
            invited_by_name=inv.inviter.name,
            invited_email=inv.invited_email,
            status=inv.status,
            created_at=inv.created_at,
        )
        for inv in result.scalars().all()
    ]


@router.post(
    "/groups/{group_id}/invites",
    status_code=status.HTTP_201_CREATED,
)
async def send_invite(
    group_id: uuid.UUID,
    body: InviteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    gm = await db.get(GroupMember, (group_id, user.id))
    if not gm or gm.user_role != GroupRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group owner can invite")

    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if body.email == user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot invite yourself")

    target_result = await db.execute(select(User).where(User.email == body.email))
    target = target_result.scalar_one_or_none()

    if target is None:
        db.add(FailedInvite(group_id=group_id, invited_by=user.id, invited_email=body.email))
        await db.commit()
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={"status": "queued", "detail": "Email not registered — logged for activation on join"},
        )

    already = await db.get(GroupMember, (group_id, target.id))
    if already:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member of this group")

    existing_invite = (
        await db.execute(
            select(Invite).where(
                Invite.group_id == group_id,
                Invite.invited_email == body.email,
                Invite.status == InviteStatus.pending,
            )
        )
    ).scalar_one_or_none()
    if existing_invite:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pending invite already exists for this email")

    invite = Invite(group_id=group_id, invited_by=user.id, invited_email=body.email)
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    return InviteResponse(
        id=invite.id,
        group_id=invite.group_id,
        group_name=group.name,
        invited_by_name=user.name,
        invited_email=invite.invited_email,
        status=invite.status,
        created_at=invite.created_at,
    )


@router.post("/invites/{invite_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invite(
    invite_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invite = await db.get(Invite, invite_id)
    if not invite or invite.invited_email != user.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite is no longer pending")

    existing = await db.get(GroupMember, (invite.group_id, user.id))
    if not existing:
        db.add(GroupMember(group_id=invite.group_id, user_id=user.id, user_role=GroupRole.viewer))
    invite.status = InviteStatus.accepted
    await db.commit()


@router.post("/invites/{invite_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invite(
    invite_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invite = await db.get(Invite, invite_id)
    if not invite or invite.invited_email != user.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite is no longer pending")

    await db.delete(invite)
    await db.commit()
