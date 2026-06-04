# RAG AI Chatbot

> 문서 기반 AI 채팅 + 실시간 소셜 플랫폼  
> **3차 개인 프로젝트** | ⚡ **바이브 코딩** (Claude AI 페어 프로그래밍) | 🤖 **LLM 활용**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React Native](https://img.shields.io/badge/React_Native-Expo_54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)

---

## 📌 프로젝트 소개

RAG AI Chatbot은 **문서 기반 AI 채팅**과 **실시간 소셜 채팅**을 통합한 풀스택 플랫폼입니다.  
LangChain·Groq·ChromaDB 등 AI 기술 스택을 직접 설계·구현하여 LLM 풀스택 역량을 증명하는 취업 포트폴리오 프로젝트입니다.

> ⚡ **바이브 코딩이란?**  
> 이 프로젝트는 **Claude AI와 전 과정 페어 프로그래밍**으로 개발되었습니다.  
> 설계 → 구현 → 디버깅 → 리팩토링의 모든 과정에서 LLM을 적극 활용하여  
> AI 도구의 실무 활용 역량을 직접 증명한 프로젝트입니다.

### 개발 정보

| 항목 | 내용 |
|------|------|
| 개발 기간 | 2025.11 ~ 2026.02 (4개월) |
| 개발 인원 | 1인 (개인 프로젝트) |
| 개발 방식 | 바이브 코딩 (Claude AI 페어 프로그래밍) |
| 담당 역할 | 기획 / AI 파이프라인 / 백엔드 / 웹 프론트 / 모바일 앱 전체 |

---

## 🏗 시스템 아키텍처

### 전체 구조도
```mermaid
graph TB
    subgraph "클라이언트"
        A1[사용자<br/>Web Browser]
        A2[사용자<br/>Mobile App]
    end

    subgraph "Frontend Layer"
        B[Web Frontend<br/>React + TypeScript<br/>Port: 5173]
        B1[Zustand<br/>상태관리]
        B2[Axios<br/>HTTP 클라이언트]
        B3[React Router<br/>라우팅]
        B4[WebSocket Client<br/>실시간 채팅]
        B5[SSE Client<br/>AI 스트리밍]
    end

    subgraph "Mobile Layer"
        M[Mobile App<br/>React Native + Expo<br/>SDK 54]
        M1[expo-router<br/>파일 기반 라우팅]
        M2[expo-secure-store<br/>토큰 저장]
    end

    subgraph "Backend Layer"
        C[Backend<br/>FastAPI + Python<br/>Port: 8000]
        C1[JWT Auth<br/>인증/인가]
        C2[SQLAlchemy<br/>ORM]
        C3[WebSocket Manager<br/>실시간 채팅]
        C4[SSE Streaming<br/>AI 응답 스트리밍]
    end

    subgraph "AI Layer"
        D1[LangChain<br/>RAG 파이프라인]
        D2[Groq API<br/>llama3-8b-8192]
        D3[HuggingFace<br/>임베딩 모델]
        D4[DuckDuckGo<br/>실시간 웹 검색]
    end

    subgraph "Data Layer"
        E1[(PostgreSQL<br/>유저/채팅/문서)]
        E2[(ChromaDB<br/>벡터 저장소)]
        E3[File Storage<br/>문서/프로필이미지]
    end

    A1 -->|HTTPS| B
    A2 -->|HTTPS| M
    B --> B1 & B2 & B3 & B4 & B5
    M --> M1 & M2

    B4 -.->|WebSocket| C3
    B5 -.->|SSE| C4
    B -->|REST API| C
    M -->|REST API| C

    C --> C1 & C2 & C3 & C4
    C --> D1
    D1 --> D2 & D3 & D4

    C -->|JPA/SQLAlchemy| E1
    D3 -->|임베딩 저장| E2
    C -->|File I/O| E3

    style A1 fill:#e1f5ff
    style A2 fill:#e8f5e9
    style B fill:#fff4e1
    style M fill:#f3ffe1
    style C fill:#e8f5e9
    style D1 fill:#f3e5f5
    style E1 fill:#ffebee
    style E2 fill:#fce4ec
```

### 상세 데이터 흐름

#### 1️⃣ RAG AI 채팅 (SSE 스트리밍)
```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant B as FastAPI
    participant V as ChromaDB
    participant W as DuckDuckGo
    participant L as Groq LLM

    U->>F: 질문 입력
    F->>B: POST /api/v1/chat/stream<br/>(Authorization: Bearer JWT)

    B->>V: 벡터 유사도 검색<br/>filter: user_id + room_id, k=4
    V-->>B: 관련 문서 청크 반환

    alt 웹 검색 활성화
        B->>W: DuckDuckGo 실시간 검색<br/>region=kr-kr, timelimit=m
        W-->>B: 검색 결과 (최대 6개)
    end

    B->>L: LangChain astream() 호출<br/>(문서컨텍스트 + 웹검색결과 주입)

    loop SSE 스트리밍
        L-->>B: 텍스트 청크
        B-->>F: data: {"type":"chunk","content":"..."}
        F-->>U: 타이핑 효과 실시간 렌더링
    end

    B-->>F: data: {"type":"done","sources":[...]}
    B->>B: 메시지 DB 저장 (PostgreSQL)
    F-->>U: 출처 문서/URL 표시
```

#### 2️⃣ 문서 업로드 및 임베딩
```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant B as FastAPI
    participant P as 파일 파서
    participant E as HuggingFace
    participant V as ChromaDB
    participant DB as PostgreSQL

    U->>F: 파일 선택 (PDF/DOCX/XLSX/PPTX/HWP)
    F->>B: POST /api/v1/documents/upload<br/>(multipart/form-data)

    B->>P: 파일 형식별 파서 호출
    Note over P: PDF → pypdf<br/>DOCX → python-docx<br/>XLSX → openpyxl<br/>HWP → hwp5txt
    P-->>B: 원시 텍스트 추출

    B->>B: RecursiveCharacterTextSplitter<br/>청크 분할 (size=1000, overlap=200)

    B->>E: 청크 배열 임베딩 요청
    Note over E: all-MiniLM-L6-v2<br/>384차원 벡터
    E-->>B: 벡터 배열 반환

    B->>V: 벡터 + 메타데이터 저장
    Note over V: metadata: user_id,<br/>room_id, filename, chunk_index
    B->>DB: 문서 정보 저장 (chunk_count)

    B-->>F: {"chunk_count": N, "document_id": id}
    F-->>U: 문서 목록 업데이트
```

#### 3️⃣ 실시간 유저 채팅 (WebSocket)
```mermaid
sequenceDiagram
    participant A as 사용자 A
    participant B as 사용자 B
    participant FA as Frontend A
    participant FB as Frontend B
    participant WS as WebSocket Manager
    participant DB as PostgreSQL

    A->>FA: 메시지 입력 → Enter
    FA->>WS: {"type":"message","content":"안녕하세요"}

    WS->>DB: UserChatMessage 저장
    WS-->>FA: {"type":"message","data":{...}} (자신)
    WS-->>FB: {"type":"message","data":{...}} (브로드캐스트)
    FB-->>B: 실시간 메시지 표시

    Note over FA,WS: 타이핑 인디케이터
    FA->>WS: {"type":"typing"}
    WS-->>FB: {"type":"typing","data":{"username":"사용자A"}}
    FB-->>B: "사용자A 입력 중..." 표시 (3초 후 자동 해제)

    Note over FA,WS: 이모지 리액션
    FA->>WS: {"type":"reaction","message_id":1,"emoji":"👍"}
    WS->>DB: MessageReaction 토글 저장
    WS-->>FB: {"type":"reaction_updated","reactions":{...}}
    FB-->>B: 리액션 카운트 업데이트

    Note over FA,WS: 읽음 확인
    FA->>WS: {"type":"read"}
    WS->>DB: message_reads 업데이트
    WS-->>FA: {"type":"read_updated"}
```

#### 4️⃣ 인증 흐름
```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant B as FastAPI
    participant DB as PostgreSQL

    U->>F: 이메일/비밀번호 입력
    F->>B: POST /api/v1/auth/login
    B->>DB: 사용자 조회 (email)
    DB-->>B: 사용자 정보

    B->>B: BCrypt 비밀번호 검증
    B->>B: JWT 토큰 생성 (HS256)
    B-->>F: {"access_token":"eyJ...","user":{...}}

    F->>F: sessionStorage.setItem('access_token', token)
    F-->>U: 메인 채팅 화면으로 이동

    Note over F,B: 이후 모든 인증 요청
    F->>B: Authorization: Bearer {access_token}
    B->>B: JWT decode → user_id 추출
    B-->>F: 정상 응답

    alt 토큰 만료 또는 없음
        B-->>F: 401 Unauthorized
        F->>F: sessionStorage 초기화
        F-->>U: 로그인 페이지로 리다이렉트
    end
```

#### 5️⃣ 알림 흐름
```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as Frontend
    participant NWS as 알림 WebSocket
    participant B as Backend
    participant DB as PostgreSQL

    U->>F: 로그인
    F->>NWS: WebSocket 연결<br/>/api/v1/user-chat/notifications?token=JWT
    NWS-->>F: 연결 성공

    Note over F,NWS: 친구 요청 수신 시
    B->>DB: 친구 요청 저장
    B->>NWS: 알림 발송
    NWS-->>F: {"type":"friend_request","data":{...}}
    F-->>U: 토스트 알림 + 배지 카운트

    Note over F,NWS: 새 메시지 수신 시
    B->>DB: 메시지 저장
    B->>NWS: 알림 발송
    NWS-->>F: {"type":"new_message","data":{...}}
    F-->>U: 사이드바 배지 카운트 증가
```

## 기술 스택 매핑
```mermaid
graph LR
    subgraph "Web Frontend Stack"
        A1[React 18]
        A2[TypeScript 5]
        A3[Vite]
        A4[Zustand 4]
        A5[TailwindCSS 3]
        A6[Axios]
        A7[Recharts]
        A8[react-markdown]
    end

    subgraph "Backend Stack"
        B1[Python 3.11]
        B2[FastAPI]
        B3[SQLAlchemy 2]
        B4[python-jose JWT]
        B5[BCrypt]
        B6[Uvicorn]
        B7[Alembic]
    end

    subgraph "AI Stack"
        C1[LangChain]
        C2[Groq API]
        C3[llama3-8b-8192]
        C4[HuggingFace]
        C5[sentence-transformers]
        C6[ChromaDB]
        C7[duckduckgo-search]
    end

    subgraph "Mobile Stack"
        D1[React Native]
        D2[Expo SDK 54]
        D3[expo-router]
        D4[expo-secure-store]
        D5[expo-image-picker]
    end

    subgraph "Database"
        E1[(PostgreSQL 15)]
        E2[(ChromaDB)]
    end

    style A1 fill:#61dafb,color:#000
    style B2 fill:#009688,color:#fff
    style C1 fill:#1c3c5a,color:#fff
    style D2 fill:#000020,color:#fff
    style E1 fill:#336791,color:#fff
```

---

## 🛠 기술 스택

### Backend (AI / API)

| 분류 | 기술 | 버전 |
|------|------|------|
| 언어 | Python | 3.11 |
| 프레임워크 | FastAPI + Uvicorn | 0.104 |
| AI / RAG | LangChain | 0.1.x |
| LLM | Groq API (llama3-8b-8192) | - |
| 임베딩 | HuggingFace sentence-transformers/all-MiniLM-L6-v2 | - |
| 벡터 DB | ChromaDB | 0.4.x |
| 웹 검색 | duckduckgo-search | - |
| 실시간 | WebSocket, SSE (Server-Sent Events) | - |
| 인증 | python-jose (JWT HS256), BCrypt | - |
| ORM | SQLAlchemy | 2.x |
| 마이그레이션 | Alembic | - |

### Database

| 분류 | 기술 |
|------|------|
| 관계형 DB | PostgreSQL 15 |
| 벡터 DB | ChromaDB (로컬 영속 저장) |

### Web Frontend

| 분류 | 기술 | 버전 |
|------|------|------|
| 언어 | TypeScript | 5 |
| 프레임워크 | React + Vite | 18 |
| 상태 관리 | Zustand | 4.x |
| 스타일링 | TailwindCSS | 3.x |
| 시각화 | Recharts | - |
| HTTP | Axios | 1.x |
| 마크다운 | react-markdown | - |

### Mobile App

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | React Native | 0.76 |
| 플랫폼 | Expo | SDK 54.0.34 |
| 라우팅 | expo-router | 4.x |
| 보안 저장 | expo-secure-store | - |
| 이미지 | expo-image-picker | - |

---

## 📂 프로젝트 구조

### Backend (`/backend`)
```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py             # 인증 (로그인/회원가입/내정보)
│   │       ├── chat.py             # AI 채팅 (SSE 스트리밍/페르소나/요약)
│   │       ├── documents.py        # 문서 업로드/파싱/임베딩
│   │       ├── user_chat.py        # 유저 채팅 (WebSocket/리액션/친구)
│   │       ├── profile.py          # 프로필 (이미지/상태메시지/온라인)
│   │       └── stats.py            # 통계/관리자 API
│   │
│   ├── core/
│   │   ├── config.py               # 환경변수 (Pydantic Settings)
│   │   ├── database.py             # DB 연결 (SQLAlchemy + Alembic)
│   │   └── security.py             # JWT 생성/검증 유틸
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                 # User (id, email, is_admin, profile_image)
│   │   ├── chat.py                 # ChatRoom, ChatMessage, Document
│   │   └── user_chat.py            # UserChatRoom, UserChatMessage,
│   │                               #   MessageReaction, Friendship, MessageRead
│   │
│   ├── services/
│   │   ├── llm_service.py          # Groq LLM (스트리밍/일반/요약)
│   │   ├── rag_service.py          # RAG 파이프라인 통합
│   │   ├── vector_service.py       # ChromaDB CRUD
│   │   ├── persona_service.py      # AI 페르소나 6종 시스템 프롬프트
│   │   ├── web_search_service.py   # DuckDuckGo 실시간 검색
│   │   └── websocket_manager.py    # WS 연결 관리 (채팅방/알림)
│   │
│   └── main.py                     # FastAPI 앱 + CORS + 라우터 등록
│
├── requirements.txt
└── .env
```

### Web Frontend (`/web`)
```
web/
├── src/
│   ├── api/
│   │   ├── axios.ts                # Axios 인스턴스 (401 인터셉터/토큰 자동 주입)
│   │   └── index.ts                # API 함수 모음 (chatApi, userChatApi, statsApi...)
│   │
│   ├── stores/                     # Zustand 상태 관리
│   │   ├── authStore.ts            # 인증 (login/logout/user/is_admin)
│   │   ├── chatStore.ts            # AI 채팅 (SSE 스트리밍/방 관리/문서)
│   │   ├── userChatStore.ts        # 유저 채팅 (WS/타이핑 인디케이터/리액션)
│   │   ├── profileStore.ts         # 프로필 (이미지/상태메시지)
│   │   ├── notificationStore.ts    # 실시간 알림 (toast/배지 카운트)
│   │   └── themeStore.ts           # 다크/라이트 모드 (localStorage 저장)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx         # 사이드바 (채팅목록/대시보드 버튼/친구)
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx      # AI 채팅창 (스트리밍/퀵스타트 6종 카드)
│   │   │   ├── DocumentPanel.tsx   # 문서 업로드/목록/삭제
│   │   │   └── RoomSettingsPanel.tsx # 채팅방 설정 (페르소나/웹검색 토글)
│   │   └── profile/
│   │       ├── ProfileModal.tsx    # 프로필 편집 모달
│   │       └── Avatar.tsx          # 아바타 (이미지/이니셜 폴백)
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx           # 로그인/회원가입 탭
│   │   ├── ChatPage.tsx            # 메인 페이지 (AI탭/유저탭 전환)
│   │   ├── UserChatPage.tsx        # 유저 채팅 (검색/이미지미리보기/타이핑)
│   │   └── DashboardPage.tsx       # 통계 대시보드 (내 통계/관리자 탭)
│   │
│   ├── types/
│   │   └── index.ts                # 전역 타입 정의
│   │
│   ├── App.tsx                     # 테마 초기화 / 알림 WS 연결 / 라우팅
│   └── index.css                   # TailwindCSS + 타이핑 애니메이션
│
├── tailwind.config.js              # darkMode: 'class'
├── vite.config.ts
└── package.json
```

### Mobile App (`/mobile`)
```
mobile/
├── app/
│   ├── _layout.tsx                 # AuthGate + 초기화 스피너
│   ├── index.tsx                   # Redirect to (tabs)
│   ├── login.tsx                   # 로그인/회원가입 화면
│   └── (tabs)/
│       ├── _layout.tsx             # 하단 탭 바 (AI채팅/유저채팅/프로필)
│       ├── index.tsx               # AI 채팅 (SSE 스트리밍 직접 구현)
│       ├── chat.tsx                # 유저 채팅 (WebSocket)
│       └── profile.tsx             # 프로필 관리 (이미지 변경/상태메시지)
│
├── src/
│   ├── config.ts                   # API_BASE 주소 설정 (IP 직접 입력)
│   ├── api.ts                      # Axios + API 함수
│   └── authStore.ts                # expo-secure-store 기반 토큰 관리
│
├── app.json                        # newArchEnabled: false
├── babel.config.js                 # reanimated 플러그인 제거
└── package.json                    # expo: "54.0.34"
```

---

## ✨ 핵심 기능

### 1. RAG 파이프라인

#### 지원 문서 형식
PDF, DOCX, XLSX, PPTX, HWP, TXT

#### 처리 과정
```python
# 1. 문서 파싱 → 청크 분할 → 임베딩 → ChromaDB 저장
def process_document(text: str, filename: str, user_id: int, room_id: int) -> int:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200
    )
    chunks = splitter.split_text(text)
    metadatas = [
        {
            "user_id": str(user_id),
            "room_id": str(room_id),
            "filename": filename,
            "chunk_index": str(i)
        }
        for i in range(len(chunks))
    ]
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    return len(chunks)

# 2. 질문 시 유사도 검색 (user_id + room_id 필터로 격리)
def search_documents(query: str, user_id: int, room_id: int, k: int = 4):
    return vectorstore.similarity_search_with_score(
        query, k=k,
        filter={"user_id": str(user_id), "room_id": str(room_id)}
    )
```

### 2. SSE 스트리밍 응답

```python
# Backend: asyncio.sleep(0)으로 버퍼링 방지
@router.post("/stream")
async def chat_stream(request: ChatRequest, current_user: User = Depends(get_current_user)):
    gen, doc_sources, web_sources = await stream_rag(
        question=request.question,
        user_id=current_user.id,
        room_id=room.id,
        web_search_enabled=room.web_search_enabled
    )

    async def event_stream():
        yield f"data: {json.dumps({'type': 'room_id', 'room_id': room.id})}\n\n"
        full_answer = []
        async for chunk in gen:
            full_answer.append(chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            await asyncio.sleep(0)  # 이벤트 루프 양보 (버퍼 flush 보장)
        # 응답 완료 후 DB 저장
        db.add(ChatMessage(content="".join(full_answer), ...))
        yield f"data: {json.dumps({'type': 'done', 'sources': doc_sources})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"}
    )
```

```typescript
// Frontend: ReadableStream으로 청크 단위 수신
const response = await fetch('/api/v1/chat/stream', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, room_id: currentRoomId }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '', fullContent = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') {
            fullContent += data.content;
            set({ streamingContent: fullContent }); // Zustand 실시간 업데이트
        } else if (data.type === 'done') {
            const aiMsg = { role: 'assistant', content: fullContent, sources: data.sources };
            set(s => ({ messages: [...s.messages, aiMsg], isStreaming: false }));
        }
    }
}
```

### 3. AI 페르소나 (6종)

| 페르소나 | 아이콘 | 역할 |
|----------|--------|------|
| 기본 AI | 🤖 | 범용 어시스턴트 |
| 면접관 | 👔 | 기술 면접 연습 (질문/피드백) |
| 영어 튜터 | 🗣️ | 영어 회화 & 문법 교정 |
| 코드 리뷰어 | 💻 | 버그/성능/보안 코드 개선 제안 |
| 글쓰기 코치 | ✍️ | 자기소개서/블로그 다듬기 |
| 토론 파트너 | ⚖️ | 논리력·비판적 사고 훈련 |
| 커스텀 | ⚙️ | 사용자 직접 프롬프트 설정 |

```python
# persona_service.py
PERSONAS: dict[str, dict] = {
    "default": {
        "name": "기본 AI",
        "prompt": "당신은 친절하고 정확한 AI 어시스턴트입니다."
    },
    "interviewer": {
        "name": "면접관",
        "prompt": "당신은 10년 경력의 시니어 개발자 면접관입니다. "
                  "기술적 깊이 있는 질문을 하고 답변을 평가해주세요."
    },
    "english_tutor": {
        "name": "영어 튜터",
        "prompt": "You are a professional English tutor. "
                  "Correct grammar mistakes and suggest more natural expressions."
    },
    "code_reviewer": {
        "name": "코드 리뷰어",
        "prompt": "당신은 시니어 소프트웨어 엔지니어입니다. "
                  "버그, 성능, 보안, 가독성 관점에서 코드를 리뷰해주세요."
    },
    "writer": {
        "name": "글쓰기 코치",
        "prompt": "당신은 전문 작가이자 편집자입니다. "
                  "글의 흐름, 표현, 설득력을 개선해주세요."
    },
    "debate": {
        "name": "토론 파트너",
        "prompt": "당신은 논리학과 비판적 사고 전문가입니다. "
                  "날카로운 반론을 제기하고 논리적 오류를 지적해주세요."
    },
}
```

### 4. 실시간 유저 채팅 (WebSocket)

```python
# Backend: WebSocket 이벤트 처리
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, room_id: int, token: str, db: Session = Depends(get_db)
):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)  # 인증 실패
        return

    user = db.query(User).filter(User.id == payload["sub"]).first()
    await manager.connect(websocket, room_id, user.id)

    try:
        async for data in websocket.iter_text():
            payload = json.loads(data)
            match payload.get("type"):
                case "message":
                    msg = UserChatMessage(
                        room_id=room_id, user_id=user.id,
                        content=payload["content"],
                        reply_to_id=payload.get("reply_to_id")
                    )
                    db.add(msg)
                    db.commit()
                    await manager.broadcast(room_id, {"type": "message", "data": msg_to_dict(msg)})

                case "typing":
                    await manager.broadcast(
                        room_id,
                        {"type": "typing", "data": {"user_id": user.id, "username": user.username}},
                        exclude_user_id=user.id
                    )

                case "reaction":
                    reactions = await toggle_reaction(db, payload["message_id"], payload["emoji"], user)
                    await manager.broadcast(room_id, {"type": "reaction_updated", "data": reactions})

                case "read":
                    await mark_messages_read(db, room_id, user.id)
    finally:
        manager.disconnect(websocket, room_id, user.id)
```

```typescript
// Frontend: Zustand store에서 WebSocket 관리
connectWs: (roomId: number, token: string) => {
    const socket = new WebSocket(
        `ws://localhost:8000/api/v1/user-chat/ws/${roomId}?token=${token}`
    );

    socket.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        switch (type) {
            case 'message':
                set(s => ({ messages: [...s.messages, data] }));
                break;
            case 'typing':
                set(s => ({ typingUsers: [...s.typingUsers, data] }));
                // 3초 후 자동 해제
                setTimeout(() => {
                    set(s => ({
                        typingUsers: s.typingUsers.filter(u => u.user_id !== data.user_id)
                    }));
                }, 3000);
                break;
            case 'reaction_updated':
                set(s => ({
                    messages: s.messages.map(m =>
                        m.id === data.message_id ? { ...m, reactions: data.reactions } : m
                    )
                }));
                break;
        }
    };

    // 재연결 로직 (만료 토큰 제외)
    socket.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 4001) {
            const t = sessionStorage.getItem('access_token');
            if (t) setTimeout(() => connectWs(roomId, t), 3000);
        }
    };

    set({ socket, currentRoomId: roomId });
},
```

#### 지원 기능
- ✅ 실시간 메시지 송수신
- ✅ 타이핑 인디케이터 (3초 자동 해제)
- ✅ 이모지 리액션 8종 (👍❤️😂😮😢🔥🎉👀)
- ✅ 메시지 답장 / 수정 / 소프트 삭제
- ✅ 읽음 확인 (readers_needed 기반)
- ✅ 이미지 인라인 미리보기 (jpg/png/gif/webp)
- ✅ 파일 공유 (최대 10MB)
- ✅ 메시지 검색 (키워드 하이라이트 + 스크롤 이동)
- ✅ 친구 추가 / 수락 / 거절

### 5. 관리자 대시보드

```python
# stats.py - 관리자 권한 미들웨어
def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    user = get_current_user(credentials, db)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return user

