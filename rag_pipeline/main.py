"""
main.py
-------
FastAPI backend for the ABC Testing Chatbot. Wraps the RAG logic from
rag_chat.py into a web server your frontend can call, and logs every
exchange to MySQL (chat_history + usage_analytics).

Usage:
    uvicorn main:app --reload
"""

import time
import os
os.environ["HF_HUB_OFFLINE"] = "1"
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import ChatHistory, UsageAnalytics, Feedback
from rag_chat import load_retriever, build_prompt, ask_lm_studio

app = FastAPI()

# Allow your HTML/React frontend (running on a different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for localhost demo; restrict later if needed
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the retriever once when the server starts, not on every request
retriever = load_retriever()


class ChatRequest(BaseModel):
    message: str
    session_id: str


def detect_topic(chunks):
    """Look at which source file(s) were retrieved to tag the topic."""
    for c in chunks:
        filename = (c.metadata.get("file_name") or "").lower()
        if "mt" in filename:
            return "MT"
        if "saf" in filename:
            return "SAF"
        if "faf" in filename:
            return "FAF"
    return "other"


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    start_time = time.time()

    chunks = retriever.retrieve(request.message)
    prompt = build_prompt(request.message, chunks)
    answer = ask_lm_studio(prompt)

    response_time_ms = int((time.time() - start_time) * 1000)
    topic = detect_topic(chunks)
    sources = list({c.metadata.get("file_name") for c in chunks})

    # Save both sides of the conversation
    db.add(ChatHistory(session_id=request.session_id, role="user", message=request.message))
    bot_entry = ChatHistory(session_id=request.session_id, role="bot", message=answer)
    db.add(bot_entry)

    # Log analytics
    db.add(UsageAnalytics(
        session_id=request.session_id,
        question=request.message,
        topic=topic,
        response_time_ms=response_time_ms,
        retrieval_success=bool(chunks),
    ))
    db.commit()
    db.refresh(bot_entry)  # so we can return its id for feedback later

    return {
        "answer": answer,
        "sources": sources,
        "message_id": bot_entry.id,  # frontend will need this for thumbs up/down later
    }


class FeedbackRequest(BaseModel):
    message_id: int
    session_id: str
    rating: str  # "up" or "down"
    comment: str | None = None


@app.post("/feedback")
def feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    if request.rating not in ("up", "down"):
        return {"error": "rating must be 'up' or 'down'"}

    # Remove any prior rating for this same message + session, so only
    # the latest rating is ever kept (an "upsert" instead of piling up rows).
    db.query(Feedback).filter(
        Feedback.chat_history_id == request.message_id,
        Feedback.session_id == request.session_id,
    ).delete()

    entry = Feedback(
        chat_history_id=request.message_id,
        session_id=request.session_id,
        rating=request.rating,
        comment=request.comment,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"status": "saved", "feedback_id": entry.id}