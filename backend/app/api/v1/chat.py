from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.chat import ChatRoom, ChatMessage
from app.services.rag_service import chat_with_rag, stream_rag, summarize_chat
from app.services.persona_service import get_all_personas, get_persona_prompt, PERSONAS
import json, asyncio

router = APIRouter()
security = HTTPBearer()

class ChatRequest(BaseModel):
    question: str
    room_id: Optional[int] = None

class UpdateRoomSettingsRequest(BaseModel):
    persona_id: Optional[str] = None
    persona_prompt: Optional[str] = None
    web_search_enabled: Optional[bool] = None
    title: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    return user

def format_room(room: ChatRoom) -> dict:
    return {"id": room.id, "title": room.title, "persona_id": room.persona_id or "default", "persona_prompt": room.persona_prompt or "", "web_search_enabled": room.web_search_enabled or False, "created_at": str(room.created_at)}

def _get_or_create_room(room_id, question, user, db):
    if room_id:
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.user_id == user.id).first()
        if not room:
            raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    else:
        room = ChatRoom(user_id=user.id, title=question[:30] + "..." if len(question) > 30 else question)
        db.add(room); db.commit(); db.refresh(room)
    return room

# ─── 페르소나 목록 ─────────────────────────────────

@router.get("/personas")
def list_personas():
    return get_all_personas()

# ─── 일반 채팅 (비스트리밍) ────────────────────────

@router.post("/")
def chat(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = _get_or_create_room(request.room_id, request.question, current_user, db)
    prev = db.query(ChatMessage).filter(ChatMessage.room_id == room.id).order_by(ChatMessage.created_at).all()
    chat_history = [{"role": m.role, "content": m.content} for m in prev]
    persona_prompt = ""
    if room.persona_id and room.persona_id != "default":
        persona_prompt = get_persona_prompt(room.persona_id, room.persona_prompt)
    result = chat_with_rag(question=request.question, user_id=current_user.id, room_id=room.id, chat_history=chat_history, persona_prompt=persona_prompt, web_search_enabled=room.web_search_enabled or False)
    db.add(ChatMessage(room_id=room.id, role="user", content=request.question))
    db.add(ChatMessage(room_id=room.id, role="assistant", content=result["answer"], source_documents=json.dumps({"sources": result["sources"], "web_sources": result.get("web_sources", [])}, ensure_ascii=False)))
    db.commit()
    return {"room_id": room.id, "answer": result["answer"], "sources": result["sources"], "web_sources": result.get("web_sources", [])}

# ─── 스트리밍 채팅 ─────────────────────────────────

@router.post("/stream")
async def chat_stream(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """SSE 스트리밍 채팅 엔드포인트"""
    room = _get_or_create_room(request.room_id, request.question, current_user, db)
    prev = db.query(ChatMessage).filter(ChatMessage.room_id == room.id).order_by(ChatMessage.created_at).all()
    chat_history = [{"role": m.role, "content": m.content} for m in prev]
    persona_prompt = ""
    if room.persona_id and room.persona_id != "default":
        persona_prompt = get_persona_prompt(room.persona_id, room.persona_prompt)

    # 유저 메시지 먼저 저장
    db.add(ChatMessage(room_id=room.id, role="user", content=request.question))
    db.commit()

    gen, doc_sources, web_sources = await stream_rag(
        question=request.question, user_id=current_user.id, room_id=room.id,
        chat_history=chat_history, persona_prompt=persona_prompt,
        web_search_enabled=room.web_search_enabled or False,
    )

    async def event_stream():
        full_answer = []
        try:
            # room_id 먼저 전송
            yield f"data: {json.dumps({'type': 'room_id', 'room_id': room.id}, ensure_ascii=False)}\n\n"

            async for chunk in gen:
                full_answer.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)  # 이벤트 루프 양보

            # 완료 → 소스 + 전체 답변 저장
            answer_text = "".join(full_answer)
            db.add(ChatMessage(
                room_id=room.id, role="assistant", content=answer_text,
                source_documents=json.dumps({"sources": doc_sources, "web_sources": web_sources}, ensure_ascii=False)
            ))
            db.commit()

            yield f"data: {json.dumps({'type': 'done', 'sources': doc_sources, 'web_sources': web_sources}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ─── 채팅방 CRUD ───────────────────────────────────

@router.post("/rooms")
def create_room(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = ChatRoom(user_id=current_user.id, title="새 채팅")
    db.add(room); db.commit(); db.refresh(room)
    return format_room(room)

@router.get("/rooms")
def get_rooms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rooms = db.query(ChatRoom).filter(ChatRoom.user_id == current_user.id).order_by(ChatRoom.created_at.desc()).all()
    return [format_room(r) for r in rooms]

@router.put("/rooms/{room_id}/settings")
def update_room_settings(room_id: int, req: UpdateRoomSettingsRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.user_id == current_user.id).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    if req.persona_id is not None:
        if req.persona_id not in PERSONAS:
            raise HTTPException(status_code=400, detail=f"알 수 없는 페르소나: {req.persona_id}")
        room.persona_id = req.persona_id
    if req.persona_prompt is not None: room.persona_prompt = req.persona_prompt
    if req.web_search_enabled is not None: room.web_search_enabled = req.web_search_enabled
    if req.title is not None: room.title = req.title
    db.commit(); db.refresh(room)
    return format_room(room)

@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.user_id == current_user.id).first()
    if not room: raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    db.query(ChatMessage).filter(ChatMessage.room_id == room_id).delete()
    db.delete(room); db.commit()
    return {"message": "채팅방이 삭제되었습니다."}

@router.get("/history")
def get_history(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.user_id == current_user.id).first()
    if not room: raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at).all()
    result = []
    for m in messages:
        sources, web_sources = [], []
        if m.source_documents:
            try:
                data = json.loads(m.source_documents)
                sources = data.get("sources", []) if isinstance(data, dict) else data
                web_sources = data.get("web_sources", []) if isinstance(data, dict) else []
            except: pass
        result.append({"id": m.id, "role": m.role, "content": m.content, "sources": sources, "web_sources": web_sources, "created_at": str(m.created_at)})
    return result

@router.post("/rooms/{room_id}/summary")
def summarize_room(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id, ChatRoom.user_id == current_user.id).first()
    if not room: raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    messages = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at).all()
    if not messages: raise HTTPException(status_code=400, detail="요약할 대화가 없습니다.")
    chat_history = [{"role": m.role, "content": m.content} for m in messages]
    persona_prompt = get_persona_prompt(room.persona_id, room.persona_prompt) if room.persona_id and room.persona_id != "default" else ""
    summary = summarize_chat(chat_history, persona_prompt)
    return {"summary": summary, "message_count": len(messages)}
