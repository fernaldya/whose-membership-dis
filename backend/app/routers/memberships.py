import logging
import math
import uuid
from datetime import date
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import exists as sa_exists, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..image_utils import convert_to_webp, delete_image, image_url, save_image, validate_image
from ..models import Group, GroupMember, Membership, User, membership_groups_table
from ..schemas import (
    MembershipGroupTag,
    MembershipResponse,
    PaginatedMemberships,
    UpdateMembershipRequest,
)

router = APIRouter(prefix="/memberships", tags=["memberships"])

_SORT_FIELDS = {"merchant", "expiry_date", "country", "created_at"}


def _to_response(m: Membership, current_user_id: uuid.UUID) -> MembershipResponse:
    return MembershipResponse(
        id=m.id,
        merchant=m.merchant,
        country=m.country,
        membership_number=m.membership_number,
        screenshot_url=image_url(m.screenshot_path),
        expiry_date=m.expiry_date,
        is_expired=m.is_expired,
        created_at=m.created_at,
        updated_at=m.updated_at,
        groups=[MembershipGroupTag(id=g.id, name=g.name) for g in m.groups],
        is_owner=m.user_id == current_user_id,
        owner_name=m.owner.name,
    )


async def _assert_group_membership(
    db: AsyncSession, group_ids: list[uuid.UUID], user_id: uuid.UUID
) -> None:
    if not group_ids:
        return
    result = await db.execute(
        select(GroupMember.group_id).where(
            GroupMember.user_id == user_id,
            GroupMember.group_id.in_(group_ids),
        )
    )
    accessible = {row[0] for row in result.all()}
    if missing := set(group_ids) - accessible:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of one or more specified groups",
        )


