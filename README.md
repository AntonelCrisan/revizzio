# Revizzio

Aplicație full-stack cu backend FastAPI, PostgreSQL și frontend Next.js.

## Backend

Configurează `backend/.env` pornind de la `.env.example`, apoi:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python main.py
```

API: `http://127.0.0.1:8000`  
Documentație: `http://127.0.0.1:8000/docs`

## Frontend

Într-un terminal separat:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Aplicație: `http://localhost:3000`

Detaliile de configurare și verificare sunt în README-urile din `backend` și
`frontend`.
# revizzio