@router.get("/admin/overview")
def get_admin_overview(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # 14일 차트 데이터, Top 5 유저, 전체 통계
    ...
```

```typescript
// DashboardPage.tsx - is_admin 기반 탭 분기
const DashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [tab, setTab] = useState<'my' | 'admin'>('my');

    return (
        <div>
            <div className="flex gap-2">
                <button onClick={() => setTab('my')}>👤 내 통계</button>
                {user?.is_admin && (
                    <button onClick={() => setTab('admin')}>🛡 관리자</button>
                )}
            </div>
            {tab === 'my' ? <MyStats /> : <AdminStats />}
        </div>
    );
};
```

#### 내 통계 (일반 유저)
- 최근 7일 AI/유저 채팅 영역 차트 (AreaChart)
- 문서 타입별 파이차트 (PieChart)
- 페르소나 사용 현황 막대차트 (BarChart)

#### 관리자 전용
- 전체 유저/메시지/문서 통계 (14일 AreaChart)
- 유저 관리 테이블 (활성/비활성 / 관리자 권한 토글)
- 현재 접속자 실시간 표시
- AI/유저 채팅 Top 5 유저 랭킹

---

## 📡 API 엔드포인트

### 인증 (`/api/v1/auth`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/register` | 회원가입 | ❌ |
| POST | `/login` | 로그인 | ❌ |
| GET | `/me` | 내 정보 조회 | ✅ |

