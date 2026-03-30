# Rikken App - Project Context

## Project Overzicht
Een web applicatie voor het bijhouden van Rikken kaartspel scores en statistieken.

**Tech Stack:**
- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authenticatie:** Supabase Auth
- **Deployment:** Docker container (rikken-frontend op poort 5173)

## Database Schema

### Belangrijkste Tabellen

**spelers**
- `id`, `naam`, `email`, `avatar_url`, `created_at`
- Bevat alle geregistreerde spelers

**spelavonden**
- `id`, `datum`, `locatie_id`, `start_deler_id`, `actief`, `created_by`
- Representeert een speelsessie
- `start_deler_id` → eerste dealer van de avond
- `actief` → of de avond nog bezig is

**rondes**
- `id`, `spelavond_id`, `ronde_nummer`, `speler_id`, `spelvorm`, `maat_id`
- `slagen_voorspeld`, `slagen_gehaald`, `punten_gemaakt`, `punten_nat`
- `is_verdubbeld`, `verdubbeld_door_id`
- `schoppen_mie_vrouw`, `schoppen_mie_laatste_slag`
- Elke gespeelde ronde wordt hier opgeslagen

**locaties**
- `id`, `naam`, `adres`, `created_at`
- Locaties waar gespeeld wordt

**profiles**
- Gekoppeld aan Supabase auth users
- `id` (matches auth.users.id), `display_name`, `avatar_url`

**api_keys** (voor agent authenticatie)
- `id`, `name`, `key`, `is_active`, `expires_at`, `last_used`, `created_by`
- Voor Claude/Antigravity agent toegang

### Relaties
- `rondes.spelavond_id` → `spelavonden.id`
- `rondes.speler_id` → `spelers.id`
- `rondes.maat_id` → `spelers.id` (bij team spelvormen)
- `rondes.verdubbeld_door_id` → `spelers.id`
- `spelavonden.locatie_id` → `locaties.id`
- `spelavonden.start_deler_id` → `spelers.id`

## Architectuur

### Project Structuur
```
src/
├── components/
│   ├── spelavond/          ← Spelavond specifieke componenten
│   │   ├── Scoreboard.jsx       (Score tabel)
│   │   ├── DecisionTree.jsx     (Potje invoer flow)
│   │   ├── RoundHistory.jsx     (Laatste 5 rondes)
│   │   ├── PlayerInfo.jsx       (Ronde info, dealer, stilzitters)
│   │   ├── SettingsModal.jsx    (Spelers beheer)
│   │   └── index.js             (Barrel exports)
│   └── [andere componenten]
├── hooks/
│   ├── useSpelavond.js     ← Data loading + scorebord berekening
│   └── useDecisionTree.js  ← 9-staps potje invoer state machine
├── lib/
│   ├── supabase.js              (Normale client - RLS enabled)
│   ├── supabase-agent.js        (Service role client voor agents)
│   ├── auth-middleware.js       (API key verificatie)
│   └── agent-helpers.js         (CRUD helpers voor agents)
├── pages/
│   ├── Home.jsx
│   ├── Spelavond.jsx       ← GEREFACTORED (was 2016 regels → nu 262)
│   ├── Statistieken.jsx
│   └── [andere pages]
├── utils/
│   ├── scoreCalculator.js  ← Pure functions voor score berekening
│   ├── dealerRotation.js   ← Dealer rotatie en stilzitters logica
│   └── validators.js       ← Input validatie en formatting
└── App.jsx
```

## Belangrijke Patterns & Conventies

### 1. Modulaire Architectuur (sinds refactor)
- **Utils** = Pure functions, geen side effects, makkelijk testbaar
- **Hooks** = State management en data fetching
- **Components** = Presentatie, krijgen props, geen directe database calls

### 2. Supabase Clients
- **`supabase`** (uit `lib/supabase.js`) → Voor normale user operaties, RLS enabled
- **`supabaseAgent`** (uit `lib/supabase-agent.js`) → Voor agent operaties, service role, GEEN RLS

### 3. Score Berekening (Rikken Regels)
Zie `src/utils/scoreCalculator.js` voor details:

**Basis:**
- Gemaakt: 5 punten (+ overslagen)
- Nat: -5 punten
- Verdubbeld: punten × 2
- Wie verdubbeld: extra punten als gemaakt, extra straf als nat

**Speciale Spelvormen:**
- **Schoppen Mie**: 10 punten basis + bonussen (vrouw = +5, laatste slag = +5)
- **Meerdere**: alles × 2

**Punten Config** (uit `spelavonden.punten_instellingen`):
```javascript
{
  gemaakt: 5,        // basis punten voor gemaakt
  nat: -5,           // straf voor nat
  overslag: 1,       // per slag boven minimum
  verdubbeld: 2,     // multiplier
  wie_verdubbeld: 5  // extra punten/straf
}
```

### 4. Dealer Rotatie & Stilzitters
Zie `src/utils/dealerRotation.js`:

