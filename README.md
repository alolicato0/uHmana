# uHmana

> Il tuo assistente di salute AI, sempre con te. Per te e per i tuoi animali.

**Monorepo**:
```
uHmana/
├── frontend/   # App mobile (React Native + Expo)
└── backend/    # API (Node.js + Express + MongoDB + Clerk)
```

> ⚠️ uHmana è un servizio di **supporto informativo**. Non fornisce diagnosi né prescrizioni e non sostituisce il parere di un medico o veterinario. In emergenza chiama il **112**.

---

## Setup 100% web-only (zero terminale)

### 1️⃣ MongoDB Atlas (database)
1. Vai su [cloud.mongodb.com](https://cloud.mongodb.com) → registrati
2. **Create deployment** → seleziona **M0 Free** → Region Frankfurt/Ireland
3. **Security** → Quickstart:
   - Crea Database User con password forte (salvala!)
   - Network Access → "Allow access from anywhere" (0.0.0.0/0)
4. **Connect** → **Drivers** → copia la connection string (formato `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/`)
5. Aggiungi `/uhmana` prima del `?` → es. `mongodb+srv://.../uhmana?retryWrites=true&w=majority`
6. **Salva questa stringa** → la metterai su Render

### 2️⃣ Clerk (auth)
1. [dashboard.clerk.com](https://dashboard.clerk.com) → registrati
2. **Create application** → nome "uHmana" → abilita "Email", "Google", "Apple"
3. **API Keys**:
   - `Publishable Key` (`pk_test_...`) → andrà su **Expo**
   - `Secret Key` (`sk_test_...`) → andrà su **Render**

### 3️⃣ OpenRouter (AI)
1. [openrouter.ai](https://openrouter.ai) → registrati con Google
2. **Keys** → Create Key → nome "uhmana-backend"
3. Copia (`sk-or-v1-...`) → andrà su **Render**

### 4️⃣ Render (backend)
1. [render.com](https://render.com) → registrati con GitHub
2. **New +** → **Web Service** → connetti il repo `alolicato0/uHmana`
3. Configura:
   - **Name**: `uhmana-api`
   - **Region**: Frankfurt
   - **Branch**: `claude/create-uhmana-app-SF02w` (o `main` dopo il merge)
   - **Root Directory**: `backend` ← IMPORTANTE
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
4. **Environment Variables** → aggiungi tutte queste:
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | la stringa di MongoDB Atlas |
   | `CLERK_SECRET_KEY` | `sk_test_...` da Clerk |
   | `CLERK_PUBLISHABLE_KEY` | `pk_test_...` da Clerk |
   | `OPENROUTER_API_KEY` | `sk-or-v1-...` da OpenRouter |
   | `CORS_ORIGINS` | `*` (per ora) |
5. **Create Web Service** → aspetta il primo deploy (~3 min)
6. L'URL sarà tipo `https://uhmana-api.onrender.com` → salvalo

> Tip: c'è già un `render.yaml` nel repo. Da "Blueprints" puoi anche fare deploy con 1 click — ti chiederà solo i secret da incollare.

### 5️⃣ Expo (frontend mobile)
1. [expo.dev](https://expo.dev) → registrati
2. **Create Project** → connetti GitHub → repo `alolicato0/uHmana`
3. **Project Settings** → **Root directory**: `frontend` ← IMPORTANTE
4. **Project Settings** → **Environment variables** → aggiungi:
   | Key | Value | Environment |
   |---|---|---|
   | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | tutte |
   | `EXPO_PUBLIC_API_URL` | `https://uhmana-api.onrender.com` | tutte |

### 6️⃣ Test sul telefono
1. Installa **Expo Go** dal Play Store / App Store
2. Su expo.dev → progetto uHmana → **Start development server** (o usa GitHub Actions integration)
3. Scansiona il QR code con Expo Go
4. App live, modifichi codice → ricarica automatica

---

## Riassunto credenziali

| Cosa | Dove | Va su |
|---|---|---|
| MongoDB connection string | cloud.mongodb.com | Render `MONGODB_URI` |
| Clerk Publishable Key | dashboard.clerk.com | Expo + Render |
| Clerk Secret Key | dashboard.clerk.com | Render (mai su Expo!) |
| OpenRouter API Key | openrouter.ai | Render (mai su Expo!) |
| Render API URL | render.com (auto-generato) | Expo `EXPO_PUBLIC_API_URL` |

---

## Endpoint backend

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/health` | Health check (no auth) |
| POST | `/api/chat` | Chat AI con allegati (proxy OpenRouter) |
| GET/POST/PUT/DELETE | `/api/profiles` | Cartelle cliniche umani/animali |
| GET/POST/PUT/DELETE | `/api/timeline` | Eventi salute |
| GET/POST/PUT/DELETE | `/api/reminders` | Promemoria |

Tutte le route `/api/*` richiedono header `Authorization: Bearer <clerk_jwt>`.

## Schema MongoDB

- `HealthProfile` — un documento per profilo (umano o animale)
- `TimelineEvent` — eventi salute (sintomi, farmaci, visite, esami, vaccini)
- `Reminder` — promemoria con schedule (once/daily/weekly/monthly)
- `ChatSession` — cronologia chat AI (opzionale, per "memoria")

Ogni documento è scoped per `userId` (Clerk user id) → multi-tenancy automatica.

## Modelli AI

| Variabile | Default | Costo |
|---|---|---|
| `OPENROUTER_MODEL_PRIMARY` | `google/gemini-2.0-flash-exp:free` | Gratis |
| `OPENROUTER_MODEL_FALLBACK` | `meta-llama/llama-3.3-70b-instruct:free` | Gratis |
| `OPENROUTER_MODEL_VISION` | `google/gemini-2.0-flash-exp:free` | Gratis, immagini |

Strategia: **primario → fallback automatico su 429/5xx**.

## Roadmap

### Fase 1 — MVP (in corso)
- [x] App UI completa (13 schermate, italiano)
- [x] Clerk auth (email + OAuth Google/Apple da abilitare in dashboard)
- [x] Backend Express + MongoDB su Render
- [x] Chat AI multimodale via OpenRouter
- [x] CRUD profili, timeline, promemoria
- [x] System prompt rigido anti-diagnosi
- [ ] Sostituire store Zustand seed → fetch dal backend
- [ ] Upload media su bucket (Cloudflare R2)
- [ ] Expo Push Notifications

### Fase 2 — Monetizzazione
- [ ] AdMob banner (non invasivi)
- [ ] RevenueCat → Premium €7,99/mese
- [ ] Report AI mensile automatico
- [ ] Controllo interazioni farmaci

### Fase 3 — Estensione
- [ ] Modalità famiglia (più profili)
- [ ] Marketplace medici/veterinari
- [ ] Apple Health / Google Fit
- [ ] AI Coach (alimentazione, sonno, peso)
- [ ] One Health (zoonosi, allergie crociate)

## Branding

- **Nome**: `uHmana` (lowercase + H maiuscola — *Health* + *Human*)
- **Dominio**: `uhmana.app` (da verificare disponibilità)
- **Package**: `app.uhmana.uhmana`
- **Colori**: primary `#0DB09E` · secondary `#22C55E` · bg `#F5F7FA`

## Note legali

L'app **non è un dispositivo medico** (Reg. UE 2017/745 MDR). Tutte le risposte AI passano da un system prompt centralizzato (`backend/src/services/openrouter.ts`) che impone "supporto informativo" e rifiuta diagnosi/prescrizioni.

Prima del lancio in produzione:
- Privacy policy GDPR (dati sanitari = art. 9, categoria speciale)
- Termini d'uso con esclusione di responsabilità
- Consenso esplicito al trattamento dati sanitari
- Verifica trademark "uHmana" in IT/EU (TMview.eu, EUIPO)
