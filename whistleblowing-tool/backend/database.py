from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./whistleblowing.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialisiert die Datenbank"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency für FastAPI zur Bereitstellung der DB-Session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