async def _load_membership(
    db: AsyncSession, membership_id: uuid.UUID
) -> Membership:
    result = await db.execute(
        select(Membership)
        .options(selectinload(Membership.groups), selectinload(Membership.owner))
        .where(Membership.id == membership_id)
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    return m


async def _require_visible(
    db: AsyncSession, membership_id: uuid.UUID, user_id: uuid.UUID
) -> Membership:
    m = await _load_membership(db, membership_id)
    if m.user_id == user_id:
        return m
    shared = (
        await db.execute(
            select(membership_groups_table.c.membership_id)
            .join(GroupMember, GroupMember.group_id == membership_groups_table.c.group_id)
            .where(
                membership_groups_table.c.membership_id == membership_id,
                GroupMember.user_id == user_id,
            )
            .limit(1)
        )
    ).scalar_one_or_none()
    if shared is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return m


async def _require_owner(
    db: AsyncSession, membership_id: uuid.UUID, user_id: uuid.UUID
) -> Membership:
    m = await _load_membership(db, membership_id)
    if m.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this membership")
    return m


async def _handle_image_upload(image: UploadFile, membership: Membership) -> None:
    try:
        validate_image(image.content_type or "", image.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    raw = await image.read()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be under {settings.max_upload_bytes // (1024 * 1024)} MB",
        )
    try:
        webp = convert_to_webp(raw)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not process image")

    membership.screenshot_path = save_image(membership.id, webp)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedMemberships)
async def list_memberships(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    search: Optional[str] = Query(None),
    group_id: Optional[uuid.UUID] = Query(None),
    show_expired: bool = Query(False),
    personal_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if sort_by not in _SORT_FIELDS:
        sort_by = "created_at"
    if sort_dir not in ("asc", "desc"):
        sort_dir = "desc"
    request.session["sort_by"] = sort_by
    request.session["sort_dir"] = sort_dir

    own_ids = select(Membership.id).where(Membership.user_id == user.id)
    shared_ids = (
        select(membership_groups_table.c.membership_id)
        .join(GroupMember, GroupMember.group_id == membership_groups_table.c.group_id)
        .where(GroupMember.user_id == user.id)
    )
    visible_subq = own_ids.union(shared_ids).subquery()

    q = (
        select(Membership)
        .options(selectinload(Membership.groups), selectinload(Membership.owner))
        .where(Membership.id.in_(select(visible_subq.c.id)))
    )

    if not show_expired:
        q = q.where(
            (Membership.expiry_date == None) | (Membership.expiry_date >= date.today())  # noqa: E711
        )
    if search:
        q = q.where(Membership.merchant.ilike(f"%{search}%"))
    if personal_only:
        q = q.where(
            ~sa_exists(
                select(membership_groups_table.c.membership_id).where(
                    membership_groups_table.c.membership_id == Membership.id
                )
            )
        )
    if group_id:
        gm = await db.get(GroupMember, (group_id, user.id))
        if not gm:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this group")
        q = q.join(
            membership_groups_table,
            membership_groups_table.c.membership_id == Membership.id,
        ).where(membership_groups_table.c.group_id == group_id)

    sort_col = getattr(Membership, sort_by)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    items_result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))

    return PaginatedMemberships(
        items=[_to_response(m, user.id) for m in items_result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=MembershipResponse, status_code=status.HTTP_201_CREATED)
async def create_membership(
    merchant: str = Form(...),
    country: Optional[str] = Form(None),
    membership_number: str = Form(...),
    expiry_date: Optional[date] = Form(None),
    group_ids: list[uuid.UUID] = Form(default=[]),
    image: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_group_membership(db, group_ids, user.id)

    membership = Membership(
        id=uuid.uuid4(),
        user_id=user.id,
        merchant=merchant.strip(),
        country=country.strip() if country else None,
        membership_number=membership_number.strip(),
        expiry_date=expiry_date,
    )

    if image and image.filename:
        await _handle_image_upload(image, membership)

    db.add(membership)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if membership.screenshot_path:
            delete_image(membership.screenshot_path)
        if "uq_membership_user_merch_mno" in str(exc.orig):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a membership with this merchant and number.")
        logger.error("Unexpected integrity error creating membership", exc_info=exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Something went wrong, please try again.")
    except Exception as exc:
        await db.rollback()
        if membership.screenshot_path:
            delete_image(membership.screenshot_path)
        logger.error("Unexpected error creating membership", exc_info=exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Something went wrong, please try again.")

    if group_ids:
        await db.execute(
            membership_groups_table.insert(),
            [{"membership_id": membership.id, "group_id": gid} for gid in group_ids],
        )

    await db.commit()
    return _to_response(await _load_membership(db, membership.id), user.id)


@router.get("/{membership_id}", response_model=MembershipResponse)
async def get_membership(
    membership_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _to_response(await _require_visible(db, membership_id, user.id), user.id)


@router.put("/{membership_id}", response_model=MembershipResponse)
async def update_membership(
    membership_id: uuid.UUID,
    body: UpdateMembershipRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = await _require_owner(db, membership_id, user.id)

    if body.merchant is not None:
        m.merchant = body.merchant
    if body.country is not None:
        m.country = body.country
    if body.membership_number is not None:
        m.membership_number = body.membership_number
    if body.expiry_date is not None:
        m.expiry_date = body.expiry_date
    if body.group_ids is not None:
        await _assert_group_membership(db, body.group_ids, user.id)
        groups_result = await db.execute(select(Group).where(Group.id.in_(body.group_ids)))
        m.groups = list(groups_result.scalars().all())

    await db.commit()
    return _to_response(await _load_membership(db, m.id), user.id)


@router.patch("/{membership_id}/image", response_model=MembershipResponse)
async def replace_image(
    membership_id: uuid.UUID,
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = await _require_owner(db, membership_id, user.id)
    old_path = m.screenshot_path
    await _handle_image_upload(image, m)
    if old_path and old_path != m.screenshot_path:
        delete_image(old_path)
    await db.commit()
    return _to_response(await _load_membership(db, m.id), user.id)


@router.delete("/{membership_id}/image", response_model=MembershipResponse)
async def remove_image(
    membership_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = await _require_owner(db, membership_id, user.id)
    if m.screenshot_path:
        delete_image(m.screenshot_path)
        m.screenshot_path = None
    await db.commit()
    return _to_response(await _load_membership(db, m.id), user.id)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_membership(
    membership_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    m = await _require_owner(db, membership_id, user.id)
    if m.screenshot_path:
        delete_image(m.screenshot_path)
    await db.delete(m)
    await db.commit()