```json
// POST /api/v1/auth/login 요청
{ "email": "user@example.com", "password": "password123" }

// 응답
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "이상연",
    "is_admin": false,
    "profile_image": null
  }
}
```

### AI 채팅 (`/api/v1/chat`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/personas` | 페르소나 목록 | ❌ |
| GET | `/rooms` | 채팅방 목록 | ✅ |
| POST | `/rooms` | 채팅방 생성 | ✅ |
| DELETE | `/rooms/{id}` | 채팅방 삭제 | ✅ |
| GET | `/history` | 대화 기록 | ✅ |
| **POST** | **`/stream`** | **SSE 스트리밍 채팅** | ✅ |
| PUT | `/rooms/{id}/settings` | 페르소나/웹검색 설정 | ✅ |
| POST | `/rooms/{id}/summary` | 대화 요약 | ✅ |

### 문서 (`/api/v1/documents`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/upload` | 문서 업로드 + 임베딩 | ✅ |
| GET | `/` | 문서 목록 | ✅ |
| DELETE | `/{id}` | 문서 삭제 + 벡터 제거 | ✅ |

### 유저 채팅 (`/api/v1/user-chat`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| **WS** | **`/ws/{room_id}?token=JWT`** | **WebSocket 채팅** |
| WS | `/notifications?token=JWT` | 실시간 알림 |
| GET | `/rooms` | 채팅방 목록 |
| POST | `/rooms` | 채팅방 생성 |
| POST | `/rooms/dm/{friend_id}` | DM 방 생성 |
| GET | `/friends` | 친구 목록 |
| POST | `/friends/request/{id}` | 친구 요청 |
| POST | `/friends/accept/{id}` | 친구 수락 |
| POST | `/friends/decline/{id}` | 친구 거절 |
| GET | `/users/search` | 유저 검색 |
| POST | `/{room_id}/messages/{id}/reaction` | 리액션 토글 |

