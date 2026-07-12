from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.sql import func
from database import Base

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), nullable=False)
    role = Column(Enum("user", "bot"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UsageAnalytics(Base):
    __tablename__ = "usage_analytics"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), nullable=False)
    question = Column(Text, nullable=False)
    topic = Column(Enum("MT", "SAF", "FAF", "other"), default="other")
    response_time_ms = Column(Integer)
    retrieval_success = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    chat_history_id = Column(Integer, ForeignKey("chat_history.id"))
    session_id = Column(String(64), nullable=False)
    rating = Column(Enum("up", "down"), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())