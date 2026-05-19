# uHmana

> Il tuo assistente di salute AI, sempre con te. Per te e per i tuoi animali.

App mobile Flutter (iOS + Android) che unisce:

- Cartella clinica personale umani + animali
- Chat AI medica/veterinaria multimodale (testo, foto, video, PDF)
- Analisi immagini AI per sintomi visibili
- Timeline salute con tutti gli eventi clinici
- Modalità emergenza per valutazione rapida
- Promemoria farmaci, visite, vaccini

> ATTENZIONE: uHmana è un servizio di **supporto informativo**. Non fornisce diagnosi né prescrizioni e non sostituisce il parere di un medico o veterinario. In emergenza chiama il **112**.

---

## Quick start

```bash
# 1. Installa Flutter 3.22+
flutter --version

# 2. Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env e inserisci la tua OPENROUTER_API_KEY
# Registrati gratis su https://openrouter.ai

# 3. Installa dipendenze
flutter pub get

# 4. Avvia
flutter run
```

## Stack tecnico

| Layer | Scelta | Note |
|---|---|---|
| Framework | **Flutter** | iOS + Android da un codebase |
| State management | **Riverpod** | Type-safe, testabile |
| Navigazione | **go_router** | Deep linking ready |
| AI | **OpenRouter** | 1 sola API key per tutti i modelli |
| Auth | Firebase Auth | Google + Apple + Email |
| DB | Firestore | Sync real-time, offline |
| Storage | Firebase Storage | Foto, PDF, video |
| Monetizzazione | AdMob + RevenueCat | Banner + abbonamenti Premium |

## Modelli OpenRouter consigliati

Configurati in `.env`. Strategia: **primario gratis → fallback automatico se rate-limited**.

| Variabile | Default | Costo |
|---|---|---|
| `OPENROUTER_MODEL_PRIMARY` | `google/gemini-2.0-flash-exp:free` | Gratis |
| `OPENROUTER_MODEL_FALLBACK` | `meta-llama/llama-3.3-70b-instruct:free` | Gratis |
| `OPENROUTER_MODEL_VISION` | `google/gemini-2.0-flash-exp:free` | Gratis, supporta immagini |

Quando vorrai qualità superiore puoi switchare a `anthropic/claude-haiku-4-5` (~$1/M tok) o `deepseek/deepseek-chat-v3` (~$0.14/M tok).

## Struttura del progetto

```
lib/
├── main.dart
├── app/                       # Bootstrap MaterialApp
├── core/
│   ├── theme/                 # Palette + tipografia (Poppins + Inter)
│   ├── router/                # go_router config
│   └── constants/             # Disclaimer AI, system prompt
├── features/
│   ├── splash/
│   ├── welcome/               # Scelta Umano/Animale
│   ├── auth/                  # Login Google/Apple/Email
│   ├── dashboard/             # Home con tile e panoramica
│   ├── chat/                  # Chat AI multimodale
│   ├── image_analysis/        # Analisi foto sintomi
│   ├── timeline/              # Storico eventi salute
│   ├── profile/               # Cartella clinica
│   ├── emergency/             # Modalità SOS
│   ├── reports/               # PDF e referti
│   ├── reminders/             # Promemoria farmaci/visite
│   └── settings/              # Privacy, notifiche, lingua
├── models/                    # HealthProfile, TimelineEvent, ChatMessage
├── services/                  # OpenRouter, repositories, controllers
└── widgets/                   # MainScaffold, logo, componenti riusabili
```

## Schermate implementate

1. **Splash** – logo animato + slogan
2. **Welcome** – scelta Umano/Animale
3. **Login** – Google, Apple, Email
4. **Dashboard** – panoramica salute, tile, emergenza, promemoria
5. **Chat AI** – multimodale con disclaimer fisso
6. **Analisi immagine** – upload foto + risposta AI
7. **Cartella clinica** – patologie, terapie, allergie, vaccini
8. **Timeline** – filtri, raggruppamento per giorno
9. **Aggiungi evento** – bottom sheet rapido
10. **Promemoria** – tabs farmaci/visite/altro
11. **Modalità emergenza** – pulsante SOS + descrizione
12. **Profilo** – avatar, premium badge, scorciatoie
13. **Impostazioni** – notifiche, privacy, lingua, tema

## Roadmap

### MVP (in corso)
- [x] UI completa 13 schermate
- [x] Chat AI testo + immagini via OpenRouter
- [x] Timeline con repository in-memory
- [x] Disclaimer legale centralizzato + system prompt rigido
- [ ] Firebase Auth (Google, Apple, Email)
- [ ] Firestore per cartella clinica persistente
- [ ] Firebase Storage per upload media
- [ ] Notifiche locali per promemoria

### Fase 2
- [ ] AdMob banner
- [ ] RevenueCat Premium (€7,99/mese)
- [ ] Report AI mensile automatico
- [ ] Controllo interazioni farmaci
- [ ] Modalità famiglia (più profili)
- [ ] Traduzione referti in linguaggio semplice
- [ ] Export PDF dati sanitari

### Fase 3
- [ ] Marketplace medici/veterinari reali
- [ ] Integrazione Apple Health / Google Fit
- [ ] AI Coach (alimentazione, sonno, peso)
- [ ] Sezione "One Health" (zoonosi, tossicità, allergie crociate)

## Branding

- **Nome**: `uHmana` (lowercase + H maiuscola — gioca su *Health* + *Human*)
- **Dominio**: `uhmana.app`
- **Package**: `com.uhmana.app`
- **Font**: Poppins (titoli) + Inter (body)
- **Palette**:
  - Primary `#0DB09E` (teal)
  - Secondary `#22C55E` (emerald)
  - Accent `#5B7CFA`
  - Warning `#F59E0B`
  - Background `#F5F7FA`

## Note legali

L'app **non è un dispositivo medico** ai sensi del Regolamento UE 2017/745 (MDR). Tutte le funzionalità AI sono presentate come "supporto informativo" e ogni risposta termina con un invito a consultare un professionista. Il system prompt centralizzato (`lib/core/constants/disclaimers.dart`) impone all'AI di rifiutare diagnosi e prescrizioni.

Prima del lancio in produzione:
- Privacy policy GDPR (dati sanitari = categoria speciale, art. 9)
- Cookie banner web (se PWA)
- Termini d'uso con esclusione di responsabilità
- Consenso esplicito al trattamento dati sanitari
- Verifica trademark "uHmana" in IT/EU prima di registrare dominio
