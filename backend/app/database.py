import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.db_config import get_current_db_url

load_dotenv()

db_url = get_current_db_url()

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=2
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_engine():
    return engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()