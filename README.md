# CodeMate AI
A beginner-friendly AI coding assistant starter project with React + Vite and FastAPI + Gemini.

## Prerequisites
- Node.js (LTS)
- Python 3.10+
- Gemini API key from Google AI Studio

## Configure API key
1. Copy `backend/.env.example` to `backend/.env`.
2. Set `GEMINI_API_KEY` to your own key in `backend/.env`.
3. Never commit `.env` or share your key.

## Start backend (Terminal 1)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
If PowerShell blocks virtual-environment activation, you can skip activation and use `python -m pip install -r requirements.txt`.

## Start frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## Modes
- AI Chat
- Generate Code
- Debug Code
- Explain Code
- Convert Code

This is a starter app. Before public deployment, add authentication, rate limits, stricter request validation, usage quotas, and production CORS settings.

## Deploy to Render

1. Push this repository to GitHub and create a Blueprint in Render using `render.yaml`.
2. During setup, provide your Gemini key for `GEMINI_API_KEY`. Keep it in Render's environment settings; never commit `backend/.env`.
3. The Blueprint creates a backend web service and a frontend static site. If Render assigns different `onrender.com` hostnames, update `VITE_API_URL` on the frontend and `FRONTEND_ORIGIN` on the backend to the matching service URLs, then redeploy.

The frontend API URL is configured at build time. The backend reads `GEMINI_API_KEY` from its environment and allows the configured `FRONTEND_ORIGIN`.
