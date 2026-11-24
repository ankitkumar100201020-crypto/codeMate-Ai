import os
from pathlib import Path
from typing import List, Literal, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai

# Load .env from backend directory or current working directory
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv()

app = FastAPI(title="CodeMate AI API", version="1.0.0")

# Configure CORS origins
raw_frontend_origin = os.getenv("FRONTEND_ORIGIN", "").strip()
if not raw_frontend_origin or raw_frontend_origin == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    for origin in raw_frontend_origin.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY", "").strip()
client = genai.Client(api_key=api_key) if api_key else None
default_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=12000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    mode: str = Field(default="chat", max_length=30)
    history: Optional[List[HistoryItem]] = Field(default_factory=list, max_length=8)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "CodeMate AI API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat": "/chat (POST)",
            "docs": "/docs"
        }
    }


@app.get("/health")
def health():
    current_key = os.getenv("GEMINI_API_KEY", "").strip()
    return {
        "status": "healthy",
        "api_configured": bool(client or current_key),
        "model": default_model
    }


@app.post("/chat")
def chat(body: ChatRequest):
    global client
    current_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not client and current_key:
        client = genai.Client(api_key=current_key)

    if not client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Set GEMINI_API_KEY in the backend environment."
        )

    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    mode_prompts = {
        "chat": "Answer coding and software-development questions clearly. Be beginner-friendly.",
        "generate": "Generate complete, readable code for the requested task. State the language and briefly explain how to use it.",
        "debug": "Carefully inspect the supplied code or error. Explain the likely issue and provide a corrected version. Do not claim you ran it.",
        "explain": "Explain the supplied code in beginner-friendly steps. Describe important lines and concepts.",
        "convert": "Convert code to the requested language. Preserve the behavior and briefly mention notable differences.",
    }
    instruction = mode_prompts.get(body.mode, mode_prompts["chat"])
    context = []
    for item in (body.history or [])[-8:]:
        context.append(f"{item.role.upper()}: {item.content}")

    prompt = (
        "You are CodeMate AI, a patient, accurate programming assistant.\n"
        "Use markdown and fenced code blocks for code. Never invent that you executed code. "
        "When code is potentially destructive or unsafe, explain the risk and provide a safe alternative.\n"
        f"Mode instructions: {instruction}\n\n"
        + ("Conversation context:\n" + "\n".join(context) + "\n\n" if context else "")
        + "User message:\n" + message
    )

    try:
        model_name = os.getenv("GEMINI_MODEL", default_model).strip()
        result = client.models.generate_content(model=model_name, contents=prompt)
        answer = getattr(result, "text", None)
        if not answer:
            raise RuntimeError("The model returned an empty response.")
        return {"reply": answer}
    except Exception as exc:
        print(f"Error occurred while generating content: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"AI provider request failed. Check your API key, model availability, and quota. ({type(exc).__name__})"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

