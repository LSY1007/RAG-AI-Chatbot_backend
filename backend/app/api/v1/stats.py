from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.chat import ChatRoom, ChatMessage, Document
from app.models.user_chat import UserChatMessage, UserChatRoom, UserChatMember, Friendship
from app.services.websocket_manager import manager, notification_manager

router = APIRouter()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    return user

def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """is_admin = True 인 유저만 통과"""
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return user

# ─── 내 통계 (일반 유저) ──────────────────────────

@router.get("/my", summary="내 활동 통계")
def get_my_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    ai_rooms = db.query(ChatRoom).filter(ChatRoom.user_id == current_user.id).count()
    ai_messages_total = db.query(ChatMessage).join(ChatRoom).filter(ChatRoom.user_id == current_user.id).count()
    ai_messages_week = db.query(ChatMessage).join(ChatRoom).filter(
        ChatRoom.user_id == current_user.id, ChatMessage.created_at >= week_ago
    ).count()

    docs_total = db.query(Document).filter(Document.user_id == current_user.id).count()
    docs_by_type = db.query(Document.file_type, func.count(Document.id)).filter(
        Document.user_id == current_user.id
    ).group_by(Document.file_type).all()
    total_chunks = db.query(func.sum(Document.chunk_count)).filter(Document.user_id == current_user.id).scalar() or 0

    my_rooms = db.query(UserChatMember).filter(UserChatMember.user_id == current_user.id).count()
    my_messages = db.query(UserChatMessage).filter(UserChatMessage.user_id == current_user.id).count()
    my_messages_week = db.query(UserChatMessage).filter(
        UserChatMessage.user_id == current_user.id, UserChatMessage.created_at >= week_ago
    ).count()
    friends_count = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) | (Friendship.receiver_id == current_user.id)),
        Friendship.status == "accepted"
    ).count()

    daily_ai = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(ChatMessage).join(ChatRoom).filter(
            ChatRoom.user_id == current_user.id, ChatMessage.role == "user",
            ChatMessage.created_at >= day_start, ChatMessage.created_at < day_end
        ).count()
        daily_ai.append({"date": day.strftime("%m/%d"), "count": count})

    daily_user = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(UserChatMessage).filter(
            UserChatMessage.user_id == current_user.id,
            UserChatMessage.created_at >= day_start, UserChatMessage.created_at < day_end
        ).count()
        daily_user.append({"date": day.strftime("%m/%d"), "count": count})

    persona_usage = db.query(ChatRoom.persona_id, func.count(ChatRoom.id)).filter(
        ChatRoom.user_id == current_user.id, ChatRoom.persona_id.isnot(None)
    ).group_by(ChatRoom.persona_id).all()

    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin,
            "joined": str(current_user.created_at)
        },
        "ai_chat": {
            "total_rooms": ai_rooms,
            "total_messages": ai_messages_total,
            "messages_this_week": ai_messages_week,
            "daily": daily_ai,
        },
        "documents": {
            "total": docs_total,
            "total_chunks": total_chunks,
            "by_type": [{"type": t, "count": c} for t, c in docs_by_type],
        },
        "user_chat": {
            "total_rooms": my_rooms,
            "total_messages": my_messages,
            "messages_this_week": my_messages_week,
            "friends_count": friends_count,
            "daily": daily_user,
        },
        "persona_usage": [{"persona_id": p or "default", "count": c} for p, c in persona_usage],
    }

# ─── 관리자 통계 ─────────────────────────────────

