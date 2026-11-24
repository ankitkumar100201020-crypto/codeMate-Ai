# CodeMate AI

A modern AI coding assistant starter project with React + Vite and FastAPI + Google Gemini.

---

## Prerequisites
- Node.js (v18+)
- Python 3.10+
- Gemini API key from [Google AI Studio](https://aistudio.google.com/)

---

## Local Setup

### 1. Configure Backend Environment
1. Copy `backend/.env.example` to `backend/.env`.
2. Add your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   FRONTEND_ORIGIN=*
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
   *(Never commit `backend/.env` to Git).*

### 2. Start Backend (Terminal 1)
```powershell
cd backend
python -m venv .venv
# Activate virtual environment (Windows PowerShell):
.venv\Scripts\activate
# Install requirements:
pip install -r requirements.txt
# Start server:
uvicorn main:app --reload --port 8000
```
API runs at: `http://127.0.0.1:8000` (Health check: `http://127.0.0.1:8000/health`)

### 3. Start Frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

---

## Deploying Backend to Render

You can deploy the backend to Render in two ways:

### Option A: Manual Setup (Recommended for Backend-only)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository (`codeMate-Ai`).
3. Configure the service settings:
   - **Name**: `codemate-ai-backend` (or your preferred name)
   - **Region**: Choose closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Root Directory**: `backend` *(CRITICAL: do not leave blank)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. Under **Advanced** → **Health Check Path**:
   - Set to `/health`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = *your Google Gemini API key*
   - `FRONTEND_ORIGIN` = `*` (or your frontend deployment URL)
   - `GEMINI_MODEL` = `gemini-3.5-flash-lite`
   - `PYTHON_VERSION` = `3.11.9`
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide your public URL:
   `https://codemate-ai-backend.onrender.com`

---

### Option B: Render Blueprint (`render.yaml`)
1. Push this repository to GitHub.
2. In Render, go to **Blueprints** → **New Blueprint Instance**.
3. Select this repository. Render automatically reads `render.yaml`.
4. Enter your `GEMINI_API_KEY` when prompted.
5. Render will deploy both backend and frontend automatically!

---

## Connecting Frontend to Deployed Backend

In your frontend deployment (Vercel, Netlify, or Render static site):
Set the environment variable:
```env
VITE_API_URL=https://<your-render-backend-url>.onrender.com
```
Then rebuild/redeploy the frontend.

---

## API Endpoints
- `GET /` — API status and available endpoints
- `GET /health` — Health check (used by Render health probes)
- `POST /chat` — AI generation endpoint
  - Body: `{ "message": "...", "mode": "chat|generate|debug|explain|convert", "history": [...] }`
- `GET /docs` — Interactive OpenAPI Swagger UI documentation
