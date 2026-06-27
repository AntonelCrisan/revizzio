# Revizzio Frontend

## Configurare

Copiază `.env.example` în `.env.local`. `API_URL` este folosit doar pe serverul
Next.js și trebuie să indice către backend:

```env
API_URL=http://127.0.0.1:8000
```

Browserul comunică same-origin cu route handler-ul Next.js din
`/api/auth/*`. Acesta transmite cererile către FastAPI și păstrează cookie-ul
de sesiune `HttpOnly` inaccesibil codului JavaScript din browser.

## Pornire

```powershell
npm.cmd install
npm.cmd run dev
```

Aplicatia este disponibila la `http://localhost:3000`.

Pentru verificare:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
```

## Sistemul de teme

Tema este globala si suporta preferintele `light`, `dark` si `system`.
Pentru utilizatorii autentificati, preferinta este salvata in PostgreSQL si
se aplica automat la autentificare. Cheia `revizzio-theme` din `localStorage`
este folosita doar drept cache pentru a evita schimbarea vizibila a temei la
incarcarea paginii.

Selectorul de tema este disponibil numai in pagina contului.

Pentru pagini si componente noi foloseste token-urile semantice Tailwind:

```tsx
<section className="border border-subtle bg-surface text-content">
  <p className="text-muted">Text secundar</p>
  <button className="bg-action text-on-action hover:bg-action-hover">
    Continua
  </button>
</section>
```

Token-urile pentru succes, eroare, avertizare si informatii sunt:

- `success-soft`, `success`, `success-border`
- `danger-soft`, `danger`, `danger-border`
- `warning-soft`, `warning`, `warning-border`
- `info-soft`, `info`, `info-border`

Valorile ambelor palete sunt centralizate in `src/app/globals.css`.
Logica temei este in `src/components/theme-provider.tsx`, iar selectorul
reutilizabil este `src/components/theme-toggle.tsx`.
