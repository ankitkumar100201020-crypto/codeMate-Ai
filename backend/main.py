import os
from typing import List, Literal, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai


load_dotenv()
app = FastAPI(title="CodeMate AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

api_key = os.getenv("GEMINI_API_KEY", "").strip()
client = genai.Client(api_key=api_key) if api_key else None


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=12000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    mode: str = Field(default="chat", max_length=30)
    history: Optional[List[HistoryItem]] = Field(default_factory=list, max_length=8)



@app.get("/")
def root():
    return {"status": "ok", "message": "CodeMate AI backend is running"}


@app.get("/health")
def health():
    return {"status": "healthy", "api_configured": bool(client)}


@app.post("/chat")
def chat(body: ChatRequest):
    if not client:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured. Add it to backend/.env and restart the server.")
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
        result = client.models.generate_content(model="gemini-3.5-flash-lite", contents=prompt)
        answer = getattr(result, "text", None)
        if not answer:
            raise RuntimeError("The model returned an empty response.")
        return {"reply": answer}
    except Exception as exc:
        # Avoid leaking secrets or provider internals into the browser.
        print(f"Error occurred while generating content: {exc}")
        raise HTTPException(status_code=502, detail=f"AI provider request failed. Check your API key, model availability, and quota. ({type(exc).__name__})")