### 통계/관리자 (`/api/v1/stats`)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/my` | 내 활동 통계 (7일) | 일반 |
| GET | `/admin/overview` | 전체 현황 (14일) | 관리자 |
| GET | `/admin/users` | 유저 목록 + 통계 | 관리자 |
| PATCH | `/admin/users/{id}/toggle` | 활성/비활성 토글 | 관리자 |
| PATCH | `/admin/users/{id}/toggle-admin` | 관리자 권한 부여 | 관리자 |

---

## 🗄 DB 스키마

```mermaid
erDiagram
    users {
        int id PK
        string email UK
        string username UK
        string hashed_password
        boolean is_active
        boolean is_admin
        string profile_image
        string status_message
        datetime created_at
    }

    chat_rooms {
        int id PK
        int user_id FK
        string title
        string persona_id
        string persona_prompt
        boolean web_search_enabled
        datetime created_at
    }

    chat_messages {
        int id PK
        int room_id FK
        string role
        text content
        json source_documents
        json web_sources
        datetime created_at
    }

    documents {
        int id PK
        int user_id FK
        int room_id FK
        string filename
        string file_type
        int chunk_count
        datetime created_at
    }

    user_chat_rooms {
        int id PK
        string name
        string description
        int created_by FK
        datetime created_at
    }

    user_chat_members {
        int id PK
        int room_id FK
        int user_id FK
        datetime joined_at
    }

    user_chat_messages {
        int id PK
        int room_id FK
        int user_id FK
        string username
        text content
        string message_type
        int reply_to_id FK
        boolean is_deleted
        datetime edited_at
        datetime created_at
    }

    message_reactions {
        int id PK
        int message_id FK
        int room_id FK
        int user_id FK
        string username
        string emoji
    }

    message_reads {
        int id PK
        int message_id FK
        int room_id FK
        int user_id FK
        datetime read_at
    }

    friendships {
        int id PK
        int requester_id FK
        int receiver_id FK
        string status
        datetime created_at
    }

    users ||--o{ chat_rooms : "소유"
    chat_rooms ||--o{ chat_messages : "포함"
    chat_rooms ||--o{ documents : "포함"
    users ||--o{ user_chat_messages : "작성"
    user_chat_rooms ||--o{ user_chat_members : "구성원"
    user_chat_rooms ||--o{ user_chat_messages : "포함"
    user_chat_messages ||--o{ message_reactions : "받음"
    user_chat_messages ||--o{ message_reads : "읽음"
```

