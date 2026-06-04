import os
os.environ['PGCLIENTENCODING'] = 'utf8'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import chat, auth, documents, user_chat, profile, stats
from app.core.database import engine, Base
from app.models import user, chat as chat_model, user_chat as user_chat_model

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RAG AI Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1/auth",       tags=["auth"])
app.include_router(chat.router,      prefix="/api/v1/chat",        tags=["AI 채팅"])
app.include_router(documents.router, prefix="/api/v1/documents",   tags=["documents"])
app.include_router(user_chat.router, prefix="/api/v1/user-chat",   tags=["유저 채팅"])
app.include_router(profile.router,   prefix="/api/v1/profile",     tags=["프로필"])
app.include_router(stats.router,     prefix="/api/v1/stats",       tags=["통계"])

@app.get("/")
def root():
    return {"message": "RAG AI Chatbot API 🚀"}
