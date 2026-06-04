from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.user_chat import (
    UserChatRoom, UserChatMember, UserChatMessage,
    SharedFile, Friendship, MessageRead, MessageReaction
)
from app.services.websocket_manager import manager, notification_manager
import os, uuid, json

router = APIRouter()
security = HTTPBearer()

UPLOAD_DIR = "./uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── 인증 헬퍼 ───────────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    return user

def get_user_from_token(token: str, db: Session) -> Optional[User]:
    payload = decode_access_token(token)
    if not payload:
        return None
    return db.query(User).filter(User.id == int(payload.get("sub"))).first()

def format_filesize(size: int) -> str:
    if size < 1024: return f"{size}B"
    elif size < 1024 * 1024: return f"{size/1024:.1f}KB"
    else: return f"{size/1024/1024:.1f}MB"

def get_profile_image_url(filename: Optional[str]) -> Optional[str]:
    return f"/api/v1/profile/image/{filename}" if filename else None

def are_friends(db, user_id, other_id) -> bool:
    return db.query(Friendship).filter(
        ((Friendship.requester_id == user_id) & (Friendship.receiver_id == other_id)) |
        ((Friendship.requester_id == other_id) & (Friendship.receiver_id == user_id)),
        Friendship.status == "accepted"
    ).first() is not None

def get_unread_count(db, room_id, user_id) -> int:
    total = db.query(UserChatMessage).filter(UserChatMessage.room_id == room_id, UserChatMessage.user_id != user_id, UserChatMessage.is_deleted == False).count()
    read = db.query(MessageRead).filter(MessageRead.room_id == room_id, MessageRead.user_id == user_id).count()
    return max(0, total - read)

def get_read_count(db, message_id, sender_id) -> int:
    return db.query(MessageRead).filter(MessageRead.message_id == message_id, MessageRead.user_id != sender_id).count()

def get_reactions(db, message_id) -> list:
    """메시지의 이모지 리액션 집계"""
    rows = db.query(MessageReaction.emoji, sqlfunc.count(MessageReaction.id).label("count")).filter(
        MessageReaction.message_id == message_id
    ).group_by(MessageReaction.emoji).all()
    return [{"emoji": r.emoji, "count": r.count} for r in rows]

def get_my_reactions(db, message_id, user_id) -> list:
    rows = db.query(MessageReaction.emoji).filter(
        MessageReaction.message_id == message_id, MessageReaction.user_id == user_id
    ).all()
    return [r.emoji for r in rows]

async def mark_messages_read(db, room_id, user_id):
    read_ids = {r.message_id for r in db.query(MessageRead).filter(MessageRead.room_id == room_id, MessageRead.user_id == user_id).all()}
    all_msgs = db.query(UserChatMessage).filter(UserChatMessage.room_id == room_id, UserChatMessage.user_id != user_id).all()
    newly_read = [m.id for m in all_msgs if m.id not in read_ids]
    for mid in newly_read:
        db.add(MessageRead(message_id=mid, room_id=room_id, user_id=user_id))
    if newly_read:
        db.commit()
        await manager.broadcast(room_id, {"type": "messages_read", "data": {"room_id": room_id, "reader_id": user_id, "message_ids": newly_read}}, exclude_user_id=user_id)

def format_message(m: UserChatMessage, db: Session, total_members: int, current_user_id: int = None) -> dict:
    """메시지 → dict (reply, reactions 포함)"""
    sender = db.query(User).filter(User.id == m.user_id).first()
    read_count = get_read_count(db, m.id, m.user_id)
    readers_needed = total_members - 1

    msg_data = {
        "id": m.id,
        "user_id": m.user_id,
        "username": m.username,
        "profile_image": get_profile_image_url(sender.profile_image) if sender else None,
        "content": "삭제된 메시지입니다." if m.is_deleted else m.content,
        "message_type": m.message_type,
        "is_deleted": m.is_deleted,
        "edited_at": str(m.edited_at) if m.edited_at else None,
        "created_at": str(m.created_at),
        "read_count": read_count,
        "readers_needed": readers_needed,
        "is_read": read_count >= readers_needed,
        "reactions": get_reactions(db, m.id),
        "my_reactions": get_my_reactions(db, m.id, current_user_id) if current_user_id else [],
        "reply_to": None,
    }

    # 답장 대상 메시지
    if m.reply_to_id and not m.is_deleted:
        parent = db.query(UserChatMessage).filter(UserChatMessage.id == m.reply_to_id).first()
        if parent:
            msg_data["reply_to"] = {
                "id": parent.id,
                "username": parent.username,
                "content": "삭제된 메시지입니다." if parent.is_deleted else (parent.content or ""),
                "message_type": parent.message_type,
            }

    if not m.is_deleted and m.file_id:
        file = db.query(SharedFile).filter(SharedFile.id == m.file_id).first()
        if file:
            msg_data["file"] = {"id": file.id, "filename": file.original_filename, "file_size": format_filesize(file.file_size), "file_type": file.file_type}

    return msg_data

