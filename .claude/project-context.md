# Rikken App - Project Context

## Project Overzicht
Een web applicatie voor het bijhouden van Rikken kaartspel scores en statistieken.

**Tech Stack:**
- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS (glassmorphism design system)
- **Database:** Supabase (PostgreSQL)
- **Authenticatie:** Supabase Auth
- **Deployment:** Docker container (rikken-frontend op poort 5173) + Vercel (productie)

## Database Schema

### Tabellen

**spelers**
- `id`, `naam`, `email`, `avatar_url`, `created_at`

**spelavonden**
- `id`, `datum` (date), `locatie_id` (→ locaties.id), `status` (text: `'actief'` | `'afgelopen'`), `start_deler` (→ avond_spelers.id), `created_at`
- `status = 'actief'` = avond is bezig, `status = 'afgelopen'` = afgerond

**avond_spelers**
- `id`, `spelavond_id` (→ spelavonden.id), `speler_id` (→ spelers.id), `volgorde` (int), `actief` (bool), `verdubbelaar` (bool)
- Koppeltabel: welke spelers spelen mee op een avond, in welke volgorde

**rondes**
- `id`, `spelavond_id`, `ronde_nummer`, `uitdager_id` (→ avond_spelers.id), `maat_id` (→ avond_spelers.id, nullable), `spel_settings_id` (→ spel_settings.id), `slagen_gehaald`, `gemaakt` (bool), `verdubbeld` (bool), `verdubbelaar_speler_id` (→ avond_spelers.id, nullable), `schoppen_vrouw_id` (→ avond_spelers.id, nullable), `laatste_slag_id` (→ avond_spelers.id, nullable)

**spel_settings**
- `id`, `naam` (text), `met_maat` (bool), `minimaal_slagen` (int)
- Bevat spelvormen: Solo, Troel, Meerdere, Schoppen Mie, etc.

**punten_settings**
- `id`, `spel_settings_id` (→ spel_settings.id), `gemaakt`, `overslag`, `nat`, `onderslag`

**locaties**
- `id`, `straat`, `created_at`

**profiles**
- `id` (= auth.users.id), `role` (text: `'admin'` | `'display'`), `approved` (bool), `speler_id` (→ spelers.id, nullable)

**api_keys** (voor agent authenticatie)
- `id`, `name`, `key`, `is_active`, `expires_at`, `last_used`, `created_by`

### Relaties
- `avond_spelers.spelavond_id` → `spelavonden.id`
- `avond_spelers.speler_id` → `spelers.id`
- `rondes.spelavond_id` → `spelavonden.id`
- `rondes.uitdager_id` → `avond_spelers.id` (niet spelers.id!)
- `rondes.maat_id` → `avond_spelers.id`
- `rondes.spel_settings_id` → `spel_settings.id`
- `spelavonden.locatie_id` → `locaties.id`
- `spelavonden.start_deler` → `avond_spelers.id` (eerste dealer van de avond)

## Architectuur

### Project Structuur
```
src/
├── components/
│   ├── spelavond/              ← Bestaan maar worden NIET gebruikt door Spelavond.jsx
│   │   ├── Scoreboard.jsx
│   │   ├── DecisionTree.jsx
│   │   ├── RoundHistory.jsx
│   │   ├── PlayerInfo.jsx
│   │   ├── SettingsModal.jsx
│   │   └── index.js
│   └── shared/
├── hooks/
│   ├── useSpelavond.js         ← Bestaat maar wordt NIET gebruikt
│   └── useDecisionTree.js      ← Bestaat maar wordt NIET gebruikt
├── lib/
│   ├── supabase.js             (Normale client - RLS enabled)
│   ├── supabase-agent.js       (Service role client voor agents)
│   ├── auth-middleware.js      (API key verificatie)
│   └── agent-helpers.js       (CRUD helpers voor agents)
├── pages/
│   ├── Home.jsx
│   ├── Spelavond.jsx           ← Monoliet (~1150 regels), alles in één component
│   ├── NieuweAvond.jsx
│   ├── AvondDetail.jsx
│   ├── Eindstand.jsx
│   ├── Spelers.jsx
│   ├── SpelerDetail.jsx
│   ├── Locaties.jsx
│   ├── SpelSettings.jsx
│   ├── PuntenSettings.jsx
│   ├── Analytics.jsx
│   ├── Login.jsx
│   ├── AdminPanel.jsx
│   ├── Account.jsx
│   └── ManageUsers.jsx
└── utils/
    ├── scoreCalculator.js      ← Bestaat maar wordt NIET gebruikt door Spelavond.jsx
    ├── dealerRotation.js       ← Bestaat maar wordt NIET gebruikt door Spelavond.jsx
    ├── validators.js           ← Bestaat maar wordt NIET gebruikt door Spelavond.jsx
    └── api.js
```

