# uHmana — Guida per Claude Code

## Panoramica progetto
App React Native + Expo SDK 54 per la gestione della salute di persone e animali domestici.
Due "mode": **umano** (clinico, teal) e **animale** (pet-care, emerald/warm).
Stack: Expo Router (file-based), Zustand + AsyncStorage, TypeScript, expo-linear-gradient, expo-haptics.

## Repository
- GitHub: `alolicato0/uhmana`
- Branch sviluppo attivo: `claude/create-uhmana-app-SF02w`
- **Sempre sviluppare su questo branch, mai pushare su main direttamente**
- PR verso `main` solo quando l'utente lo richiede esplicitamente

## Versioning
- File: `frontend/src/version.ts`
- `BUILD_LABEL` usa etichette progressive `R1`, `R2`, … `R20`, `R21`…
- Incrementare il label ad ogni commit significativo
- `VERSION_STRING` mostrato nell'UI come `v{APP_VERSION} · BUILD {BUILD_LABEL}`

## Struttura cartelle chiave
```
frontend/
  app/                    # Schermate Expo Router
    (auth)/               # Login/registrazione
    (tabs)/               # Tab bar principale
    nutrizione.tsx        # Pasti & Dieta animale
    vet-ai.tsx            # Assistente Vet
    sintomo-vet.tsx       # Inserimento sintomi (nuova pagina R19)
    reports.tsx           # Lista cartelle referti
    reports-category.tsx  # Dettaglio categoria referti + grafici
    sintomi.tsx           # Sintomi umano
    reminders.tsx         # Farmaci / vaccini
    insight.tsx           # Insight salute umano
    timeline.tsx          # Timeline sanitaria
  src/
    components/           # Componenti riutilizzabili
    context/              # AuthContext (auth custom, NON Clerk)
    services/             # openrouter.ts (chat AI), api.ts
    store/                # Zustand stores
    theme/index.ts        # colors, radii, typography
    config/modeConfig.ts  # Tile e palette per mode umano/animale
    version.ts            # BUILD_LABEL
```

## Autenticazione
- **NON usare `@clerk/clerk-expo`** — il progetto usa auth custom
- Import corretto: `import { useAuth } from '../src/context/AuthContext'`
- Token: `const { getToken } = useAuth()` → `await getToken()`

## Chat AI — pattern e regole

### Chat di sezione (ephemera, bottom-sheet)
Usare `SectionChatModal` (`frontend/src/components/SectionChatModal.tsx`):
```tsx
<SectionChatModal
  visible={chatOpen}
  onClose={() => setChatOpen(false)}
  title="Nome Sezione AI"
  accent={ACCENT_COLOR}
  welcome="Messaggio di benvenuto..."
  buildContext={() => buildContextString()}
  autoPrompt={chatPrompt}  // opzionale: messaggio pre-inviato all'apertura
  onAssistantReply={(text) => { /* opzionale */ }}
/>
```
- **Ogni sezione ha la sua chat interna**, non si apre mai la chat globale dell'app
- `buildContext()` deve includere i dati rilevanti della sezione (profilo, misurazioni, ecc.)

### Chat Vet (persistente, store-backed)
Usare `VetChatModal` (`frontend/src/components/VetChatModal.tsx`):
```tsx
<VetChatModal
  visible={chatOpen}
  onClose={() => setChatOpen(false)}
  petName={petName}
  prefill={chatPrefill}  // opzionale: testo pre-popolato
/>
```
- Usa `vetStore` (Zustand + AsyncStorage) — messaggi persistono tra sessioni
- Rileva `[MONITORA: condizione]` nelle risposte AI → aggiunge a lista monitoraggio automaticamente
- `prefill` inviato automaticamente all'apertura (con ref per evitare doppio invio)

### Servizio AI
```ts
import { chat } from '../services/openrouter';
// chat({ history: ChatMessage[], extraContext: string, token: string })
```

## Time picker (orario)
Usare `TimeWheelModal` (`frontend/src/components/TimeWheelModal.tsx`), NON TextInput per orari:
```tsx
<TimeWheelModal
  visible={showTimePicker}
  value={timeString}  // "HH:MM"
  onConfirm={(t) => setTime(t)}
  onClose={() => setShowTimePicker(false)}
  accent={ACCENT_COLOR}
/>
```
- Wheel con ore (0-23) e minuti (ogni 5 min)
- `snapToInterval`, `decelerationRate="fast"`
- Questo pattern vale per **tutte le schermate con picker orario**

## Store Zustand
Tutti gli store usano `persist` con AsyncStorage:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

Store principali:
- `vetStore.ts` — messaggi chat vet, storico sintomi, lista monitoraggio, insightText
- `chat.ts` — messaggi chat globale
- `symptoms.ts` — sintomi umano
- `reminders.ts` — farmaci/vaccini
- `timeline.ts` — eventi timeline
- `reportsLocal.ts` — referti locali
- `petNutrition.ts` — pasti, peso, acqua animale
- `profile.ts` / `profiles.ts` — profilo utente/animale

## Navigazione (Expo Router)
```ts
import { router, useLocalSearchParams } from 'expo-router';
router.push('/nome-pagina');
router.replace({ pathname: '/nome-pagina', params: { chiave: valore } });
```
- Params passati come stringhe, decodificare se necessario (`decodeURIComponent`)
- Usare `useRef` per evitare doppio trigger su params negli `useEffect`

## Componenti UI — regole generali
- **Modal bottom-sheet**: `<Modal animationType="slide" transparent>` + overlay `flex:1` + sheet ancorato in basso
- **Safe area**: `<SafeAreaView edges={['top','bottom']}>` (react-native-safe-area-context)
- **Haptics**: `expo-haptics` su press significativi (chip toggle, submit, apertura chat)
- **Chip multi-select**: stato array, toggle con include/filter, stile active con colore primario sezione
- **Accordion/mesi referti**: chiusi di default (`useState<Set<string>>(() => new Set())`)

## Grafici referti
- Valori da attenzionare → `CombinedTrendChart`: un unico grafico multi-serie
- Ogni serie normalizzata al proprio min/max (scale Y indipendenti, asse X comune per date)
- Valori normali → `NormalRow` (lista compatta senza grafico)
- Palette serie: array di colori distinti ciclati per indice

## Theme
```ts
import { colors, radii } from '../theme';
// colors.primary, colors.ink, colors.muted, colors.border, colors.bg
// radii.sm, radii.md, radii.lg
```

## Git & commit
- Messaggio commit: `BUILD R{N}: descrizione breve`
- Push: `git push -u origin claude/create-uhmana-app-SF02w`
- Non creare PR a meno che l'utente non lo richieda esplicitamente
