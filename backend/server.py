"""AFIFA backend — modular FastAPI app.

Modules are kept in a single file for V1 simplicity but logically grouped via
APIRouter prefixes so each module can be extracted later without API changes.

Modules:
  /api/auth         — Emergent Google session
  /api/profile      — user profile (assistant name, theme, language, model)
  /api/chat         — conversations + messages (LLM)
  /api/memory       — generic memory items
  /api/voice        — Whisper STT + OpenAI TTS
  /api/jobs         — job applications + resume / cover letter helpers
  /api/code         — coding assistant
  /api/prompts      — prompt studio
  /api/documents    — document generation
  /api/email        — email drafting + summarization
  /api/calendar     — events + tasks
  /api/automation   — automation rules
  /api/vision       — image analysis
"""

from __future__ import annotations

import base64
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, List, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import (
    LlmChat,
    StreamDone,
    TextDelta,
    UserMessage,
    ImageContent,
)
from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
logger = logging.getLogger("afifa")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="AFIFA API")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def serialize(doc: dict) -> dict:
    """Strip MongoDB _id from a doc."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Auth — Emergent Google
# ---------------------------------------------------------------------------
class SessionPayload(BaseModel):
    session_id: str


class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires = session["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < utc_now():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/google")
async def google_session(body: SessionPayload):
    """Exchange Emergent session_id for app session_token and user info."""
    headers = {"X-Session-ID": body.session_id}
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers=headers,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = new_id("user")
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": data.get("name", email.split("@")[0]),
                "picture": data.get("picture"),
                "created_at": utc_now(),
            }
        )
        # seed default profile
        await db.profiles.insert_one(
            {
                "user_id": user_id,
                "user_name": data.get("name", email.split("@")[0]),
                "ai_name": "Afifa",
                "wake_word": "Hi Afifa",
                "voice_id": "alloy",
                "theme": "Blue Neon",
                "language": "en",
                "model_provider": DEFAULT_PROVIDER,
                "model_name": DEFAULT_MODEL,
                "onboarding_complete": False,
                "created_at": utc_now(),
            }
        )

    session_token = data["session_token"]
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {
            "$set": {
                "session_token": session_token,
                "user_id": user_id,
                "expires_at": utc_now() + timedelta(days=7),
                "created_at": utc_now(),
            }
        },
        upsert=True,
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


class GuestPayload(BaseModel):
    name: str = "Guest"


@auth_router.post("/guest")
async def guest_session(body: GuestPayload):
    """Local-only guest session — useful for Expo Go preview testing."""
    user_id = new_id("guest")
    email = f"{user_id}@afifa.local"
    await db.users.insert_one(
        {
            "user_id": user_id,
            "email": email,
            "name": body.name or "Guest",
            "picture": None,
            "created_at": utc_now(),
            "is_guest": True,
        }
    )
    await db.profiles.insert_one(
        {
            "user_id": user_id,
            "user_name": body.name or "Guest",
            "ai_name": "Afifa",
            "wake_word": "Hi Afifa",
            "voice_id": "alloy",
            "theme": "Blue Neon",
            "language": "en",
            "model_provider": DEFAULT_PROVIDER,
            "model_name": DEFAULT_MODEL,
            "onboarding_complete": False,
            "created_at": utc_now(),
        }
    )
    session_token = f"guest_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one(
        {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": utc_now() + timedelta(days=30),
            "created_at": utc_now(),
        }
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@auth_router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@auth_router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


api.include_router(auth_router)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
profile_router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    user_name: Optional[str] = None
    ai_name: Optional[str] = None
    voice_id: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    onboarding_complete: Optional[bool] = None
    custom_theme: Optional[dict] = None
    pin_hash: Optional[str] = None
    biometric_enabled: Optional[bool] = None


@profile_router.get("")
async def get_profile(user: dict = Depends(get_current_user)):
    p = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not p:
        # safety fallback if older user
        p = {
            "user_id": user["user_id"],
            "user_name": user.get("name", "User"),
            "ai_name": "Afifa",
            "wake_word": "Hi Afifa",
            "voice_id": "alloy",
            "theme": "Blue Neon",
            "language": "en",
            "model_provider": DEFAULT_PROVIDER,
            "model_name": DEFAULT_MODEL,
            "onboarding_complete": False,
            "created_at": utc_now(),
        }
        await db.profiles.insert_one(p)
        p.pop("_id", None)
    return {"profile": p}


@profile_router.put("")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "ai_name" in update and update["ai_name"]:
        update["wake_word"] = f"Hi {update['ai_name']}"
    update["updated_at"] = utc_now()
    await db.profiles.update_one(
        {"user_id": user["user_id"]}, {"$set": update}, upsert=True
    )
    p = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"profile": p}


api.include_router(profile_router)


# ---------------------------------------------------------------------------
# LLM utilities
# ---------------------------------------------------------------------------
MODEL_REGISTRY = {
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "gpt-5-mini"],
    "anthropic": ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001", "claude-opus-4-5-20251101"],
    "gemini": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
}

DEFAULT_PROVIDER = "openai"
DEFAULT_MODEL = "gpt-4o-mini"


def build_chat(
    session_id: str,
    system_message: str,
    provider: str = DEFAULT_PROVIDER,
    model: str = DEFAULT_MODEL,
) -> LlmChat:
    if provider not in MODEL_REGISTRY or model not in MODEL_REGISTRY[provider]:
        provider = DEFAULT_PROVIDER
        model = DEFAULT_MODEL
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model)


async def llm_complete(
    system: str,
    prompt: str,
    *,
    session_id: Optional[str] = None,
    provider: str = DEFAULT_PROVIDER,
    model: str = DEFAULT_MODEL,
) -> str:
    chat = build_chat(session_id or new_id("sess"), system, provider, model)
    out = []
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(out).strip()


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
chat_router = APIRouter(prefix="/chat", tags=["chat"])


class ConversationCreate(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = DEFAULT_PROVIDER
    model: Optional[str] = DEFAULT_MODEL


class MessageCreate(BaseModel):
    text: str
    provider: Optional[str] = None
    model: Optional[str] = None


@chat_router.get("/models")
async def list_models():
    return {"models": MODEL_REGISTRY}


@chat_router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    items = await db.conversations.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return {"conversations": items}


@chat_router.post("/conversations")
async def create_conversation(body: ConversationCreate, user: dict = Depends(get_current_user)):
    conv = {
        "conversation_id": new_id("conv"),
        "user_id": user["user_id"],
        "title": body.title or "New Chat",
        "provider": body.provider or DEFAULT_PROVIDER,
        "model": body.model or DEFAULT_MODEL,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    await db.conversations.insert_one(conv)
    conv.pop("_id", None)
    return {"conversation": conv}


@chat_router.get("/conversations/{cid}/messages")
async def get_messages(cid: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one(
        {"conversation_id": cid, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(404, "Conversation not found")
    messages = await db.messages.find(
        {"conversation_id": cid}, {"_id": 0}
    ).sort("created_at", 1).to_list(2000)
    return {"conversation": conv, "messages": messages}


@chat_router.delete("/conversations/{cid}")
async def delete_conversation(cid: str, user: dict = Depends(get_current_user)):
    await db.conversations.delete_one({"conversation_id": cid, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": cid})
    return {"ok": True}


@chat_router.post("/conversations/{cid}/messages")
async def post_message(cid: str, body: MessageCreate, user: dict = Depends(get_current_user)):
    """Non-streaming endpoint — returns full assistant reply."""
    conv = await db.conversations.find_one(
        {"conversation_id": cid, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(404, "Conversation not found")

    # Build context from history
    profile = await db.profiles.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    ai_name = profile.get("ai_name", "Afifa")
    user_name = profile.get("user_name", "User")
    language = profile.get("language", "en")

    history = await db.messages.find(
        {"conversation_id": cid}, {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    system = (
        f"You are {ai_name}, a personal AI assistant. The user's name is {user_name}. "
        f"Reply in {language} unless the user writes in another language. "
        "You are helpful, smart, concise, and warm. Use markdown for formatting."
    )

    provider = body.provider or conv["provider"]
    model = body.model or conv["model"]

    # Save user message
    user_msg = {
        "message_id": new_id("msg"),
        "conversation_id": cid,
        "role": "user",
        "content": body.text,
        "model": None,
        "created_at": utc_now(),
    }
    await db.messages.insert_one(user_msg)

    chat = build_chat(cid, system, provider, model)

    # Replay short history as a context string (LlmChat session is fresh per request).
    context_block = ""
    if history:
        lines = [f"{m['role'].upper()}: {m['content']}" for m in history[-12:]]
        context_block = "Conversation so far:\n" + "\n".join(lines) + "\n\nUser: " + body.text
    else:
        context_block = body.text

    out: List[str] = []
    async for ev in chat.stream_message(UserMessage(text=context_block)):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    assistant_text = "".join(out).strip() or "(no response)"

    ai_msg = {
        "message_id": new_id("msg"),
        "conversation_id": cid,
        "role": "assistant",
        "content": assistant_text,
        "model": f"{provider}/{model}",
        "created_at": utc_now(),
    }
    await db.messages.insert_one(ai_msg)
    await db.conversations.update_one(
        {"conversation_id": cid},
        {
            "$set": {
                "updated_at": utc_now(),
                "provider": provider,
                "model": model,
                "last_message": assistant_text[:120],
            }
        },
    )

    # auto-title on first turn
    if len(history) == 0:
        title = body.text.strip().split("\n")[0][:48] or "New Chat"
        await db.conversations.update_one(
            {"conversation_id": cid}, {"$set": {"title": title}}
        )

    # memory snippet
    await db.memory.insert_one(
        {
            "memory_id": new_id("mem"),
            "user_id": user["user_id"],
            "category": "conversation",
            "title": (body.text[:60] + ("…" if len(body.text) > 60 else "")),
            "summary": assistant_text[:160],
            "data": {"conversation_id": cid},
            "created_at": utc_now(),
        }
    )

    return {
        "user_message": serialize(user_msg),
        "assistant_message": serialize(ai_msg),
    }


api.include_router(chat_router)


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------
memory_router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryCreate(BaseModel):
    category: str = "note"  # conversation | note | project | task | preference | resume
    title: str
    summary: Optional[str] = ""
    data: Optional[dict] = None


class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    data: Optional[dict] = None
    category: Optional[str] = None


@memory_router.get("")
async def list_memory(
    category: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {"user_id": user["user_id"]}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"summary": {"$regex": q, "$options": "i"}},
        ]
    items = await db.memory.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}


@memory_router.post("")
async def create_memory(body: MemoryCreate, user: dict = Depends(get_current_user)):
    item = {
        "memory_id": new_id("mem"),
        "user_id": user["user_id"],
        "category": body.category,
        "title": body.title,
        "summary": body.summary or "",
        "data": body.data or {},
        "created_at": utc_now(),
    }
    await db.memory.insert_one(item)
    item.pop("_id", None)
    return {"item": item}


@memory_router.put("/{mid}")
async def update_memory(mid: str, body: MemoryUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = utc_now()
    res = await db.memory.update_one(
        {"memory_id": mid, "user_id": user["user_id"]}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    item = await db.memory.find_one({"memory_id": mid}, {"_id": 0})
    return {"item": item}


@memory_router.delete("/{mid}")
async def delete_memory(mid: str, user: dict = Depends(get_current_user)):
    await db.memory.delete_one({"memory_id": mid, "user_id": user["user_id"]})
    return {"ok": True}


api.include_router(memory_router)


# ---------------------------------------------------------------------------
# Voice — Whisper STT + OpenAI TTS via emergentintegrations (Emergent proxy)
# ---------------------------------------------------------------------------
voice_router = APIRouter(prefix="/voice", tags=["voice"])

import tempfile


@voice_router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Send recorded audio to Whisper and return transcribed text."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "Empty audio")

    # Pick an extension Whisper understands
    fname = audio.filename or "audio.m4a"
    suffix = "." + (fname.rsplit(".", 1)[-1].lower() if "." in fname else "m4a")
    if suffix.strip(".") not in {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}:
        suffix = ".m4a"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(audio_bytes)
        tmp.flush()
        tmp.close()
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        result = await stt.transcribe(file=tmp.name, model="whisper-1", response_format="text")
        # result is either dict-like or plain text depending on response_format
        if isinstance(result, str):
            text = result
        elif isinstance(result, dict):
            text = result.get("text", "")
        else:
            text = getattr(result, "text", str(result))
        return {"text": text.strip()}
    except Exception as e:  # noqa: BLE001
        logger.exception("Whisper failed")
        raise HTTPException(502, f"Transcription failed: {str(e)[:200]}")
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"
    format: Optional[Literal["mp3", "opus", "aac", "flac", "wav", "pcm"]] = "mp3"


@voice_router.post("/tts")
async def tts(body: TTSRequest, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")
    voice = body.voice or "alloy"
    if voice not in {"alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"}:
        voice = "alloy"
    try:
        tts_client = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_b64 = await tts_client.generate_speech_base64(
            text=body.text[:4000],
            voice=voice,  # type: ignore[arg-type]
            response_format=body.format or "mp3",
        )
        return {"audio_base64": audio_b64, "format": body.format or "mp3"}
    except Exception as e:  # noqa: BLE001
        logger.exception("TTS failed")
        raise HTTPException(502, f"TTS failed: {str(e)[:200]}")


api.include_router(voice_router)


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobApplication(BaseModel):
    company: str
    role: str
    location: Optional[str] = ""
    status: Optional[str] = "applied"  # saved | applied | interview | offer | rejected
    url: Optional[str] = ""
    notes: Optional[str] = ""
    applied_at: Optional[datetime] = None


class ResumeAnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str


class CoverLetterRequest(BaseModel):
    resume_text: str
    job_description: str
    tone: Optional[str] = "professional"


@jobs_router.get("/applications")
async def list_jobs(user: dict = Depends(get_current_user)):
    items = await db.jobs.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"applications": items}


@jobs_router.post("/applications")
async def create_job(body: JobApplication, user: dict = Depends(get_current_user)):
    item = {
        "application_id": new_id("job"),
        "user_id": user["user_id"],
        **body.model_dump(),
        "created_at": utc_now(),
    }
    if not item["applied_at"]:
        item["applied_at"] = utc_now()
    await db.jobs.insert_one(item)
    item.pop("_id", None)
    return {"application": item}


@jobs_router.put("/applications/{jid}")
async def update_job(jid: str, body: JobApplication, user: dict = Depends(get_current_user)):
    update = body.model_dump()
    await db.jobs.update_one(
        {"application_id": jid, "user_id": user["user_id"]}, {"$set": update}
    )
    item = await db.jobs.find_one({"application_id": jid}, {"_id": 0})
    return {"application": item}


@jobs_router.delete("/applications/{jid}")
async def delete_job(jid: str, user: dict = Depends(get_current_user)):
    await db.jobs.delete_one({"application_id": jid, "user_id": user["user_id"]})
    return {"ok": True}


@jobs_router.post("/analyze-resume")
async def analyze_resume(body: ResumeAnalyzeRequest, user: dict = Depends(get_current_user)):
    sys = (
        "You are an expert technical recruiter. Analyze a resume against a job "
        "description. Return: match_score (0-100), strengths (bullet list), gaps "
        "(bullet list), and a 3-step action plan."
    )
    out = await llm_complete(
        sys,
        f"RESUME:\n{body.resume_text[:8000]}\n\nJOB DESCRIPTION:\n{body.job_description[:6000]}",
        session_id=user["user_id"],
    )
    return {"analysis": out}


@jobs_router.post("/cover-letter")
async def cover_letter(body: CoverLetterRequest, user: dict = Depends(get_current_user)):
    sys = f"You are an expert career coach. Write a {body.tone} cover letter, max 350 words."
    out = await llm_complete(
        sys,
        f"RESUME:\n{body.resume_text[:6000]}\n\nJOB DESCRIPTION:\n{body.job_description[:5000]}",
        session_id=user["user_id"],
    )
    return {"cover_letter": out}


api.include_router(jobs_router)


# ---------------------------------------------------------------------------
# Code Assistant
# ---------------------------------------------------------------------------
code_router = APIRouter(prefix="/code", tags=["code"])


class CodeRequest(BaseModel):
    language: str
    prompt: str
    action: Literal["generate", "explain", "fix", "refactor"] = "generate"
    code: Optional[str] = None  # for explain / fix / refactor


@code_router.post("/run")
async def code_run(body: CodeRequest, user: dict = Depends(get_current_user)):
    sys = "You are a senior software engineer. Reply with focused, well-structured output. Always wrap code in fenced markdown blocks."
    if body.action == "generate":
        prompt = f"Generate {body.language} code that does the following:\n{body.prompt}"
    elif body.action == "explain":
        prompt = f"Explain this {body.language} code in clear plain English:\n```{body.language}\n{body.code}\n```"
    elif body.action == "fix":
        prompt = (
            f"Find and fix all bugs in this {body.language} code. Explain each bug and "
            f"output the corrected code.\n```{body.language}\n{body.code}\n```\n\nNotes: {body.prompt}"
        )
    else:  # refactor
        prompt = (
            f"Refactor this {body.language} code for readability, performance, and "
            f"idiomatic style. Explain the changes.\n```{body.language}\n{body.code}\n```\n\nGoal: {body.prompt}"
        )
    out = await llm_complete(sys, prompt, session_id=user["user_id"])
    return {"output": out}


api.include_router(code_router)


# ---------------------------------------------------------------------------
# Prompt Studio
# ---------------------------------------------------------------------------
prompts_router = APIRouter(prefix="/prompts", tags=["prompts"])


class PromptCreate(BaseModel):
    title: str
    category: str = "general"
    body: str


class PromptGenRequest(BaseModel):
    use_case: str  # app | website | game | book | marketing | agent | image | other
    topic: str
    style: Optional[str] = "professional"


@prompts_router.get("")
async def list_prompts(user: dict = Depends(get_current_user)):
    items = await db.prompts.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"prompts": items}


@prompts_router.post("")
async def save_prompt(body: PromptCreate, user: dict = Depends(get_current_user)):
    item = {
        "prompt_id": new_id("prm"),
        "user_id": user["user_id"],
        **body.model_dump(),
        "created_at": utc_now(),
    }
    await db.prompts.insert_one(item)
    item.pop("_id", None)
    return {"prompt": item}


@prompts_router.delete("/{pid}")
async def delete_prompt(pid: str, user: dict = Depends(get_current_user)):
    await db.prompts.delete_one({"prompt_id": pid, "user_id": user["user_id"]})
    return {"ok": True}


@prompts_router.post("/generate")
async def generate_prompt(body: PromptGenRequest, user: dict = Depends(get_current_user)):
    sys = (
        "You are a master prompt engineer. Produce a single, highly-effective, "
        "ready-to-use prompt template using best practices (role, context, "
        "constraints, examples, output format). Return ONLY the final prompt."
    )
    out = await llm_complete(
        sys,
        f"Use case: {body.use_case}\nTopic: {body.topic}\nStyle: {body.style}",
        session_id=user["user_id"],
    )
    return {"prompt": out}


api.include_router(prompts_router)


# ---------------------------------------------------------------------------
# Document Generator
# ---------------------------------------------------------------------------
documents_router = APIRouter(prefix="/documents", tags=["documents"])


class DocRequest(BaseModel):
    doc_type: Literal["resume", "report", "notes", "letter", "summary", "proposal"]
    topic: str
    format: Literal["markdown", "html", "plain"] = "markdown"
    extra: Optional[str] = ""


@documents_router.post("/generate")
async def generate_doc(body: DocRequest, user: dict = Depends(get_current_user)):
    sys = f"You are a professional writer. Produce a high-quality {body.doc_type} in {body.format} format."
    out = await llm_complete(
        sys,
        f"Topic / details:\n{body.topic}\n\nAdditional notes: {body.extra}",
        session_id=user["user_id"],
    )
    item = {
        "document_id": new_id("doc"),
        "user_id": user["user_id"],
        "doc_type": body.doc_type,
        "topic": body.topic,
        "format": body.format,
        "content": out,
        "created_at": utc_now(),
    }
    await db.documents.insert_one(item)
    item.pop("_id", None)
    return {"document": item}


@documents_router.get("")
async def list_docs(user: dict = Depends(get_current_user)):
    items = await db.documents.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"documents": items}


@documents_router.delete("/{did}")
async def delete_doc(did: str, user: dict = Depends(get_current_user)):
    await db.documents.delete_one({"document_id": did, "user_id": user["user_id"]})
    return {"ok": True}


api.include_router(documents_router)


# ---------------------------------------------------------------------------
# Email Assistant
# ---------------------------------------------------------------------------
email_router = APIRouter(prefix="/email", tags=["email"])


class EmailDraftRequest(BaseModel):
    intent: str  # what email to write
    recipient: Optional[str] = ""
    tone: Optional[str] = "professional"


class EmailSummarizeRequest(BaseModel):
    email_text: str


@email_router.post("/draft")
async def draft_email(body: EmailDraftRequest, user: dict = Depends(get_current_user)):
    sys = f"You are an email writing expert. Return a complete email with Subject and Body in {body.tone} tone."
    out = await llm_complete(
        sys,
        f"Recipient: {body.recipient}\nIntent: {body.intent}",
        session_id=user["user_id"],
    )
    return {"email": out}


@email_router.post("/summarize")
async def summarize_email(body: EmailSummarizeRequest, user: dict = Depends(get_current_user)):
    sys = (
        "Summarize the email: 1) one-line TL;DR, 2) key points, 3) action items, "
        "4) 2 suggested replies (short and full)."
    )
    out = await llm_complete(sys, body.email_text[:8000], session_id=user["user_id"])
    return {"summary": out}


api.include_router(email_router)


# ---------------------------------------------------------------------------
# Calendar & Tasks
# ---------------------------------------------------------------------------
calendar_router = APIRouter(prefix="/calendar", tags=["calendar"])


class EventCreate(BaseModel):
    title: str
    start_at: datetime
    end_at: Optional[datetime] = None
    location: Optional[str] = ""
    notes: Optional[str] = ""
    kind: Literal["event", "task"] = "event"
    done: Optional[bool] = False


@calendar_router.get("/events")
async def list_events(user: dict = Depends(get_current_user)):
    items = await db.events.find({"user_id": user["user_id"]}, {"_id": 0}).sort("start_at", 1).to_list(500)
    return {"events": items}


@calendar_router.post("/events")
async def create_event(body: EventCreate, user: dict = Depends(get_current_user)):
    item = {
        "event_id": new_id("evt"),
        "user_id": user["user_id"],
        **body.model_dump(),
        "created_at": utc_now(),
    }
    await db.events.insert_one(item)
    item.pop("_id", None)
    return {"event": item}


@calendar_router.put("/events/{eid}")
async def update_event(eid: str, body: EventCreate, user: dict = Depends(get_current_user)):
    await db.events.update_one(
        {"event_id": eid, "user_id": user["user_id"]}, {"$set": body.model_dump()}
    )
    item = await db.events.find_one({"event_id": eid}, {"_id": 0})
    return {"event": item}


@calendar_router.delete("/events/{eid}")
async def delete_event(eid: str, user: dict = Depends(get_current_user)):
    await db.events.delete_one({"event_id": eid, "user_id": user["user_id"]})
    return {"ok": True}


api.include_router(calendar_router)


# ---------------------------------------------------------------------------
# Automation
# ---------------------------------------------------------------------------
automation_router = APIRouter(prefix="/automation", tags=["automation"])


class AutomationRule(BaseModel):
    name: str
    target_app: str  # whatsapp, sms, gmail, etc.
    action: str  # send_message, open_app, schedule, etc.
    params: dict = {}
    enabled: bool = True
    requires_confirmation: bool = True
    schedule: Optional[str] = None  # cron-like or "once" + ISO


@automation_router.get("/rules")
async def list_rules(user: dict = Depends(get_current_user)):
    items = await db.automation_rules.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"rules": items}


@automation_router.post("/rules")
async def create_rule(body: AutomationRule, user: dict = Depends(get_current_user)):
    item = {
        "rule_id": new_id("rule"),
        "user_id": user["user_id"],
        **body.model_dump(),
        "created_at": utc_now(),
    }
    await db.automation_rules.insert_one(item)
    item.pop("_id", None)
    return {"rule": item}


@automation_router.put("/rules/{rid}")
async def update_rule(rid: str, body: AutomationRule, user: dict = Depends(get_current_user)):
    await db.automation_rules.update_one(
        {"rule_id": rid, "user_id": user["user_id"]}, {"$set": body.model_dump()}
    )
    item = await db.automation_rules.find_one({"rule_id": rid}, {"_id": 0})
    return {"rule": item}


@automation_router.delete("/rules/{rid}")
async def delete_rule(rid: str, user: dict = Depends(get_current_user)):
    await db.automation_rules.delete_one({"rule_id": rid, "user_id": user["user_id"]})
    return {"ok": True}


@automation_router.post("/rules/{rid}/queue")
async def queue_rule(rid: str, user: dict = Depends(get_current_user)):
    """Mark an automation rule as queued for execution.

    Actual execution happens on the device using Accessibility services / Intents.
    The server only records the intent + confirmation state.
    """
    rule = await db.automation_rules.find_one({"rule_id": rid, "user_id": user["user_id"]}, {"_id": 0})
    if not rule:
        raise HTTPException(404, "Rule not found")
    run_id = new_id("run")
    await db.automation_runs.insert_one(
        {
            "run_id": run_id,
            "rule_id": rid,
            "user_id": user["user_id"],
            "status": "queued",
            "queued_at": utc_now(),
        }
    )
    return {"run_id": run_id, "rule": rule}


api.include_router(automation_router)


# ---------------------------------------------------------------------------
# Vision
# ---------------------------------------------------------------------------
vision_router = APIRouter(prefix="/vision", tags=["vision"])


class VisionRequest(BaseModel):
    image_base64: str
    prompt: str = "Describe this image in detail."


@vision_router.post("/analyze")
async def analyze_image(body: VisionRequest, user: dict = Depends(get_current_user)):
    sys = "You are an expert vision assistant. Analyze images and answer questions with high precision."
    chat = build_chat(new_id("vis"), sys, "openai", "gpt-4o")
    msg = UserMessage(
        text=body.prompt,
        file_contents=[ImageContent(image_base64=body.image_base64)],
    )
    out = []
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return {"analysis": "".join(out).strip()}


api.include_router(vision_router)


# ---------------------------------------------------------------------------
# Health + root
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"name": "AFIFA API", "status": "ok", "time": utc_now().isoformat()}


@api.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    # indexes
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.profiles.create_index("user_id", unique=True)
    await db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
    await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    await db.memory.create_index([("user_id", 1), ("created_at", -1)])
    await db.jobs.create_index([("user_id", 1), ("created_at", -1)])
    await db.prompts.create_index([("user_id", 1), ("created_at", -1)])
    await db.documents.create_index([("user_id", 1), ("created_at", -1)])
    await db.events.create_index([("user_id", 1), ("start_at", 1)])
    await db.automation_rules.create_index([("user_id", 1), ("created_at", -1)])
    logger.info("AFIFA startup — indexes ready")


@app.on_event("shutdown")
async def shutdown() -> None:
    client.close()