# ─── 알림 WebSocket ──────────────────────────────

@router.websocket("/notifications")
async def notification_ws(websocket: WebSocket, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001); return
    await notification_manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            if json.loads(data).get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        notification_manager.disconnect(user.id)
    except Exception:
        notification_manager.disconnect(user.id)

# ─── 친구 API ────────────────────────────────────

@router.get("/users/search")
def search_users(q: str = Query(..., min_length=1), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    users = db.query(User).filter((User.username.ilike(f"%{q}%") | User.email.ilike(f"%{q}%")), User.id != current_user.id, User.is_active == True).limit(10).all()
    result = []
    for u in users:
        friendship = db.query(Friendship).filter(
            ((Friendship.requester_id == current_user.id) & (Friendship.receiver_id == u.id)) |
            ((Friendship.requester_id == u.id) & (Friendship.receiver_id == current_user.id))
        ).first()
        fs = "none"
        if friendship:
            if friendship.status == "accepted": fs = "friends"
            elif friendship.status == "pending": fs = "sent" if friendship.requester_id == current_user.id else "received"
        result.append({"id": u.id, "username": u.username, "email": u.email, "friend_status": fs, "profile_image": get_profile_image_url(u.profile_image)})
    return result

@router.post("/friends/request/{user_id}")
async def send_friend_request(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id == current_user.id: raise HTTPException(status_code=400, detail="자기 자신에게 친구 요청을 보낼 수 없습니다.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target: raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    existing = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.receiver_id == user_id)) |
        ((Friendship.requester_id == user_id) & (Friendship.receiver_id == current_user.id))
    ).first()
    if existing:
        if existing.status == "accepted": raise HTTPException(status_code=400, detail="이미 친구입니다.")
        elif existing.status == "pending": raise HTTPException(status_code=400, detail="이미 요청 중입니다.")
        elif existing.status == "rejected": db.delete(existing); db.commit()
    friendship = Friendship(requester_id=current_user.id, receiver_id=user_id, status="pending")
    db.add(friendship); db.commit(); db.refresh(friendship)
    await notification_manager.send_to_user(user_id, {"type": "friend_request", "data": {"friendship_id": friendship.id, "from_user_id": current_user.id, "from_username": current_user.username, "from_email": current_user.email, "from_profile_image": get_profile_image_url(current_user.profile_image), "message": f"{current_user.username}님이 친구 요청을 보냈습니다."}})
    return {"message": f"{target.username}에게 친구 요청을 보냈습니다.", "friendship_id": friendship.id}

@router.post("/friends/accept/{friendship_id}")
async def accept_friend_request(friendship_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id, Friendship.receiver_id == current_user.id, Friendship.status == "pending").first()
    if not friendship: raise HTTPException(status_code=404, detail="친구 요청을 찾을 수 없습니다.")
    friendship.status = "accepted"; db.commit()
    requester = db.query(User).filter(User.id == friendship.requester_id).first()
    await notification_manager.send_to_user(friendship.requester_id, {"type": "friend_accepted", "data": {"user_id": current_user.id, "username": current_user.username, "email": current_user.email, "message": f"{current_user.username}님이 친구 요청을 수락했습니다."}})
    return {"message": f"{requester.username}와 친구가 되었습니다."}

@router.post("/friends/reject/{friendship_id}")
async def reject_friend_request(friendship_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id, Friendship.receiver_id == current_user.id, Friendship.status == "pending").first()
    if not friendship: raise HTTPException(status_code=404, detail="친구 요청을 찾을 수 없습니다.")
    requester_id = friendship.requester_id
    db.delete(friendship); db.commit()
    await notification_manager.send_to_user(requester_id, {"type": "friend_rejected", "data": {"username": current_user.username, "message": f"{current_user.username}님이 친구 요청을 거절했습니다."}})
    return {"message": "친구 요청을 거절했습니다."}

@router.delete("/friends/{user_id}")
def remove_friend(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendship = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.receiver_id == user_id)) |
        ((Friendship.requester_id == user_id) & (Friendship.receiver_id == current_user.id)),
        Friendship.status == "accepted"
    ).first()
    if not friendship: raise HTTPException(status_code=404, detail="친구를 찾을 수 없습니다.")
    db.delete(friendship); db.commit()
    return {"message": "친구를 삭제했습니다."}

