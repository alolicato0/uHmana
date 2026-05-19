# uHmana

> Il tuo assistente di salute AI, sempre con te. Per te e per i tuoi animali.

App mobile **React Native + Expo + TypeScript**. Backend su **Render**, auth con **Clerk**, AI via **OpenRouter**.

> ⚠️ uHmana è un servizio di **supporto informativo**. Non fornisce diagnosi né prescrizioni e non sostituisce il parere di un medico o veterinario. In emergenza chiama il **112**.

---

## 🌐 Workflow 100% web-only

Tutto si gestisce dal browser. Mai aprire il terminale.

### 1. Sviluppo & test sul telefono
1. Apri il tuo progetto su **expo.dev** (autenticati con GitHub)
2. Push del codice → Expo rileva il repo
3. Sul telefono installi **Expo Go** (Play Store / App Store)
4. Da expo.dev clicchi "Open in Expo Go" → QR code → app live
5. Ogni salvataggio nel codice ricarica l'app sul telefono

### 2. Build APK/IPA per i tester
Da expo.dev:
1. **Builds** → New build → Profilo `preview`
2. Aspetti ~15min, scarichi APK dal browser
3. Per iOS: profilo `production` + Apple Developer account ($99/anno)

### 3. Update OTA (over-the-air)
Cambi il codice → push → da expo.dev → **EAS Update** → tutti gli utenti ricevono l'update senza ripassare per gli store.

### 4. Variabili d'ambiente
- Quelle pubbliche (`EXPO_PUBLIC_*`) le setti su expo.dev → Project Settings → Environment variables
- Quelle private (es. `OPENROUTER_API_KEY`) le setti su Render → Service → Environment

---

## Stack

| Componente | Servizio | Web-only |
|---|---|---|
| Mobile app | **React Native + Expo SDK 54** | ✅ expo.dev |
| Auth | **Clerk** | ✅ dashboard.clerk.com |
| Backend API | **Render** (Node.js) | ✅ dashboard.render.com |
| Database | **Postgres su Render** | ✅ Render dashboard |
| AI | **OpenRouter** (proxy via backend) | ✅ openrouter.ai |
| Push notifications | **Expo Push** | ✅ built-in |

## Modelli OpenRouter consigliati

Il client chiama il **backend Render**, che inoltra a OpenRouter (la API key non finisce mai sul telefono). Strategia: **primario gratis → fallback automatico se rate-limited**.

| Variabile | Default | Costo |
|---|---|---|
| `OPENROUTER_MODEL_PRIMARY` | `google/gemini-2.0-flash-exp:free` | Gratis |
| `OPENROUTER_MODEL_FALLBACK` | `meta-llama/llama-3.3-70b-instruct:free` | Gratis |
| `OPENROUTER_MODEL_VISION` | `google/gemini-2.0-flash-exp:free` | Gratis, supporta immagini |

Quando vorrai qualità superiore puoi switchare a `anthropic/claude-haiku-4-5` (~$1/M tok) o `deepseek/deepseek-chat-v3` (~$0.14/M tok).

## Struttura del progetto

```
app/                          # Expo Router (file-based routing)
├── _layout.tsx               # Root: ClerkProvider, Stack
├── index.tsx                 # Splash + redirect
├── welcome.tsx               # Scelta Umano/Animale
├── (auth)/
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx           # Tab bar con FAB centrale
│   ├── home.tsx              # Dashboard
│   ├── timeline.tsx          # Storico salute
│   ├── chat.tsx              # Chat AI multimodale
│   └── profile.tsx           # Profilo utente
├── add-event.tsx             # Modal: aggiungi evento timeline
├── emergency.tsx             # Modal: SOS
├── image-analysis.tsx        # Analisi foto AI
├── medical-record.tsx        # Cartella clinica
├── reports.tsx               # PDF e referti
├── reminders.tsx             # Promemoria farmaci/visite
└── settings.tsx              # Impostazioni

src/
├── theme/                    # Colori, radii, spacing
├── constants/disclaimers.ts  # System prompt + warnings legali
├── types/                    # Tipi condivisi
├── store/                    # Zustand stores (profile, timeline, chat)
├── services/openrouter.ts    # Client AI (chiama backend in prod)
└── components/               # Logo, Card, PrimaryButton
```

## Schermate implementate

1. **Splash** – logo animato + slogan
2. **Welcome** – scelta Umano/Animale
3. **Sign In / Sign Up** – Clerk con Google, Apple, email
4. **Home** – dashboard con tile, panoramica, emergenza, promemoria
5. **Chat AI** – multimodale, fallback model, disclaimer fisso
6. **Analisi immagine** – upload foto + risposta AI
7. **Cartella clinica** – patologie, terapie, allergie, vaccini (umano/animale)
8. **Timeline** – filtri, raggruppamento per giorno
9. **Aggiungi evento** – bottom sheet modale
10. **Promemoria** – tabs farmaci/visite/altro
11. **Modalità emergenza** – pulsante SOS + descrizione + call 112
12. **Profilo** – avatar Clerk, badge Premium, logout
13. **Impostazioni** – notifiche, privacy, lingua, tema

## Roadmap

### MVP fase 1 (FATTO)
- [x] UI completa 13 schermate
- [x] Clerk Auth integrato (login email + verification code)
- [x] Chat AI testo + immagini multimodale
- [x] Timeline + stores zustand
- [x] System prompt rigido anti-diagnosi

### MVP fase 2 (prossimi step)
- [ ] Backend Node.js su Render: `/api/chat`, `/api/profiles`, `/api/timeline`
- [ ] Schema Postgres + Prisma + migrations
- [ ] OAuth Google + Apple in Clerk
- [ ] Upload media → bucket (Cloudflare R2 o Supabase Storage)
- [ ] Expo Push Notifications per promemoria

### Fase 3
- [ ] AdMob banner (non invasivi)
- [ ] RevenueCat → Premium €7,99/mese
- [ ] Report AI mensile automatico
- [ ] Controllo interazioni farmaci
- [ ] Modalità famiglia (più profili)
- [ ] Traduzione referti in linguaggio semplice
- [ ] Export PDF dati sanitari

### Fase 4
- [ ] Marketplace medici/veterinari reali
- [ ] Integrazione Apple Health / Google Fit
- [ ] AI Coach (alimentazione, sonno, peso)
- [ ] Sezione "One Health" (zoonosi, tossicità, allergie crociate)

## Branding

- **Nome**: `uHmana` (lowercase + H maiuscola — gioca su *Health* + *Human*)
- **Dominio**: `uhmana.app`
- **Package**: `app.uhmana.uhmana`
- **Palette**:
  - Primary `#0DB09E` (teal)
  - Secondary `#22C55E` (emerald)
  - Accent `#5B7CFA`
  - Warning `#F59E0B`
  - Background `#F5F7FA`

## Note legali

L'app **non è un dispositivo medico** ai sensi del Regolamento UE 2017/745 (MDR). Tutte le funzionalità AI sono presentate come "supporto informativo" e ogni risposta termina con un invito a consultare un professionista. Il system prompt centralizzato (`src/constants/disclaimers.ts`) impone all'AI di rifiutare diagnosi e prescrizioni.

Prima del lancio in produzione:
- Privacy policy GDPR (dati sanitari = categoria speciale, art. 9)
- Termini d'uso con esclusione di responsabilità
- Consenso esplicito al trattamento dati sanitari
- Verifica trademark "uHmana" in IT/EU prima di registrare dominio
