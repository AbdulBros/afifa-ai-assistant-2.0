"""AFIFA backend integration tests — all 14 modules.

Run:
    pytest /app/backend/tests/test_afifa_backend.py -v --tb=short \
        --junitxml=/app/test_reports/pytest/pytest_results.xml
"""

import base64
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://afifa-assistant.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------------------------------------------------------- fixtures
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(session):
    r = session.post(f"{API}/auth/guest", json={"name": f"TEST_{uuid.uuid4().hex[:6]}"}, timeout=30)
    assert r.status_code == 200, f"guest login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "session_token" in data and data["session_token"]
    assert "user" in data and data["user"].get("user_id")
    return {
        "token": data["session_token"],
        "user": data["user"],
        "headers": {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {data['session_token']}",
        },
    }


# ---------------------------------------------------------------- health/auth
def test_health(session):
    r = session.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_auth_me(session, auth):
    r = session.get(f"{API}/auth/me", headers=auth["headers"], timeout=15)
    assert r.status_code == 200, r.text[:200]
    body = r.json()
    assert body["user"]["user_id"] == auth["user"]["user_id"]


def test_auth_missing_token(session):
    r = session.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------------------------------------------------------------- profile
def test_profile_seeded(session, auth):
    r = session.get(f"{API}/profile", headers=auth["headers"], timeout=15)
    assert r.status_code == 200, r.text[:200]
    p = r.json()["profile"]
    assert p["ai_name"] == "Afifa"
    assert p["wake_word"] == "Hi Afifa"
    assert p["theme"] == "Blue Neon"
    assert p["model_provider"] == "openai"


