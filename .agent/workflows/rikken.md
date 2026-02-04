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
- ⚠️ Scoring is vereenvoudigd (+10/-10)
- ❌ Volledige puntentelling nog niet geïmplementeerd
- ❌ Analytics/Eindstand pagina's nog niet omgezet

## Belangrijke Bestanden
- `/root/rikken-app-new/src/pages/Spelavond.jsx` - Hoofd game logic (1800+ regels)
- `/root/rikken-app-new/src/lib/supabase.js` - Supabase client
- `/root/rikken-app-new/vercel.json` - SPA routing config
