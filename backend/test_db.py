import psycopg2

try:
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        database="rag_ai",
        user="postgres",
        password="1111"
    )
    print("✅ 연결 성공!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(cur.fetchone())
    conn.close()
except Exception as e:
    print(f"❌ 에러: {e}")

# postgres DB로도 테스트
try:
    conn2 = psycopg2.connect(
        host="127.0.0.1",
        port=5432,
        database="postgres",
        user="postgres",
        password="1111"
    )
    print("✅ postgres DB 연결 성공!")
    cur2 = conn2.cursor()
    cur2.execute("SELECT datname FROM pg_database;")
    print("DB 목록:", cur2.fetchall())
    conn2.close()
except Exception as e:
    print(f"❌ postgres DB 에러: {e}")