**Let op:** Na een grote refactor (maart 2026) zijn losse components/hooks/utils aangemaakt, maar `Spelavond.jsx` is daarna volledig herbouwd als monoliet. De losse bestanden zijn dead code.

### Supabase Clients
- **`supabase`** (uit `lib/supabase.js`) → Voor normale user operaties, RLS enabled
- **`supabaseAgent`** (uit `lib/supabase-agent.js`) → Voor agent operaties, service role, GEEN RLS

## Authenticatie & Rollen

- `role = 'admin'` → Volledige toegang (CRUD op alles)
- `role = 'display'` → Alleen lezen + score invoeren
- Hardcoded admin: `svankolck@gmail.com` (bypass profile lookup)

## Score Berekening (Rikken Regels)

De score berekening zit ingebakken in `Spelavond.jsx` (in `berekenScoreboard` en `loadAvond`). Er is ook een losse `src/utils/scoreCalculator.js` met dezelfde logica als pure functions (maar niet in gebruik).

**Basis:**
- Gemaakt: tegenspelers krijgen punten (uit `punten_settings.gemaakt` + overslag)
- Nat: uitdager(s) krijgen punten (uit `punten_settings.nat` + onderslag)
- Solo nat: 3× straf
- Verdubbeld: alles × 2

**Schoppen Mie:**
- `schoppen_vrouw_id` en `laatste_slag_id` krijgen elk `gemaakt` punten
- Als dezelfde speler beide: 4× punten

**Meerdere (bijv. Allemaal Rik):**
- Meerdere rondes tegelijk, één per deelnemer
- Gemaakt: anderen krijgen punten
- Nat: deelnemer krijgt 3× straf

## Dealer Rotatie & Stilzitters

Logica zit in `Spelavond.jsx` (`getStilzittersVoorRonde`). Ook los in `src/utils/dealerRotation.js`.

- `spelavonden.start_deler` = avond_spelers.id van de eerste dealer
- Dealer roteert per ronde op basis van `avond_spelers.volgorde`
- Bij 5 spelers: dealer zit stil
- Bij 6 spelers: dealer + speler 3 posities verderop zitten stil
- Bij ≤4 spelers: niemand zit stil

## Beslisboom (Potje Invoeren)

Stap-voor-stap flow in `Spelavond.jsx` via `beslisboom` state (`{ stap, data }`):

1. **speler** → Wie speelt (uitdager)?
2. **spelvorm** → Welk spel? (uit spel_settings)
3. **maat** → (alleen als `spel_settings.met_maat`) Wie is maat?
4. **slagen** → Hoeveel slagen gehaald?
5. **gemaakt** → Gemaakt of nat?
6. **verdubbelen** → Heeft iemand verdubbeld?
7. **wie_verdubbeld** → (als ja) Wie verdubbelde?
8. **schoppen_mie_vrouw** → (alleen Schoppen Mie) Wie heeft de vrouw?
9. **schoppen_mie_laatste** → (alleen Schoppen Mie) Wie heeft de laatste slag?

## Agent Authenticatie

- **Service Role Key** in `.env.local` als `VITE_SUPABASE_SERVICE_KEY`
- **Agent API Key** in `.env.local` als `VITE_AGENT_API_KEY`
- Agent credentials: `rikkenbot@vrxnetwork.ai` (zie project.md)

## Environment Variables

```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_KEY=eyJhbGc...
VITE_AGENT_API_KEY=agt_...
```

## Deployment

```bash
# Development (Docker)
docker restart rikken-frontend

# Productie
# Push naar GitHub → Vercel deployt automatisch
```

## Bekende Issues / TODO

- `src/components/spelavond/`, `src/hooks/`, en `src/utils/scoreCalculator.js` / `dealerRotation.js` / `validators.js` zijn dead code (waren bedoeld voor refactor die niet doorgezet is)
- `Spelavond.jsx` is een monoliet van ~1150 regels — kandidaat voor toekomstige refactor

## Laatste Update
8 april 2026 - Project context gesynchroniseerd met werkelijke codebase
