---
description: Rikken Score App - Vercel/Supabase project context
---

# Rikken Score App

## Project Overzicht
Nederlandse kaartspel score-tracking app voor het spel "Rikken" (variant van Klaverjassen).

## Tech Stack
- **Frontend**: React + Vite
- **Styling**: Tailwind CSS + custom CSS
- **Backend**: Supabase (PostgreSQL database + Auth)
- **Deployment**: Vercel
- **Repository**: https://github.com/svankolck/rikken-app

## Live URL
https://rikken-score-app.vercel.app

## Supabase Project
- **URL**: https://whhevdndcazwkptdxktl.supabase.co
- **Anon Key**: In Vercel env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

## Lokale Ontwikkeling
```bash
cd /root/rikken-app-new
npm run dev
```

## Deployment
Push naar `main` branch → Vercel auto-deploy.

## Database Tabellen
- `spelers` - Speler namen
- `locaties` - Speellocaties
- `spelavonden` - Game nights (datum, locatie, status, start_deler)
- `avond_spelers` - Spelers per spelavond (volgorde, actief)
- `rondes` - Gespeelde rondes (spelvorm, uitdager, maat, slagen, gemaakt)
- `spel_settings` - Spelvormen configuratie
- `scores` - Punten per ronde per speler (TODO)

## Huidige Status
- ✅ Login/Auth werkt (Supabase Auth)
- ✅ Spelers/Locaties CRUD
- ✅ Nieuwe spelavond starten
- ✅ Spelavond pagina laadt
- ✅ Beslisboom werkt
- ✅ Rondes worden opgeslagen
- ✅ Start deler selectie en rotatie
- ✅ Volledige Rikken scoring geïmplementeerd (punten_settings)
- ✅ Meerdere spelvormen (Misère, Piek, etc.) correct berekend
- ✅ Allemaal Piek multi-row saving
- ✅ Schoppen Mie scoring (vrouw + laatste slag + bonus)
- ✅ Eindstand pagina met correcte scoring
- ✅ UI fixes (scorebord leesbaarheid, Meerdere knop)
- ⏳ Analytics nog niet omgezet naar Supabase
- ⏳ AdminPanel nog niet omgezet

## Database Kolommen (rondes tabel)
- `schoppen_vrouw_id` - Wie had de Schoppen Vrouw
- `laatste_slag_id` - Wie had de laatste slag
- `verdubbelaar_speler_id` - Wie heeft verdubbeld

## Belangrijke Bestanden
- `/root/rikken-app-new/src/pages/Spelavond.jsx` - Hoofd game logic (1900+ regels)
- `/root/rikken-app-new/src/pages/Eindstand.jsx` - Eindstand met correcte scoring
- `/root/rikken-app-new/src/lib/supabase.js` - Supabase client
- `/root/rikken-app-new/vercel.json` - SPA routing config

