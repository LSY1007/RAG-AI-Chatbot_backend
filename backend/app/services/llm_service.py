from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from app.core.config import settings
from typing import List, Dict, Any, AsyncGenerator

def get_llm(temperature: float = 0.7):
    return ChatGroq(
        groq_api_key=settings.GROQ_API_KEY,
        model_name=settings.GROQ_MODEL,
        temperature=temperature,
    )

def _build_messages(question, context_docs, chat_history, persona_prompt, web_search_results):
    """공통 메시지 빌더"""
    system_parts = []
    if persona_prompt:
        system_parts.append(persona_prompt)
    else:
        system_parts.append("당신은 친절하고 정확한 AI 어시스턴트입니다.")
    if context_docs:
        context = "\n\n".join([f"[문서 {i+1}]\n{doc['content']}" for i, doc in enumerate(context_docs)])
        system_parts.append(f"\n[업로드된 문서]\n{context}\n\n문서에 없는 내용은 웹 검색 결과나 일반 지식을 활용하세요.")
    if web_search_results:
        system_parts.append(f"""
[최신 웹 검색 결과 - 반드시 활용]
{web_search_results}

⚠️ 중요 지시사항:
- 위 검색 결과에 가격/수치 정보가 있으면 반드시 그 정보를 기반으로 답변하세요.
- "정확히 알 수 없다", "확인이 필요하다" 같은 회피성 답변을 하지 마세요.
- 검색 결과를 직접 인용하며 구체적인 수치를 제공하세요.
- 검색 결과 출처 URL도 함께 언급하세요.
- 검색 결과가 있으면 그것이 현재 최신 정보입니다.""")
    messages = [SystemMessage(content="\n\n".join(system_parts))]
    for msg in chat_history[-6:]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=question))
    return messages

def generate_answer(
    question: str,
    context_docs: List[dict],
    chat_history: List[Dict[str, Any]] = [],
    persona_prompt: str = "",
    web_search_results: str = "",
) -> str:
    messages = _build_messages(question, context_docs, chat_history, persona_prompt, web_search_results)
    return get_llm().invoke(messages).content

async def stream_answer(
    question: str,
    context_docs: List[dict],
    chat_history: List[Dict[str, Any]] = [],
    persona_prompt: str = "",
    web_search_results: str = "",
) -> AsyncGenerator[str, None]:
    """스트리밍 답변 생성"""
    messages = _build_messages(question, context_docs, chat_history, persona_prompt, web_search_results)
    async for chunk in get_llm().astream(messages):
        if chunk.content:
            yield chunk.content

def generate_summary(messages: List[Dict[str, Any]], persona_prompt: str = "") -> str:
    if not messages:
        return "요약할 대화 내용이 없습니다."
    conversation = "\n".join([f"{'사용자' if m['role']=='user' else 'AI'}: {m['content']}" for m in messages])
    context = f"(설정: {persona_prompt[:100]}...)\n\n" if persona_prompt else ""
    system_prompt = """당신은 대화 요약 전문가입니다. 다음 형식으로 요약하세요:

## 📋 대화 요약
**주요 주제**: (한 줄로)

**핵심 내용**:
- (불릿 포인트로 3~5개)

**결론/액션 아이템**:
- (있다면 정리)"""
    return get_llm(temperature=0.3).invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"{context}다음 대화를 요약해주세요:\n\n{conversation}")
    ]).content
