from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.user_chat import Friendship
from app.services.websocket_manager import notification_manager
import os, uuid, json

router = APIRouter()
security = HTTPBearer()

PROFILE_IMAGE_DIR = "./profile_images"
os.makedirs(PROFILE_IMAGE_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    return user

def get_profile_image_url(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    return f"/api/v1/profile/image/{filename}"

def format_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "status_message": user.status_message or "",
        "profile_image": get_profile_image_url(user.profile_image),
        "is_active": user.is_active,
        "created_at": str(user.created_at)
    }

# ─── 내 프로필 조회 ───────────────────────────────

@router.get("/me", summary="내 프로필 조회")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return format_user(current_user)

# ─── 프로필 수정 ──────────────────────────────────

class UpdateProfileRequest(BaseModel):
    status_message: Optional[str] = None
    username: Optional[str] = None

@router.put("/me", summary="프로필 수정")
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 상태 메시지 업데이트
    if req.status_message is not None:
        current_user.status_message = req.status_message.strip()

    # 유저명 변경
    if req.username is not None:
        username = req.username.strip()
        if username and username != current_user.username:
            existing = db.query(User).filter(User.username == username, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="이미 사용 중인 유저명입니다.")
            current_user.username = username

    db.commit()
    db.refresh(current_user)

    # 프로필 변경 알림 (친구들에게)
    await _notify_profile_update(current_user, db)

    return format_user(current_user)

# ─── 프로필 사진 업로드 ───────────────────────────

@router.post("/me/image", summary="프로필 사진 업로드")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="JPG, PNG, GIF, WEBP 이미지만 업로드 가능합니다.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="이미지 크기는 5MB를 초과할 수 없습니다.")

    # 기존 이미지 삭제
    if current_user.profile_image:
        old_path = os.path.join(PROFILE_IMAGE_DIR, current_user.profile_image)
        if os.path.exists(old_path):
            os.remove(old_path)

    # 새 이미지 저장
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    new_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(PROFILE_IMAGE_DIR, new_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    current_user.profile_image = new_filename
    db.commit()
    db.refresh(current_user)

    await _notify_profile_update(current_user, db)

    return {
        "message": "프로필 사진이 업데이트되었습니다.",
        "profile_image": get_profile_image_url(new_filename)
    }

# ─── 프로필 사진 삭제 ─────────────────────────────

@router.delete("/me/image", summary="프로필 사진 삭제")
async def delete_profile_image(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.profile_image:
        old_path = os.path.join(PROFILE_IMAGE_DIR, current_user.profile_image)
        if os.path.exists(old_path):
            os.remove(old_path)
        current_user.profile_image = None
        db.commit()

    await _notify_profile_update(current_user, db)
    return {"message": "프로필 사진이 삭제되었습니다.", "profile_image": None}

# ─── 프로필 이미지 서빙 ───────────────────────────

@router.get("/image/{filename}", summary="프로필 이미지 조회")
def get_profile_image(filename: str):
    file_path = os.path.join(PROFILE_IMAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    return FileResponse(file_path)

# ─── 다른 유저 프로필 조회 ────────────────────────

@router.get("/user/{user_id}", summary="유저 프로필 조회")
def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    return format_user(user)

# ─── 온라인 상태 조회 ─────────────────────────────

@router.get("/online-status", summary="친구들의 온라인 상태 조회")
def get_friends_online_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friendships = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) | (Friendship.receiver_id == current_user.id)),
        Friendship.status == "accepted"
    ).all()

    result = []
    for f in friendships:
        friend_id = f.receiver_id if f.requester_id == current_user.id else f.requester_id
        friend = db.query(User).filter(User.id == friend_id).first()
        if friend:
            is_online = notification_manager.is_online(friend_id)
            result.append({
                "id": friend.id,
                "username": friend.username,
                "profile_image": get_profile_image_url(friend.profile_image),
                "status_message": friend.status_message or "",
                "is_online": is_online
            })
    return result

# ─── 내부 헬퍼 ────────────────────────────────────

async def _notify_profile_update(user: User, db: Session):
    """프로필 변경 시 친구들에게 실시간 알림"""
    friendships = db.query(Friendship).filter(
        ((Friendship.requester_id == user.id) | (Friendship.receiver_id == user.id)),
        Friendship.status == "accepted"
    ).all()

    payload = json.dumps({
        "type": "profile_update",
        "data": {
            "user_id": user.id,
            "username": user.username,
            "profile_image": get_profile_image_url(user.profile_image),
            "status_message": user.status_message or ""
        }
    }, ensure_ascii=False)

    for f in friendships:
        friend_id = f.receiver_id if f.requester_id == user.id else f.requester_id
        await notification_manager.send_to_user(friend_id, json.loads(payload))
