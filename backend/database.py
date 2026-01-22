# database.py
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =========================
# データベース接続URL
# =========================
# SQLiteを使用（同じディレクトリに growth_road.db を作成）
DATABASE_URL = "sqlite:///./growth_road.db"

# =========================
# エンジン作成
# =========================
# SQLAlchemyがDBと通信するためのエンジン
# check_same_thread=False は
# FastAPIのようなマルチスレッド環境でSQLiteを使うために必要
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite専用設定
)

# =========================
# セッション作成
# =========================
# DB操作用のセッションを生成するファクトリ
# autocommit=False → 手動でcommitする
# autoflush=False → 明示的にflushするまでSQLを送らない
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# =========================
# モデルの基底クラス
# =========================
# このBaseを継承してORMモデル（テーブル）を定義する
Base = declarative_base()


# =========================
# DBセッション取得用（FastAPI依存関係）
# =========================
# 各リクエストごとにDBセッションを生成し
# 処理終了後に必ずクローズする
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
