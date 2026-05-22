# uHmana — Note di progetto e stato avanzamento

## Stato attuale: BUILD R20 ✅
Ultima build pushata su `claude/create-uhmana-app-SF02w`, PR #48 aperta verso `main`.

---

## Cronologia build

| Build | Contenuto principale |
|-------|---------------------|
| R1–R11 | Setup iniziale, struttura app, auth, profili |
| R12 | Fix scroll wheel orario + safe area referti |
| R13 | Grafico andamento valori AI per categoria referti |
| R14 | Redesign Timeline (memoria sanitaria) + Nuovo aggiornamento |
| R15 | Grafici referti compatti stile andamento + mesi espandibili |
| R16 | Redesign grafico valori AI (valore grande + stato + asse etichettato) |
| R17 | Assistente Vet: centro veterinario AI con hero, controllo rapido, insight |
| R18 | Pasti & Dieta animale: dashboard nutrizione con pasti, peso, acqua, tossici |
| R19 | Assistente Vet rework: chat interna, pagina sintomi, monitoraggio dinamico |
| R20 | Grafico referti combinato, chat sezione pop-up, picker orario ruota, water modal |

---

## R19 — Assistente Vet rework (ff49b16)

### Cosa è stato fatto
- **`frontend/src/store/vetStore.ts`** (nuovo): Zustand+AsyncStorage per messaggi vet, storico sintomi, lista "Da monitorare", insightText. Rileva `[MONITORA: condizione]` nelle risposte AI.
- **`frontend/app/sintomo-vet.tsx`** (nuovo): schermata dedicata inserimento sintomi con chip multi-select, descrizione libera, foto/video. Al submit naviga a `vet-ai` con params `openChat=1` e `prefill`.
- **`frontend/app/vet-ai.tsx`** (riscritto): "Ha un sintomo" → `sintomo-vet`, "Fai una domanda" → VetChatModal, "Da monitorare" editabile/cancellabile, insight da store.
- **`frontend/app/chat-vet.tsx`** (eliminato in R20): sostituito da VetChatModal.

### Decisioni di design
- Chip sintomi BASE_CHIPS + frequenti (≥3 occorrenze in storico) → unione senza duplicati
- `[MONITORA: label]` nel testo AI viene rimosso dal testo mostrato e aggiunto alla lista automaticamente
- DEFAULT_MONITOR: 4 voci pre-impostate (appetito, zoppia, vomito, comportamento)

---

## R20 — UI polish & chat modals consistency (b86c17d)

### Cosa è stato fatto
- **`frontend/app/reports-category.tsx`**: mesi chiusi di default, grafico multi-serie `CombinedTrendChart` per valori da attenzionare (normalizzazione per-serie), NormalRow per valori ok
- **`frontend/src/components/SectionChatModal.tsx`** (nuovo): chat ephemera bottom-sheet generica per qualsiasi sezione
- **`frontend/src/components/VetChatModal.tsx`** (nuovo): chat vet persistente bottom-sheet con prefill e rilevamento monitor
- **`frontend/src/components/TimeWheelModal.tsx`** (nuovo): time picker a ruota riutilizzabile
- **`frontend/app/nutrizione.tsx`**: water modal slide-up invece di Alert, TimeWheelModal per orario pasto, SectionChatModal per Insight AI nutrizione, allineamento card acqua

### Decisioni di design
- Tutte le chat di sezione aprono come bottom-sheet modal (coerente con pattern Sintomi in Umano)
- Picker orario sempre a ruota (wheel), mai TextInput libero
- `buildContext()` / `buildNutriContext()`: funzione che assembla il contesto dati per l'AI della sezione
- `autoPrompt` in SectionChatModal: messaggio inviato automaticamente all'apertura, usato per "Insight AI"

---

## Schermate completate

### Mode Umano
- `index.tsx` — Home dashboard
- `sintomi.tsx` — Sintomi con SintomiChatModal (pattern bottom-sheet da replicare)
- `reminders.tsx` — Farmaci e terapie con TimeWheelModal per orari
- `insight.tsx` — Insight salute AI
- `reports.tsx` — Lista cartelle referti
- `reports-category.tsx` — Dettaglio con grafico combinato (R20)
- `timeline.tsx` — Timeline sanitaria

### Mode Animale
- `vet-ai.tsx` — Assistente Vet con VetChatModal (R19/R20)
- `sintomo-vet.tsx` — Inserimento sintomi (R19)
- `nutrizione.tsx` — Pasti & Dieta con SectionChatModal (R20)
- `reminders.tsx` — Vaccini (condiviso con umano, route differente)

---

## TODO / prossime schermate da sviluppare

### Animale — schermate mancanti
- **Comportamento** (`/(tabs)/timeline` in mode pet): attualmente punta alla timeline umano, serve versione pet
- **Peso & crescita**: grafico andamento peso animale (dati già in petNutrition store)
- **Vaccini dettaglio**: simile a reminders umano ma con logica richiami vet

### Umano — miglioramenti in sospeso
- **Insight Salute** (`insight.tsx`): verificare se usa già SectionChatModal o ancora chat globale → allineare al pattern R20
- **Sintomi**: verificare stato dopo R20 (SintomiChatModal era già pattern corretto)

### Trasversale
- Portare `TimeWheelModal` ovunque ci siano campi orario ancora testuali
- Portare `SectionChatModal` ovunque ci siano bottoni AI che aprono chat globale
- Dark mode: tema non ancora implementato (colori hardcoded in molte schermate)

---

## Architettura AI — note importanti

### Contesto per l'AI
Ogni sezione costruisce il proprio context string da passare a `chat()`:
```ts
const buildContext = () => {
  const parts = [`Animale: ${petName}.`];
  // aggiungi dati rilevanti della sezione...
  return parts.join(' ');
};
```

### Rilevamento tag monitor (solo vetStore)
Pattern: `[MONITORA: etichetta condizione]`
- Rimosso dal testo mostrato all'utente
- Auto-aggiunto alla lista "Da monitorare" se non già presente

### Model usato
`openrouter.ts` → servizio centralizzato, non chiamare direttamente API Anthropic/OpenAI nelle schermate

---

## Pattern da NON rompere

1. **Auth**: sempre `useAuth()` da `../src/context/AuthContext`, mai `@clerk/clerk-expo`
2. **Chat**: ogni sezione ha la SUA chat interna, mai aprire la chat globale dell'app
3. **Orari**: sempre `TimeWheelModal`, mai TextInput libero
4. **Modal**: sempre `animationType="slide"` + overlay trasparente + sheet ancorato in basso
5. **Versioning**: incrementare `BUILD_LABEL` in `version.ts` ad ogni commit significativo
6. **Branch**: sviluppo sempre su `claude/create-uhmana-app-SF02w`
