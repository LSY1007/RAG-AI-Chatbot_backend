import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from typing import List
import uuid

chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)

# 무료 로컬 임베딩 모델 (인터넷 연결 첫 실행 시 자동 다운로드 ~90MB)
def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

def get_vectorstore(collection_name: str = "documents"):
    return Chroma(
        client=chroma_client,
        collection_name=collection_name,
        embedding_function=get_embeddings()
    )

def split_text(text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
    )
    return splitter.split_text(text)

def add_documents(texts: List[str], metadatas: List[dict], collection_name: str = "documents") -> int:
    vectorstore = get_vectorstore(collection_name)
    ids = [str(uuid.uuid4()) for _ in texts]
    vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    return len(texts)

def search_documents(query: str, user_id: int, room_id: int, k: int = 4) -> List[dict]:
    """채팅방별 문서 검색"""
    vectorstore = get_vectorstore()
    try:
        results = vectorstore.similarity_search_with_score(
            query=query,
            k=k,
            filter={
                "$and": [
                    {"user_id": str(user_id)},
                    {"room_id": str(room_id)}
                ]
            }
        )
    except Exception:
        results = []

    return [
        {
            "content": doc.page_content,
            "metadata": doc.metadata,
            "score": float(score)
        }
        for doc, score in results
    ]

def delete_documents_by_room(user_id: int, room_id: int, filename: str = None):
    """채팅방의 문서 삭제"""
    vectorstore = get_vectorstore()
    try:
        where = {"$and": [{"user_id": str(user_id)}, {"room_id": str(room_id)}]}
        if filename:
            where = {"$and": [{"user_id": str(user_id)}, {"room_id": str(room_id)}, {"filename": filename}]}
        vectorstore._collection.delete(where=where)
    except Exception:
        pass