@router.get("/admin/overview", summary="관리자 전체 현황")
def get_admin_overview(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_users = db.query(User).count()
    new_users_today = db.query(User).filter(User.created_at >= today_start).count()
    new_users_week = db.query(User).filter(User.created_at >= week_ago).count()
    online_users = len(notification_manager.connections)

    total_ai_rooms = db.query(ChatRoom).count()
    total_ai_messages = db.query(ChatMessage).count()
    ai_messages_today = db.query(ChatMessage).filter(ChatMessage.created_at >= today_start).count()
    ai_messages_week = db.query(ChatMessage).filter(ChatMessage.created_at >= week_ago).count()
    web_search_rooms = db.query(ChatRoom).filter(ChatRoom.web_search_enabled == True).count()

    total_docs = db.query(Document).count()
    total_chunks = db.query(func.sum(Document.chunk_count)).scalar() or 0
    docs_by_type = db.query(Document.file_type, func.count(Document.id)).group_by(Document.file_type).all()

    total_user_rooms = db.query(UserChatRoom).count()
    total_user_messages = db.query(UserChatMessage).count()
    user_messages_today = db.query(UserChatMessage).filter(UserChatMessage.created_at >= today_start).count()
    user_messages_week = db.query(UserChatMessage).filter(UserChatMessage.created_at >= week_ago).count()
    total_friendships = db.query(Friendship).filter(Friendship.status == "accepted").count()

    daily_users = []
    for i in range(13, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(User).filter(User.created_at >= day_start, User.created_at < day_end).count()
        daily_users.append({"date": day.strftime("%m/%d"), "count": count})

    daily_messages = []
    for i in range(13, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        ai_cnt = db.query(ChatMessage).filter(ChatMessage.created_at >= day_start, ChatMessage.created_at < day_end).count()
        user_cnt = db.query(UserChatMessage).filter(UserChatMessage.created_at >= day_start, UserChatMessage.created_at < day_end).count()
        daily_messages.append({"date": day.strftime("%m/%d"), "ai": ai_cnt, "user": user_cnt})

    persona_stats = db.query(ChatRoom.persona_id, func.count(ChatRoom.id)).group_by(ChatRoom.persona_id).all()

    recent_users = db.query(User).order_by(desc(User.created_at)).limit(10).all()

    top_ai_users = db.query(
        ChatRoom.user_id, func.count(ChatMessage.id).label("cnt")
    ).join(ChatMessage, ChatMessage.room_id == ChatRoom.id).filter(
        ChatMessage.role == "user"
    ).group_by(ChatRoom.user_id).order_by(desc("cnt")).limit(5).all()

    top_chat_users = db.query(
        UserChatMessage.user_id, func.count(UserChatMessage.id).label("cnt")
    ).group_by(UserChatMessage.user_id).order_by(desc("cnt")).limit(5).all()

    def enrich_user(user_id, count):
        u = db.query(User).filter(User.id == user_id).first()
        return {"id": user_id, "username": u.username if u else "?", "count": count}

    return {
        "summary": {
            "total_users": total_users,
            "online_users": online_users,
            "new_users_today": new_users_today,
            "new_users_week": new_users_week,
            "total_ai_rooms": total_ai_rooms,
            "total_ai_messages": total_ai_messages,
            "ai_messages_today": ai_messages_today,
            "ai_messages_week": ai_messages_week,
            "web_search_rooms": web_search_rooms,
            "total_docs": total_docs,
            "total_chunks": total_chunks,
            "total_user_rooms": total_user_rooms,
            "total_user_messages": total_user_messages,
            "user_messages_today": user_messages_today,
            "user_messages_week": user_messages_week,
            "total_friendships": total_friendships,
        },
        "charts": {
            "daily_users": daily_users,
            "daily_messages": daily_messages,
            "docs_by_type": [{"type": t or "unknown", "count": c} for t, c in docs_by_type],
            "persona_usage": [{"persona_id": p or "default", "count": c} for p, c in persona_stats],
        },
        "recent_users": [
            {"id": u.id, "username": u.username, "email": u.email, "is_admin": u.is_admin,
             "joined": str(u.created_at), "is_active": u.is_active}
            for u in recent_users
        ],
        "top_users": {
            "ai_chat": [enrich_user(uid, cnt) for uid, cnt in top_ai_users],
            "user_chat": [enrich_user(uid, cnt) for uid, cnt in top_chat_users],
        },
    }

@router.get("/admin/users", summary="유저 목록 (관리자)")
def get_all_users(
    page: int = 1, limit: int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    total = db.query(User).count()
    users = db.query(User).order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    result = []
    for u in users:
        ai_msg_count = db.query(ChatMessage).join(ChatRoom).filter(ChatRoom.user_id == u.id, ChatMessage.role == "user").count()
        user_msg_count = db.query(UserChatMessage).filter(UserChatMessage.user_id == u.id).count()
        doc_count = db.query(Document).filter(Document.user_id == u.id).count()
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_online": notification_manager.is_online(u.id),
            "profile_image": f"/api/v1/profile/image/{u.profile_image}" if u.profile_image else None,
            "status_message": u.status_message or "",
            "ai_messages": ai_msg_count,
            "user_messages": user_msg_count,
            "documents": doc_count,
            "joined": str(u.created_at),
        })

    return {"total": total, "page": page, "limit": limit, "users": result}

@router.patch("/admin/users/{user_id}/toggle", summary="유저 활성/비활성 토글")
def toggle_user_active(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신은 변경할 수 없습니다.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "username": user.username, "is_active": user.is_active}

@router.patch("/admin/users/{user_id}/toggle-admin", summary="관리자 권한 토글")
def toggle_user_admin(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신은 변경할 수 없습니다.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없습니다.")
    user.is_admin = not user.is_admin
    db.commit()
    return {"id": user.id, "username": user.username, "is_admin": user.is_admin}