- Dealer roteert met de klok mee elke ronde
- Bij 5 spelers: dealer zit stil
- Bij 6 spelers: dealer + speler tegenover zitten stil
- Bij ≤4 spelers: niemand zit stil

### 5. Decision Tree Flow (Potje Invoeren)
Zie `src/hooks/useDecisionTree.js` - 9 stappen:

1. **speler** → Wie speelt dit potje?
2. **spelvorm** → Solo, Troel, Meerdere, Schoppen Mie
3. **maat** → (alleen bij Troel/Meerdere) Wie is maat?
4. **slagen** → Hoeveel slagen voorspeld?
5. **gemaakt** → Gemaakt of nat?
6. **verdubbelen** → Heeft iemand verdubbeld?
7. **wie_verdubbeld** → (als ja) Wie verdubbelde?
8. **schoppen_mie_vrouw** → (alleen Schoppen Mie) Vrouw gepakt?
9. **schoppen_mie_laatste** → (alleen Schoppen Mie) Laatste slag?

Na stap 9 → ronde opslaan in database

## Agent Authenticatie

### Setup (voltooid)
1. **Service Role Key** in `.env.local`:
   ```
   VITE_SUPABASE_SERVICE_KEY=eyJhbGc...
   ```

2. **Agent API Key** in `.env.local`:
   ```
   VITE_AGENT_API_KEY=agt_87d18138...
   ```

3. **API Keys Tabel** in Supabase:
   - Bevat agent keys met expiratie en permissies
   - Keys worden geverifieerd via `auth-middleware.js`

### Usage voor Agents
```javascript
import { supabaseAgent } from './lib/supabase-agent.js';
import { agentDb } from './lib/agent-helpers.js';

// Direct database toegang (bypass RLS)
const spelers = await agentDb.getSpelers();
const spelavond = await agentDb.getSpelavond(id);
await agentDb.createSpeler({ naam: 'Jan' });
```

Zie `AGENT_AUTH_README.md` voor volledige documentatie.

## Environment Variables

### Required in `.env.local`:
```env
# Supabase (user client - RLS enabled)
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (anon/public key)

# Agent authentication (service role - NO RLS)
VITE_SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
VITE_AGENT_API_KEY=agt_... (agent API key from database)
```

**BELANGRIJK:** Service role key = volledige database toegang, ALLEEN voor server-side/agents!

## Deployment

### Docker Setup
- Container naam: `rikken-frontend`
- Poort: `5173` (Vite dev server)
- Dockerfile locatie: `/root/rikken-app-new/Dockerfile`

### Build & Deploy
```bash
# Development
npm run dev

# Build
npm run build

# Preview productie build
npm run preview

# Docker rebuild (if needed)
docker restart rikken-frontend
```

## Recente Refactor (Maart 2026)

### Spelavond.jsx: 2016 → 262 regels
**Backup:** `src/pages/Spelavond.jsx.backup-original-2016lines`

**Wat is er gebeurd:**
- Monolithisch bestand opgesplitst
- 3 utility bestanden gemaakt (pure functions)
- 2 custom hooks gemaakt (state management)
- 5 UI componenten gemaakt (presentatie)
- Main component nu alleen orchestratie

**Voordelen:**
- 87% code reductie in main file
- Betere testbaarheid
- Herbruikbare componenten
- Duidelijke scheiding van concerns
- Makkelijker te onderhouden

## Veel Gebruikte Queries

### Scorebord Berekenen
```javascript
// Zie useSpelavond.js hook
// 1. Laad alle rondes van spelavond
// 2. Groepeer per speler
// 3. Bereken totaal per speler
// 4. Sorteer op score (hoogste eerst)
```

### Nieuwe Ronde Opslaan
```javascript
// Zie DecisionTree.jsx component
// 1. Verzamel alle data via 9-staps flow
// 2. Bereken punten met scoreCalculator
// 3. Insert in rondes tabel
// 4. Update scorebord
```

## Tips voor Toekomstige Ontwikkeling

1. **Nieuwe features toevoegen:**
   - Volg modulaire pattern: utils → hooks → components
   - Houd componenten klein en gefocust
   - Gebruik custom hooks voor herbruikbare logica

2. **Database wijzigingen:**
   - Update via Supabase dashboard
   - Test met beide clients (user + agent)
   - Check RLS policies

3. **Score berekening aanpassen:**
   - Pas `scoreCalculator.js` aan
   - Unit tests zijn makkelijk toe te voegen (pure functions!)

4. **Nieuwe spelvormen:**
   - Voeg toe aan `spelvorm` enum in database
   - Update `scoreCalculator.js` logica
   - Voeg stap toe in `DecisionTree` indien nodig

## Contacten & Links

- **Repository:** https://github.com/svankolck/rikken-app
- **Supabase Project:** [Project ID uit env vars]
- **Gebruiker:** svankolck

## Laatste Update
27 maart 2026 - Grote refactor + agent authenticatie systeem toegevoegd
