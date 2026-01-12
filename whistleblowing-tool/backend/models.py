from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import secrets

Base = declarative_base()

class Case(Base):
    """Whistleblowing-Meldung (Fall)"""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True)  # Anonymer Zugriffs-Token
    initial_report = Column(Text)  # Erste Meldung
    status = Column(String(20), default="pending")  # pending, analyzing, green, yellow, red, closed
    risk_category = Column(String(10))  # green, yellow, red
    ai_assessment = Column(Text)  # KI-Bewertung und Einschätzung
    is_complete = Column(Boolean, default=False)  # Sachverhalt vollständig erfasst?
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    messages = relationship("Message", back_populates="case", cascade="all, delete-orphan")

    @staticmethod
    def generate_token():
        """Generiert einen sicheren anonymen Token"""
        return secrets.token_urlsafe(48)


class Message(Base):
    """Nachricht in einem Fall"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    sender = Column(String(20))  # whistleblower, ai, compliance
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="messages")
