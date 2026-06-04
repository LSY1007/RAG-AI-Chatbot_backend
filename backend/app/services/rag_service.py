from app.services.vector_service import search_documents, add_documents, split_text
from app.services.llm_service import generate_answer, stream_answer, generate_summary
from app.services.web_search_service import search_web, format_search_results
from typing import List, Dict, Any, AsyncGenerator

def process_document(text: str, filename: str, user_id: int, room_id: int) -> int:
    chunks = split_text(text)
    metadatas = [{"user_id": str(user_id), "room_id": str(room_id), "filename": filename, "chunk_index": str(i)} for i in range(len(chunks))]
    return add_documents(texts=chunks, metadatas=metadatas)

def _prepare_search(question, user_id, room_id, web_search_enabled):
    """문서 + 웹 검색 공통 준비"""
    context_docs = search_documents(query=question, user_id=user_id, room_id=room_id, k=4)
    web_search_results, web_sources = "", []
    if web_search_enabled:
        raw = search_web(question, max_results=4)
        if raw:
            web_search_results = format_search_results(raw)
            web_sources = [{"title": r["title"], "url": r["url"]} for r in raw]
    doc_sources = [{"filename": d["metadata"].get("filename",""), "chunk_index": d["metadata"].get("chunk_index","0"), "score": round(d["score"],4)} for d in context_docs]
    return context_docs, web_search_results, web_sources, doc_sources

def chat_with_rag(question, user_id, room_id, chat_history=[], persona_prompt="", web_search_enabled=False):
    context_docs, web_search_results, web_sources, doc_sources = _prepare_search(question, user_id, room_id, web_search_enabled)
    answer = generate_answer(question=question, context_docs=context_docs, chat_history=chat_history, persona_prompt=persona_prompt, web_search_results=web_search_results)
    return {"answer": answer, "sources": doc_sources, "web_sources": web_sources}

async def stream_rag(question, user_id, room_id, chat_history=[], persona_prompt="", web_search_enabled=False):
    """스트리밍 RAG: (generator, sources, web_sources) 반환"""
    context_docs, web_search_results, web_sources, doc_sources = _prepare_search(question, user_id, room_id, web_search_enabled)
    gen = stream_answer(question=question, context_docs=context_docs, chat_history=chat_history, persona_prompt=persona_prompt, web_search_results=web_search_results)
    return gen, doc_sources, web_sources

def summarize_chat(messages, persona_prompt=""):
    return generate_summary(messages, persona_prompt)
