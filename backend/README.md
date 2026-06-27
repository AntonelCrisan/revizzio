# Revizzio API

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

3. Copiază `.env.example` în `.env` și completează:

```env
DATABASE_URL=postgresql+asyncpg://UTILIZATOR:PAROLA@127.0.0.1:5432/revizzio
SESSION_SECRET=un-secret-aleator-de-cel-putin-32-de-caractere
```

Parola bazei de date și secretul sesiunilor nu se introduc în cod și nu se
comit în Git.

Caracterele rezervate din parolă trebuie codificate pentru URL. De exemplu,
`@` devine `%40`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:parola%40@127.0.0.1:5432/revizzio
```

4. Aplică schema:

```powershell
python -m alembic upgrade head
```

Pentru inspectare sau aplicare manuală pe o bază complet goală, SQL-ul
echivalent este în `migrations/sql/20260611_0001_create_auth_tables.sql`.
Folosește fie comanda Alembic, fie fișierul SQL, nu ambele.

5. Pornește API-ul:

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
