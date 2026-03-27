# 🤖 Agent Authentication System

## ✅ Wat is geïnstalleerd

Je Rikken app heeft nu een **volledig werkend agent authentication systeem**!

### Bestanden aangemaakt:
1. **src/lib/supabase-agent.js** - Agent Supabase client met service role key
2. **src/lib/auth-middleware.js** - API key verification middleware
3. **src/lib/agent-helpers.js** - Helper functies voor database operaties
4. **test-agent.js** - Basic test script
5. **test-agent-complete.js** - Complete systeem test

### Database:
- **api_keys table** - Voor veilige API key management
- **1 API key gegenereerd** - `agt_87d1813848890f646a0e94197316f485f682e541818a4b7dc50c8734c9cb4b29`

### Environment Variables (.env.local):
```env
VITE_SUPABASE_URL=https://whhevdndcazwkptdxktl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (voor normale users)
VITE_SUPABASE_SERVICE_KEY=eyJhbGc... (voor agent - FULL ACCESS)
VITE_AGENT_API_KEY=agt_87d18... (voor veilige API calls)
```

---

## 🔥 Hoe de Agent (Claude) het gebruikt

### Methode 1: Direct Database Access (Preferred)
```javascript
import { agentDb } from './src/lib/agent-helpers.js';

// Get alle spelers
const spelers = await agentDb.getSpelers();
console.log(spelers); // [{id: 1, naam: 'Sander'}, ...]

// Maak nieuwe speler
const newSpeler = await agentDb.createSpeler({
    naam: 'Nieuwe Speler',
    // ...andere velden
});

// Update spelavond
await agentDb.updateSpelavond(spelavondId, {
    status: 'completed'
});
```

### Methode 2: API Key Verification
```javascript
import { verifyApiKey } from './src/lib/auth-middleware.js';

const apiKey = 'agt_87d1813848890f646a0e94197316f485f682e541818a4b7dc50c8734c9cb4b29';
const auth = await verifyApiKey(apiKey);

if (auth.isValid) {
    // Agent is geauthenticeerd!
    console.log('Agent role:', auth.role); // 'admin'
}
```

---

## 📊 Test Resultaten

✅ **Agent mode**: ACTIVE
✅ **API Key verification**: Working
✅ **Database read**: Working (spelers, spelavonden, profiles)
✅ **API key management**: Working

**Gevonden data:**
- 6 spelers: Jettie, Laurens, Peter, Roel, Sander, Willem
- 5 spelavonden (recent)
- 2 user profiles

---

## 🛡️ Security

### Wat is veilig:
- ✅ Service key is ALLEEN in .env.local (NIET in Git)
- ✅ API keys hebben expiration (10 jaar)
- ✅ API keys kunnen gedeactiveerd worden
- ✅ Last_used tracking voor monitoring
- ✅ Row Level Security op api_keys table

### Wat MOET je NOOIT doen:
- ❌ Service key committen naar Git
- ❌ API key delen met anderen
- ❌ Service key in frontend code zetten

---

## 🔑 API Key Management

### Bekijk alle API keys:
```javascript
const keys = await agentDb.getApiKeys();
console.log(keys);
```

### Deactiveer een key:
```javascript
await agentDb.deactivateApiKey(keyId);
```

### Maak nieuwe key (via Supabase SQL Editor):
```sql
INSERT INTO api_keys (key, name, role, expires_at)
VALUES (
  'agt_' || encode(gen_random_bytes(32), 'hex'),
  'Nieuwe Agent',
  'admin',
  NOW() + INTERVAL '1 year'
)
RETURNING key;
```

---

## 📚 Beschikbare Agent Functies

### Spelers:
- `agentDb.getSpelers()` - Get alle spelers
- `agentDb.getSpeler(id)` - Get één speler
- `agentDb.createSpeler(data)` - Maak nieuwe speler
- `agentDb.updateSpeler(id, updates)` - Update speler
- `agentDb.deleteSpeler(id)` - Verwijder speler

### Spelavonden:
- `agentDb.getSpelavonden(limit)` - Get spelavonden
- `agentDb.getSpelavond(id)` - Get één spelavond
- `agentDb.createSpelavond(data)` - Maak nieuwe spelavond
- `agentDb.updateSpelavond(id, updates)` - Update spelavond

### Profiles:
- `agentDb.getProfiles()` - Get alle profiles
- `agentDb.updateProfile(userId, updates)` - Update profile
- `agentDb.linkProfileToSpeler(userId, spelerId)` - Link user aan speler

### Utilities:
- `getStats()` - Get app statistics
- `getAgentInfo()` - Get agent mode info
- `isAgentMode()` - Check if agent mode active

---

## 🧪 Testen

### Run basic test:
```bash
node test-agent.js
```

### Run complete test:
```bash
node test-agent-complete.js
```

---

## 📝 Volgende Stappen

Nu je agent auth werkt, kun je:

1. **Agent helper functies uitbreiden** voor meer database operaties
2. **API endpoints maken** die de API key middleware gebruiken
3. **Scheduled tasks** maken die agent functies gebruiken
4. **Admin panel uitbreiden** met agent capabilities

---

## 🆘 Troubleshooting

### Agent mode werkt niet:
- Check of `VITE_SUPABASE_SERVICE_KEY` in .env.local staat
- Run `node test-agent.js` om te testen

### API key verification faalt:
- Check of de key nog active is: `SELECT * FROM api_keys WHERE key = 'jouw_key';`
- Check of de key niet expired is

### "Column does not exist" errors:
- Check database schema in Supabase
- Update agent-helpers.js met correcte kolomnamen

---

## 📞 Support

Als er problemen zijn:
1. Check de test scripts: `test-agent.js` en `test-agent-complete.js`
2. Check Supabase logs in dashboard
3. Vraag Claude (de agent) om hulp! 😊

---

**🎉 Agent Authentication System v1.0 - Gemaakt op 27 maart 2026**