---

## ⚙️ 환경 변수 설정

### Backend (`.env`)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/rag_ai

# Groq AI API
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192

# JWT
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ChromaDB
CHROMA_PERSIST_DIR=./chroma_db

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### Web Frontend (`.env`)
```env
VITE_API_URL=http://localhost:8000
```

### Mobile (`src/config.ts`)
```typescript
// Android 에뮬레이터 (AVD)
export const API_BASE = 'http://10.0.2.2:8000';

// iOS 시뮬레이터
// export const API_BASE = 'http://localhost:8000';

// 실제 기기 — 터미널에서 ipconfig(Windows) / ifconfig(Mac) 확인
// export const API_BASE = 'http://192.168.x.x:8000';
```

---

## 🚀 시작하기

### 필수 요구사항
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### 1. Backend 실행
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# 패키지 설치
pip install -r requirements.txt

# DB 테이블 생성 (마이그레이션)
alembic upgrade head
# 또는: python -c "from app.core.database import Base, engine; Base.metadata.create_all(engine)"

# .env 파일 생성 후 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Web Frontend 실행
```bash
cd web
npm install
npm run dev
# http://localhost:5173
```

### 3. Mobile App 실행
```bash
cd mobile
npm install --legacy-peer-deps

# src/config.ts에서 API_BASE를 본인 PC IP로 수정
npx expo start --clear

# Expo Go 앱 → QR 스캔 (핸드폰과 PC가 같은 WiFi 필요)
```

