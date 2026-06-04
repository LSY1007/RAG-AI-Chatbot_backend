from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, BigInteger, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class UserChatRoom(Base):
    __tablename__ = "user_chat_rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserChatMember(Base):
    __tablename__ = "user_chat_members"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("user_chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

class UserChatMessage(Base):
    __tablename__ = "user_chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("user_chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    message_type = Column(String, default="text")       # text | file
    file_id = Column(Integer, ForeignKey("shared_files.id"), nullable=True)
    # 답장
    reply_to_id = Column(Integer, ForeignKey("user_chat_messages.id"), nullable=True)
    # 수정/삭제
    is_deleted = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageReaction(Base):
    """이모지 리액션"""
    __tablename__ = "message_reactions"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("user_chat_messages.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("user_chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)
    emoji = Column(String, nullable=False)   # "👍", "❤️", "😂" 등
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageRead(Base):
    __tablename__ = "message_reads"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("user_chat_messages.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("user_chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

class SharedFile(Base):
    __tablename__ = "shared_files"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("user_chat_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
