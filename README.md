# Mark&Jura (Маркетинговый Юрист)

Short local run guide.

## Local stack
- **Backend:** FastAPI (`backend/app/main.py`)
- **Frontend:** React + Vite (`frontend`)
- **Frontend dev URL:** `http://127.0.0.1:5173`
- **Backend API URL:** `http://127.0.0.1:8000`
- **Proxy check:** `http://127.0.0.1:5173/api/health`

## Prerequisites
- Python 3.10+
- Node.js 18+

## 1) Backend smoke test (quick API validation)
```powershell
python backend/app/local_smoke_test.py
```
Expected output contains:
`SMOKE_TEST_OK: backend API contracts are valid.`

## 2) Frontend build check
```powershell
cd frontend
npm install
npm run build
```

## 3) Run locally
### Terminal A (backend)
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal B (frontend)
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open in browser:
- App: `http://127.0.0.1:5173`
- API docs: `http://127.0.0.1:8000/api/docs`

## Connectivity status
Verified locally:
- backend direct health: `http://127.0.0.1:8000/api/health` ✅
- frontend->backend proxy health: `http://127.0.0.1:5173/api/health` ✅