### 4. 관리자 계정 설정
```sql
-- PostgreSQL 콘솔에서 실행
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
UPDATE users SET is_admin = TRUE WHERE email = '본인이메일@example.com';
```

---

## 🔒 보안

### 1. JWT 인증
```python
# security.py
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    return user
```

### 2. WebSocket 토큰 검증
```python
# 쿼리 파라미터로 JWT 전달 후 즉시 검증
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, token: str, ...):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)  # 인증 실패 코드
        return
    # 연결 유지
```

### 3. CORS 설정
```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # 프로덕션에서는 실제 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Axios 인터셉터
```typescript
// axios.ts - 자동 토큰 주입 + 401 처리
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            if (!url.includes('/auth/')) {
                sessionStorage.clear();
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
```

---

## 🐛 트러블슈팅

### 1. SSE 스트리밍 청크 누락

**증상**: AI 응답이 끊기거나 청크가 중간에 누락됨

**원인**: FastAPI 내부 버퍼링, Nginx 역방향 프록시 버퍼링

**해결**:
```python
async def event_stream():
    async for chunk in gen:
        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        await asyncio.sleep(0)  # 이벤트 루프 양보로 즉시 flush

return StreamingResponse(event_stream(),
    headers={
        "X-Accel-Buffering": "no",   # Nginx 버퍼링 해제
        "Cache-Control": "no-cache"
    })
```

> 📌 **배운점**: SSE는 HTTP 레벨의 버퍼링도 고려해야 하며, asyncio 이벤트 루프 양보가 핵심

### 2. ChromaDB 벡터 차원 불일치

**증상**: 임베딩 모델 변경 후 유사도 검색 결과 0개

**원인**: 기존 저장된 벡터(384차원)와 새 모델(768차원) 불일치

**해결**:
```python
# 기존 컬렉션 삭제 후 전체 재임베딩
import chromadb
client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
client.delete_collection("documents")
# 이후 문서 재업로드로 자동 재임베딩
```

> 📌 **배운점**: `.env`에 임베딩 모델 버전 고정. 모델 변경 시 반드시 마이그레이션 스크립트 작성

### 3. JWT 토큰 키 불일치 (401 반복)

**증상**: 로그인 성공 후 모든 API 요청에서 401 Unauthorized 반복

**원인**: `authStore.login(email, password)` 시그니처 불일치로 인해 email 값이 token으로 저장

**해결**:
```typescript
// authStore.ts - login() 내부에서 직접 API 호출
login: async (email: string, password: string) => {
    const data = await authApi.login(email, password);            // API 직접 호출
    sessionStorage.setItem('access_token', data.access_token);   // 올바른 토큰 저장
    set({ token: data.access_token, user: data.user });
},

// axios.ts - 동일한 키로 읽기
const token = sessionStorage.getItem('access_token');  // 'access_token' 키 통일
```

> 📌 **배운점**: 토큰 저장 키와 읽기 키를 상수로 통일 관리 필요

### 4. WebSocket 재연결 403

**증상**: 연결 끊김 후 재연결 시 403 에러 반복 발생

**원인**: `onclose` 핸들러에서 캐시된 만료 토큰으로 재연결 시도

**해결**:
```typescript
socket.onclose = (e) => {
    if (e.code !== 1000 && e.code !== 4001) {
        // 재연결 시 sessionStorage에서 항상 최신 토큰 읽기
        const t = sessionStorage.getItem('access_token');
        if (t) setTimeout(() => connectWs(roomId, t), 3000);
    }
};
```

> 📌 **배운점**: WS 재연결 시 토큰을 클로저로 캡처하지 말고 항상 저장소에서 읽어야 함

### 5. Expo SDK 버전 충돌

**증상**: `Project is incompatible with this version of Expo Go`

**원인**: package.json의 expo 버전과 디바이스의 Expo Go 앱 SDK 버전 불일치

**해결**:
```json
// package.json
{ "expo": "54.0.34" }
```
```json
// app.json - New Architecture 비활성화
{ "expo": { "newArchEnabled": false } }
```
```js
// babel.config.js - reanimated 플러그인 제거 (v3.10.1)
module.exports = { presets: ['babel-preset-expo'] };
// plugins 항목 없이
```

> 📌 **배운점**: Expo Go SDK 버전과 package.json 버전을 반드시 맞춰야 하며, newArchEnabled: false로 안정성 확보

---

## 📝 개발 가이드

### 코드 컨벤션

**Python (Backend)**
```python
# 클래스명: PascalCase
class RagService:
    # 메서드명: snake_case
    async def stream_answer(
        self,
        question: str,
        context: list[dict],
    ) -> AsyncGenerator[str, None]:
        pass

# 상수: UPPER_SNAKE_CASE
CHROMA_COLLECTION_NAME = "documents"
MAX_CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
```

**TypeScript (Frontend)**
```typescript
// 컴포넌트: PascalCase
const ChatWindow: React.FC = () => {
    // 변수/함수: camelCase
    const [streamingContent, setStreamingContent] = useState('');
    const handleSendMessage = async (question: string) => { ... };
};

// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RECONNECT_DELAY = 3000;           // 3초
```

### Git 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
chore: 빌드, 설정 변경

예시:
feat: SSE 스트리밍 AI 응답 구현
feat: AI 페르소나 6종 퀵스타트 카드 추가
fix: JWT 토큰 키 불일치 버그 수정
fix: ChromaDB 벡터 차원 불일치 재임베딩 처리
docs: README 아키텍처 Mermaid 다이어그램 추가
chore: .gitignore chroma_db, uploads 추가
```

---

## 👨‍💻 개발자 정보

| 항목 | 내용 |
|------|------|
| 이름 | 이상연 |
| 이메일 | dltkddus50@naver.com |
| GitHub | [LSY1007](https://github.com/LSY1007) |
| 학력 | 방송통신대학교 컴퓨터과학과 재학 (2026.03~) |
| 수료 | 하이미디어 JAVA 풀스택 개발자 과정 (2026.02) |

## 🔗 관련 프로젝트

| 프로젝트 | 설명 | GitHub |
|----------|------|--------|
| **OnAndHome** | 1차: Spring Boot + React 이커머스 플랫폼 | [Frontend](https://github.com/LSY1007/L_OnAndHomeFront) / [Backend](https://github.com/LSY1007/L_OnAndHomeBack) |
| **NextEnter** | 2차: AI 채용 매칭 플랫폼 (AWS 배포) | [Frontend](https://github.com/LSY1007/NextEnterFront) / [Backend](https://github.com/LSY1007/NextEnterBack) |
| **RAG AI Chatbot** | 3차: 문서 기반 AI 채팅 플랫폼 | 현재 레포 |

---

> 💡 **이 프로젝트는 Claude AI와의 바이브 코딩으로 개발되었습니다.**  
> 기획부터 구현까지 LLM을 적극 활용하여 AI 도구 실무 활용 역량을 직접 증명한 프로젝트입니다.

**RAG AI Chatbot** - LLM으로 만드는 새로운 AI 채팅 경험
