"""
웹 검색 서비스 - DuckDuckGo 무료 API
"""
from typing import List, Dict

def search_web(query: str, max_results: int = 6) -> List[Dict]:
    """DuckDuckGo로 웹 검색"""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(
                query,
                max_results=max_results,
                region='kr-kr',        # 한국 지역 결과 우선
                safesearch='off',
                timelimit='m',         # 최근 1달 이내 결과
            ))
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
            }
            for r in results
        ]
    except Exception as e:
        print(f"[WebSearch] 오류: {e}")
        # timelimit 없이 재시도
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results, region='kr-kr'))
            return [{"title": r.get("title",""), "url": r.get("href",""), "snippet": r.get("body","")} for r in results]
        except:
            return []

def format_search_results(results: List[Dict]) -> str:
    """검색 결과를 LLM이 읽기 좋게 포맷"""
    if not results:
        return "검색 결과를 찾을 수 없습니다."
    lines = ["아래는 최신 웹 검색 결과입니다. 이 정보를 바탕으로 답변하세요:\n"]
    for i, r in enumerate(results, 1):
        lines.append(f"[출처 {i}] {r['title']}")
        lines.append(f"URL: {r['url']}")
        lines.append(f"내용: {r['snippet']}")
        lines.append("")
    return "\n".join(lines)