@router.get("/friends")
def get_friends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friendships = db.query(Friendship).filter(((Friendship.requester_id == current_user.id) | (Friendship.receiver_id == current_user.id)), Friendship.status == "accepted").all()
    friends = []
    for f in friendships:
        fid = f.receiver_id if f.requester_id == current_user.id else f.requester_id
        friend = db.query(User).filter(User.id == fid).first()
        if friend:
            friends.append({"id": friend.id, "username": friend.username, "email": friend.email, "friendship_id": f.id, "profile_image": get_profile_image_url(friend.profile_image), "status_message": friend.status_message or ""})
    return friends

@router.get("/friends/requests")
def get_friend_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = db.query(Friendship).filter(Friendship.receiver_id == current_user.id, Friendship.status == "pending").all()
    return [{"friendship_id": f.id, "id": (u := db.query(User).filter(User.id == f.requester_id).first()) and u.id, "username": u.username if u else "", "email": u.email if u else "", "profile_image": get_profile_image_url(u.profile_image) if u else None} for f in reqs if db.query(User).filter(User.id == f.requester_id).first()]

# ─── 채팅방 API ──────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: str
    description: Optional[str] = None
    invite_user_ids: List[int] = []

@router.post("/rooms/dm/{friend_id}")
def create_or_get_dm_room(friend_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    friend = db.query(User).filter(User.id == friend_id).first()
    if not friend: raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    if not are_friends(db, current_user.id, friend_id): raise HTTPException(status_code=400, detail="친구만 채팅방을 만들 수 있습니다.")
    for m in db.query(UserChatMember).filter(UserChatMember.user_id == current_user.id).all():
        members = db.query(UserChatMember).filter(UserChatMember.room_id == m.room_id).all()
        if len(members) == 2 and any(x.user_id == friend_id for x in members):
            room = db.query(UserChatRoom).filter(UserChatRoom.id == m.room_id).first()
            if room:
                return {"id": room.id, "name": room.name, "description": room.description, "member_count": 2, "online_count": len(manager.get_online_users(room.id)), "is_member": True, "unread_count": get_unread_count(db, room.id, current_user.id), "created_at": str(room.created_at)}
    room = UserChatRoom(name=f"{current_user.username}, {friend.username}", created_by=current_user.id)
    db.add(room); db.commit(); db.refresh(room)
    db.add(UserChatMember(room_id=room.id, user_id=current_user.id))
    db.add(UserChatMember(room_id=room.id, user_id=friend_id))
    db.commit()
    return {"id": room.id, "name": room.name, "description": room.description, "member_count": 2, "online_count": 0, "is_member": True, "unread_count": 0, "created_at": str(room.created_at)}

@router.post("/rooms")
def create_room(req: CreateRoomRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for uid in req.invite_user_ids:
        if not are_friends(db, current_user.id, uid):
            u = db.query(User).filter(User.id == uid).first()
            raise HTTPException(status_code=400, detail=f"{u.username if u else uid}는 친구가 아닙니다.")
    room = UserChatRoom(name=req.name, description=req.description, created_by=current_user.id)
    db.add(room); db.commit(); db.refresh(room)
    db.add(UserChatMember(room_id=room.id, user_id=current_user.id))
    for uid in req.invite_user_ids:
        db.add(UserChatMember(room_id=room.id, user_id=uid))
    db.commit()
    return {"id": room.id, "name": room.name, "description": room.description, "member_count": 1 + len(req.invite_user_ids), "online_count": 0, "is_member": True, "unread_count": 0, "created_at": str(room.created_at)}

@router.get("/rooms")
def get_rooms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = []
    for m in db.query(UserChatMember).filter(UserChatMember.user_id == current_user.id).all():
        room = db.query(UserChatRoom).filter(UserChatRoom.id == m.room_id).first()
        if not room: continue
        member_count = db.query(UserChatMember).filter(UserChatMember.room_id == room.id).count()
        last_msg = db.query(UserChatMessage).filter(UserChatMessage.room_id == room.id).order_by(UserChatMessage.created_at.desc()).first()
        last_message = None
        if last_msg:
            last_message = {"content": "삭제된 메시지입니다." if last_msg.is_deleted else (last_msg.content if last_msg.message_type == "text" else "📎 파일"), "username": last_msg.username, "created_at": str(last_msg.created_at)}
        result.append({"id": room.id, "name": room.name, "description": room.description, "member_count": member_count, "online_count": len(manager.get_online_users(room.id)), "is_member": True, "unread_count": get_unread_count(db, room.id, current_user.id), "last_message": last_message, "created_at": str(room.created_at)})
    result.sort(key=lambda x: (x.get("last_message") or {}).get("created_at", x["created_at"]), reverse=True)
    return result

@router.post("/rooms/{room_id}/read")
async def mark_room_read(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first()
    if not member: raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")
    await mark_messages_read(db, room_id, current_user.id)
    await notification_manager.send_to_user(current_user.id, {"type": "room_unread_update", "data": {"room_id": room_id, "unread_count": 0}})
    return {"message": "읽음 처리 완료"}

@router.post("/rooms/{room_id}/invite")
def invite_to_room(room_id: int, user_id: int = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first(): raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")
    if not are_friends(db, current_user.id, user_id): raise HTTPException(status_code=400, detail="친구만 초대할 수 있습니다.")
    if db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == user_id).first(): raise HTTPException(status_code=400, detail="이미 멤버입니다.")
    db.add(UserChatMember(room_id=room_id, user_id=user_id)); db.commit()
    invited = db.query(User).filter(User.id == user_id).first()
    return {"message": f"{invited.username}을 초대했습니다."}

@router.delete("/rooms/{room_id}/leave")
def leave_room(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first()
    if m: db.delete(m); db.commit()
    return {"message": "채팅방에서 나갔습니다."}

@router.get("/rooms/{room_id}/messages")
def get_messages(room_id: int, limit: int = 50, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first(): raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")
    messages = db.query(UserChatMessage).filter(UserChatMessage.room_id == room_id).order_by(UserChatMessage.created_at.desc()).limit(limit).all()
    total_members = db.query(UserChatMember).filter(UserChatMember.room_id == room_id).count()
    return [format_message(m, db, total_members, current_user.id) for m in reversed(messages)]

@router.get("/rooms/{room_id}/members")
def get_room_members(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first(): raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")
    members = db.query(UserChatMember).filter(UserChatMember.room_id == room_id).all()
    result = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u: result.append({"id": u.id, "username": u.username, "is_online": m.user_id in manager.get_online_users(room_id), "profile_image": get_profile_image_url(u.profile_image), "status_message": u.status_message or ""})
    return result

# ─── 메시지 수정/삭제/리액션 ──────────────────────

class EditMessageRequest(BaseModel):
    content: str

@router.put("/rooms/{room_id}/messages/{message_id}", summary="메시지 수정")
async def edit_message(
    room_id: int, message_id: int,
    req: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(UserChatMessage).filter(UserChatMessage.id == message_id, UserChatMessage.room_id == room_id, UserChatMessage.user_id == current_user.id).first()
    if not msg: raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    if msg.is_deleted: raise HTTPException(status_code=400, detail="삭제된 메시지는 수정할 수 없습니다.")
    if msg.message_type != "text": raise HTTPException(status_code=400, detail="텍스트 메시지만 수정할 수 있습니다.")

    msg.content = req.content.strip()
    msg.edited_at = datetime.now(timezone.utc)
    db.commit()

    await manager.broadcast(room_id, {
        "type": "message_edited",
        "data": {"id": msg.id, "content": msg.content, "edited_at": str(msg.edited_at)}
    })
    return {"message": "수정되었습니다.", "content": msg.content, "edited_at": str(msg.edited_at)}

@router.delete("/rooms/{room_id}/messages/{message_id}", summary="메시지 삭제")
async def delete_message(
    room_id: int, message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(UserChatMessage).filter(UserChatMessage.id == message_id, UserChatMessage.room_id == room_id, UserChatMessage.user_id == current_user.id).first()
    if not msg: raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")

    msg.is_deleted = True
    msg.content = "삭제된 메시지입니다."
    db.commit()

    await manager.broadcast(room_id, {
        "type": "message_deleted",
        "data": {"id": msg.id}
    })
    return {"message": "삭제되었습니다."}

@router.post("/rooms/{room_id}/messages/{message_id}/reactions", summary="리액션 추가/제거 (토글)")
async def toggle_reaction(
    room_id: int, message_id: int,
    emoji: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first():
        raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")

    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == emoji
    ).first()

    if existing:
        db.delete(existing); db.commit()
        action = "removed"
    else:
        db.add(MessageReaction(message_id=message_id, room_id=room_id, user_id=current_user.id, username=current_user.username, emoji=emoji))
        db.commit()
        action = "added"

    reactions = get_reactions(db, message_id)
    await manager.broadcast(room_id, {
        "type": "reaction_updated",
        "data": {"message_id": message_id, "reactions": reactions, "user_id": current_user.id, "emoji": emoji, "action": action}
    })
    return {"action": action, "reactions": reactions}

# ─── 파일 ────────────────────────────────────────

@router.post("/rooms/{room_id}/files")
async def upload_file(room_id: int, file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == current_user.id).first(): raise HTTPException(status_code=403, detail="채팅방 멤버가 아닙니다.")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE: raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다.")
    ext = os.path.splitext(file.filename)[1]
    stored_filename = f"{uuid.uuid4()}{ext}"
    with open(os.path.join(UPLOAD_DIR, stored_filename), "wb") as f: f.write(file_bytes)
    sf = SharedFile(room_id=room_id, user_id=current_user.id, username=current_user.username, original_filename=file.filename, stored_filename=stored_filename, file_size=len(file_bytes), file_type=ext.lstrip(".").lower() if ext else "unknown")
    db.add(sf); db.commit(); db.refresh(sf)
    total_members = db.query(UserChatMember).filter(UserChatMember.room_id == room_id).count()
    msg = UserChatMessage(room_id=room_id, user_id=current_user.id, username=current_user.username, content=f"{file.filename} ({format_filesize(len(file_bytes))})", message_type="file", file_id=sf.id)
    db.add(msg); db.commit(); db.refresh(msg)
    fresh = db.query(User).filter(User.id == current_user.id).first()
    await manager.broadcast(room_id, {"type": "message", "data": {"id": msg.id, "user_id": current_user.id, "username": current_user.username, "profile_image": get_profile_image_url(fresh.profile_image) if fresh else None, "content": msg.content, "message_type": "file", "file": {"id": sf.id, "filename": sf.original_filename, "file_size": format_filesize(sf.file_size), "file_type": sf.file_type}, "created_at": str(msg.created_at), "read_count": 0, "readers_needed": total_members - 1, "is_read": False, "is_deleted": False, "edited_at": None, "reactions": [], "my_reactions": [], "reply_to": None}})
    for m in db.query(UserChatMember).filter(UserChatMember.room_id == room_id).all():
        if m.user_id == current_user.id: continue
        room_obj = db.query(UserChatRoom).filter(UserChatRoom.id == room_id).first()
        await notification_manager.send_to_user(m.user_id, {"type": "new_message", "data": {"room_id": room_id, "room_name": room_obj.name if room_obj else "", "sender": current_user.username, "content": "📎 파일", "unread_count": get_unread_count(db, room_id, m.user_id)}})
    return {"file_id": sf.id}

@router.get("/files/{file_id}/download")
def download_file(file_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_user_from_token(token, db)
    if not user: raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    sf = db.query(SharedFile).filter(SharedFile.id == file_id).first()
    if not sf: raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    if not db.query(UserChatMember).filter(UserChatMember.room_id == sf.room_id, UserChatMember.user_id == user.id).first(): raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    fp = os.path.join(UPLOAD_DIR, sf.stored_filename)
    if not os.path.exists(fp): raise HTTPException(status_code=404, detail="파일이 서버에 없습니다.")
    return FileResponse(fp, filename=sf.original_filename, media_type="application/octet-stream")

# ─── 채팅 WebSocket ──────────────────────────────

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    user = get_user_from_token(token, db)
    if not user: await websocket.close(code=4001); return
    if not db.query(UserChatMember).filter(UserChatMember.room_id == room_id, UserChatMember.user_id == user.id).first():
        await websocket.close(code=4003); return

    await manager.connect(websocket, room_id, user.id, user.username)
    online = manager.get_online_users(room_id)
    await manager.broadcast(room_id, {"type": "system", "data": {"content": f"{user.username}님이 입장했습니다.", "online_count": len(online)}})
    await mark_messages_read(db, room_id, user.id)
    await notification_manager.send_to_user(user.id, {"type": "room_unread_update", "data": {"room_id": room_id, "unread_count": 0}})
    total_members = db.query(UserChatMember).filter(UserChatMember.room_id == room_id).count()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            if payload.get("type") == "message":
                content = payload.get("content", "").strip()
                reply_to_id = payload.get("reply_to_id")
                if not content: continue

                # reply_to_id 유효성
                if reply_to_id:
                    parent = db.query(UserChatMessage).filter(UserChatMessage.id == reply_to_id, UserChatMessage.room_id == room_id).first()
                    if not parent: reply_to_id = None

                fresh = db.query(User).filter(User.id == user.id).first()
                msg = UserChatMessage(room_id=room_id, user_id=user.id, username=user.username, content=content, message_type="text", reply_to_id=reply_to_id)
                db.add(msg); db.commit(); db.refresh(msg)

                reply_to_data = None
                if reply_to_id:
                    parent = db.query(UserChatMessage).filter(UserChatMessage.id == reply_to_id).first()
                    if parent:
                        reply_to_data = {"id": parent.id, "username": parent.username, "content": "삭제된 메시지입니다." if parent.is_deleted else (parent.content or ""), "message_type": parent.message_type}

                await manager.broadcast(room_id, {
                    "type": "message",
                    "data": {
                        "id": msg.id, "user_id": user.id, "username": user.username,
                        "profile_image": get_profile_image_url(fresh.profile_image) if fresh else None,
                        "content": content, "message_type": "text",
                        "created_at": str(msg.created_at),
                        "read_count": 0, "readers_needed": total_members - 1, "is_read": False,
                        "is_deleted": False, "edited_at": None,
                        "reactions": [], "my_reactions": [],
                        "reply_to": reply_to_data,
                    }
                })

                for m in db.query(UserChatMember).filter(UserChatMember.room_id == room_id).all():
                    if m.user_id == user.id: continue
                    room_obj = db.query(UserChatRoom).filter(UserChatRoom.id == room_id).first()
                    await notification_manager.send_to_user(m.user_id, {"type": "new_message", "data": {"room_id": room_id, "room_name": room_obj.name if room_obj else "", "sender": user.username, "content": content[:50], "unread_count": get_unread_count(db, room_id, m.user_id)}})

            elif payload.get("type") == "typing":
                await manager.broadcast(room_id, {
                    "type": "typing",
                    "data": {"user_id": user.id, "username": user.username}
                }, exclude_user_id=user.id)

            elif payload.get("type") == "stop_typing":
                await manager.broadcast(room_id, {
                    "type": "stop_typing",
                    "data": {"user_id": user.id}
                }, exclude_user_id=user.id)

            elif payload.get("type") == "read":
                await mark_messages_read(db, room_id, user.id)
                await notification_manager.send_to_user(user.id, {"type": "room_unread_update", "data": {"room_id": room_id, "unread_count": 0}})

            elif payload.get("type") == "ping":
                await manager.send_personal(websocket, {"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(room_id, user.id)
        online = manager.get_online_users(room_id)
        await manager.broadcast(room_id, {"type": "system", "data": {"content": f"{user.username}님이 퇴장했습니다.", "online_count": len(online)}})
    except Exception:
        manager.disconnect(room_id, user.id)