def test_profile_update_ai_name_updates_wake_word(session, auth):
    r = session.put(
        f"{API}/profile",
        headers=auth["headers"],
        json={"ai_name": "Nova"},
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    p = r.json()["profile"]
    assert p["ai_name"] == "Nova"
    assert p["wake_word"] == "Hi Nova"
    # GET to verify persistence
    r2 = session.get(f"{API}/profile", headers=auth["headers"], timeout=15)
    assert r2.json()["profile"]["wake_word"] == "Hi Nova"


# ---------------------------------------------------------------- chat
def test_chat_models(session, auth):
    r = session.get(f"{API}/chat/models", headers=auth["headers"], timeout=15)
    assert r.status_code == 200
    models = r.json()["models"]
    assert "openai" in models and "anthropic" in models and "gemini" in models
    assert isinstance(models["openai"], list) and len(models["openai"]) > 0


def test_chat_full_flow(session, auth):
    # create conversation
    r = session.post(
        f"{API}/chat/conversations",
        headers=auth["headers"],
        json={"title": "TEST_chat"},
        timeout=20,
    )
    assert r.status_code == 200, r.text[:200]
    conv = r.json()["conversation"]
    cid = conv["conversation_id"]

    # send a message — actual LLM call
    r = session.post(
        f"{API}/chat/conversations/{cid}/messages",
        headers=auth["headers"],
        json={"text": "Say hello in 3 words."},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert body["user_message"]["content"] == "Say hello in 3 words."
    assistant = body["assistant_message"]
    assert assistant["role"] == "assistant"
    assert assistant["content"] and assistant["content"] != "(no response)"
    assert assistant.get("model")

    # GET messages
    time.sleep(0.5)
    r = session.get(
        f"{API}/chat/conversations/{cid}/messages",
        headers=auth["headers"],
        timeout=15,
    )
    assert r.status_code == 200
    msgs = r.json()["messages"]
    assert len(msgs) >= 2
    roles = [m["role"] for m in msgs]
    assert "user" in roles and "assistant" in roles


# ---------------------------------------------------------------- memory
def test_memory_crud(session, auth):
    r = session.post(
        f"{API}/memory",
        headers=auth["headers"],
        json={"category": "note", "title": "TEST_mem", "summary": "hi"},
        timeout=15,
    )
    assert r.status_code == 200
    mid = r.json()["item"]["memory_id"]

    r = session.get(f"{API}/memory", headers=auth["headers"], timeout=15)
    assert r.status_code == 200
    assert any(i["memory_id"] == mid for i in r.json()["items"])

    r = session.delete(f"{API}/memory/{mid}", headers=auth["headers"], timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------- jobs
def test_jobs_crud_and_llm(session, auth):
    r = session.post(
        f"{API}/jobs/applications",
        headers=auth["headers"],
        json={"company": "TEST_Co", "role": "Engineer"},
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    jid = r.json()["application"]["application_id"]

    r = session.get(f"{API}/jobs/applications", headers=auth["headers"], timeout=15)
    assert any(j["application_id"] == jid for j in r.json()["applications"])

    r = session.post(
        f"{API}/jobs/analyze-resume",
        headers=auth["headers"],
        json={
            "resume_text": "5y Python, FastAPI, MongoDB.",
            "job_description": "Backend engineer with FastAPI.",
        },
        timeout=120,
    )
    assert r.status_code == 200, r.text[:300]
    assert r.json().get("analysis"), "analysis empty"

    r = session.post(
        f"{API}/jobs/cover-letter",
        headers=auth["headers"],
        json={
            "resume_text": "Python engineer.",
            "job_description": "Backend role.",
        },
        timeout=120,
    )
    assert r.status_code == 200, r.text[:300]
    assert r.json().get("cover_letter")

    session.delete(f"{API}/jobs/applications/{jid}", headers=auth["headers"], timeout=15)


# ---------------------------------------------------------------- code
def test_code_generate(session, auth):
    r = session.post(
        f"{API}/code/run",
        headers=auth["headers"],
        json={"action": "generate", "language": "python", "prompt": "hello world"},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    assert r.json().get("output")


# ---------------------------------------------------------------- prompts
def test_prompts_crud_and_generate(session, auth):
    r = session.post(
        f"{API}/prompts/generate",
        headers=auth["headers"],
        json={"use_case": "agent", "topic": "todo list app"},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    gen = r.json().get("prompt")
    assert gen and isinstance(gen, str)

    r = session.post(
        f"{API}/prompts",
        headers=auth["headers"],
        json={"title": "TEST_pr", "category": "general", "body": gen[:500]},
        timeout=15,
    )
    assert r.status_code == 200
    pid = r.json()["prompt"]["prompt_id"]

    r = session.get(f"{API}/prompts", headers=auth["headers"], timeout=15)
    assert any(p["prompt_id"] == pid for p in r.json()["prompts"])

    r = session.delete(f"{API}/prompts/{pid}", headers=auth["headers"], timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------- documents
def test_documents(session, auth):
    r = session.post(
        f"{API}/documents/generate",
        headers=auth["headers"],
        json={"doc_type": "notes", "topic": "Daily standup", "format": "markdown"},
        timeout=120,
    )
    assert r.status_code == 200, r.text[:300]
    doc = r.json()["document"]
    assert doc["content"]
    did = doc["document_id"]

    r = session.get(f"{API}/documents", headers=auth["headers"], timeout=15)
    assert any(d["document_id"] == did for d in r.json()["documents"])

    r = session.delete(f"{API}/documents/{did}", headers=auth["headers"], timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------- email
def test_email_draft_and_summarize(session, auth):
    r = session.post(
        f"{API}/email/draft",
        headers=auth["headers"],
        json={"intent": "ask for a meeting next week", "recipient": "manager@x.com"},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    assert r.json().get("email")

    r = session.post(
        f"{API}/email/summarize",
        headers=auth["headers"],
        json={"email_text": "Hi, the project deadline moved to Friday. Please confirm."},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:300]
    assert r.json().get("summary")


# ---------------------------------------------------------------- calendar
def test_calendar_crud(session, auth):
    r = session.post(
        f"{API}/calendar/events",
        headers=auth["headers"],
        json={
            "title": "TEST_evt",
            "start_at": "2026-02-01T10:00:00Z",
            "kind": "task",
            "done": False,
        },
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    eid = r.json()["event"]["event_id"]

    r = session.get(f"{API}/calendar/events", headers=auth["headers"], timeout=15)
    assert any(e["event_id"] == eid for e in r.json()["events"])

    r = session.put(
        f"{API}/calendar/events/{eid}",
        headers=auth["headers"],
        json={
            "title": "TEST_evt",
            "start_at": "2026-02-01T10:00:00Z",
            "kind": "task",
            "done": True,
        },
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["event"]["done"] is True

    r = session.delete(f"{API}/calendar/events/{eid}", headers=auth["headers"], timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------- automation
def test_automation_rule_queue(session, auth):
    r = session.post(
        f"{API}/automation/rules",
        headers=auth["headers"],
        json={
            "name": "TEST_rule",
            "target_app": "whatsapp",
            "action": "send_message",
            "params": {"to": "+10", "text": "hi"},
            "enabled": True,
            "requires_confirmation": True,
        },
        timeout=15,
    )
    assert r.status_code == 200, r.text[:200]
    rid = r.json()["rule"]["rule_id"]

    r = session.post(f"{API}/automation/rules/{rid}/queue", headers=auth["headers"], timeout=15)
    assert r.status_code == 200, r.text[:200]
    assert r.json().get("run_id")

    r = session.delete(f"{API}/automation/rules/{rid}", headers=auth["headers"], timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------- voice TTS
def test_voice_tts(session, auth):
    r = session.post(
        f"{API}/voice/tts",
        headers=auth["headers"],
        json={"text": "Hello", "voice": "alloy", "format": "mp3"},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:300]
    body = r.json()
    assert body.get("audio_base64")
    # validate it's actual decodable base64 with non-trivial size
    raw = base64.b64decode(body["audio_base64"])
    assert len(raw) > 500
