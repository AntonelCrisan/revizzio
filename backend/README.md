# Reviss API

Backend FastAPI asincron, cu PostgreSQL, SQLAlchemy 2, Alembic, sesiuni
persistate și parole Argon2.

## Configurare locală

1. Creează baza de date PostgreSQL:

```sql
CREATE DATABASE revizzio;
```

2. Creează mediul virtual și instalează dependențele:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

3. Pornește Redis pentru rate limiting:

```powershell
cd ..
docker compose up -d redis
cd backend
```

4. Copiază `.env.example` în `.env` și completează:

```env
DATABASE_URL=postgresql+asyncpg://UTILIZATOR:PAROLA@127.0.0.1:5432/revizzio
SESSION_SECRET=un-secret-aleator-de-cel-putin-32-de-caractere
REDIS_URL=redis://127.0.0.1:6379/0
MISTRAL_API_KEY=<cheia_mistral_pentru_ocr_pro>
RESEND_API_KEY=<cheia_resend>
RESEND_FROM_EMAIL="Reviss <noreply@reviss.app>"
```

Parola bazei de date și secretul sesiunilor nu se introduc în cod și nu se
comit în Git.

Pentru autentificarea cu Google, creează un OAuth Client ID (tip "Web
application") în [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
adaugă `{PUBLIC_APP_URL}/api/auth/google/callback` la "Authorized redirect
URIs" (ex. `http://localhost:3000/api/auth/google/callback` local) și
completează `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` în `.env`. Frontend-ul
are nevoie separat de `GOOGLE_CLIENT_ID` în `frontend/.env`. Fără aceste
variabile, butonul de Google din login/register va afișa o eroare.

Important: `NEXT_PUBLIC_SITE_URL` din `frontend/.env` trebuie să fie
identic cu `PUBLIC_APP_URL` de aici (ex. amândouă `http://localhost:3000`),
altfel Google respinge cererea cu `Error 400: invalid_request` — redirect
URI-ul e construit din `NEXT_PUBLIC_SITE_URL`, nu din hostname-ul din
browser (accesarea aplicației prin `0.0.0.0:3000` sau prin IP-ul de rețea în
loc de `localhost:3000` produce exact această eroare).

`MISTRAL_API_KEY` este folosită doar pentru PDF-uri scanate încărcate de
utilizatorii cu plan Pro. PDF-urile cu text selectabil merg în continuare prin
MarkItDown.

Pentru proiecte mari, quizurile pot depăși câteva minute. În producție păstrează
`OPENAI_QUIZ_REQUEST_TIMEOUT_SECONDS=900` ca generarea quizurilor să nu fie
întreruptă prematur.

Caracterele rezervate din parolă trebuie codificate pentru URL. De exemplu,
`@` devine `%40`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:parola%40@127.0.0.1:5432/revizzio
```

5. Aplică schema:

```powershell
python -m alembic upgrade head
```

Pentru inspectare sau aplicare manuală pe o bază complet goală, SQL-ul
echivalent este în `migrations/sql/20260611_0001_create_auth_tables.sql`.
Folosește fie comanda Alembic, fie fișierul SQL, nu ambele.

6. Pornește API-ul:

```powershell
python main.py
```

Terminalul afișează logurile de pornire, oprire și request-urile HTTP.
API-ul rulează la `http://127.0.0.1:8000`, iar documentația interactivă este
la `http://127.0.0.1:8000/docs`.

## Verificări

```powershell
python -m ruff check .
python -m pytest
```

Endpoint-uri utile:

- `GET /api/health` verifică procesul FastAPI.
- `GET /api/ready` verifică și conexiunea PostgreSQL.
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me/preferences`
