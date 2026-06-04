from typing import Dict, List, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    """WebSocket 연결 관리자 - 채팅방용"""

    def __init__(self):
        self.active_connections: Dict[int, Dict[int, WebSocket]] = {}
        self.user_info: Dict[int, str] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int, username: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket
        self.user_info[user_id] = username

    def disconnect(self, room_id: int, user_id: int):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        self.user_info.pop(user_id, None)

    async def broadcast(self, room_id: int, message: dict, exclude_user_id: int = None):
        if room_id not in self.active_connections:
            return
        disconnected = []
        for uid, websocket in self.active_connections[room_id].items():
            if exclude_user_id and uid == exclude_user_id:
                continue
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.disconnect(room_id, uid)

    async def send_personal(self, websocket: WebSocket, message: dict):
        await websocket.send_text(json.dumps(message, ensure_ascii=False))

    def get_online_users(self, room_id: int) -> List[int]:
        if room_id not in self.active_connections:
            return []
        return list(self.active_connections[room_id].keys())


class NotificationManager:
    """실시간 알림용 WebSocket 관리자 - 친구 요청/수락 알림"""

    def __init__(self):
        # user_id → WebSocket
        self.connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict):
        """특정 유저에게 알림 전송"""
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections


manager = ConnectionManager()
notification_manager = NotificationManager()
