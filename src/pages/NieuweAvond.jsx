import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function NieuweAvond() {
  const navigate = useNavigate();
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [spelers, setSpelers] = useState([]);
  const [locaties, setLocaties] = useState([]);
  const [geselecteerdeSpelers, setGeselecteerdeSpelers] = useState([]);
  const [geselecteerdeLocatie, setGeselecteerdeLocatie] = useState('');
  const [loading, setLoading] = useState(false);
  const [actiefAvond, setActiefAvond] = useState(null);

  useEffect(() => {
    checkActiefAvond();
    loadData();
  }, []);

  const checkActiefAvond = async () => {
    try {
      const { data, error } = await supabase
        .from('spelavonden')
        .select('*, locaties(straat)')
        .eq('status', 'actief')
        .order('id', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        setActiefAvond(data[0]);
      }
    } catch (err) {
      console.error('Fout bij checken actieve avond:', err);
    }
  };

  const loadData = async () => {
    try {
      const [spelersResult, locatiesResult] = await Promise.all([
        supabase.from('spelers').select('*').order('naam'),
        supabase.from('locaties').select('*').order('straat')
      ]);
      if (spelersResult.data) setSpelers(spelersResult.data);
      if (locatiesResult.data) setLocaties(locatiesResult.data);
    } catch (err) {
      console.error('Fout bij laden data:', err);
    }
  };

  const handleSpelerToggle = (spelerId) => {
    if (geselecteerdeSpelers.includes(spelerId)) {
      setGeselecteerdeSpelers(geselecteerdeSpelers.filter(id => id !== spelerId));
    } else {
      if (geselecteerdeSpelers.length < 6) {
        setGeselecteerdeSpelers([...geselecteerdeSpelers, spelerId]);
      } else {
        alert('Maximaal 6 spelers toegestaan');
      }
    }
  };

  const handleStart = async () => {
    if (geselecteerdeSpelers.length < 4) {
      alert('Minimaal 4 spelers vereist');
      return;
    }
    if (!geselecteerdeLocatie) {
      alert('Selecteer een locatie');
      return;
    }

    setLoading(true);
    try {
      const { data: spelavond, error: spelavondError } = await supabase
        .from('spelavonden')
        .insert({ datum, locatie_id: parseInt(geselecteerdeLocatie), status: 'actief' })
        .select()
        .single();

      if (spelavondError) throw spelavondError;

      const avondSpelers = geselecteerdeSpelers.map((spelerId, index) => ({
        spelavond_id: spelavond.id,
        speler_id: spelerId,
        volgorde: index + 1,
        actief: true
      }));

      const { error: spelerError } = await supabase.from('avond_spelers').insert(avondSpelers);
      if (spelerError) throw spelerError;

      navigate(`/spelavond/${spelavond.id}`);
    } catch (err) {
      console.error('Fout bij starten avond:', err);
      alert(`Fout bij starten avond: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSpelerNaam = (id) => {
    const speler = spelers.find(s => s.id === id);
    return speler ? speler.naam : '';
  };

  const getInitials = (naam) => {
    return naam.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDatum = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const canStart = geselecteerdeSpelers.length >= 4 && geselecteerdeLocatie;

  return (
    <div className="min-h-screen pb-40 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Nieuwe Avond
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
        {/* Actieve avond waarschuwing */}
        {actiefAvond && (
          <div className="mb-6 rounded-xl bg-orange-50 border border-orange-200 p-5">
            <p className="text-sm font-bold text-orange-700 mb-1">Er is al een actieve avond!</p>
            <p className="text-xs text-orange-600 mb-4">
              Avond van {new Date(actiefAvond.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
              {actiefAvond.locaties?.straat ? ` — ${actiefAvond.locaties.straat}` : ''}
            </p>
            <button
              onClick={() => navigate(`/spelavond/${actiefAvond.id}`)}
              className="w-full py-2 rounded-md text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}
            >
              Ga verder met deze avond
            </button>
          </div>
        )}

        {/* Datum Card */}
        <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)] mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-md flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600">calendar_today</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Datum</p>
              <p className="font-semibold text-on-surface text-sm">{formatDatum(datum)}</p>
            </div>
          </div>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full px-4 py-3 rounded-md border border-outline-variant bg-white/60 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>

        {/* Geselecteerde spelers chips */}
        {geselecteerdeSpelers.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Geselecteerd ({geselecteerdeSpelers.length}/6)
            </p>
            <div className="flex flex-wrap gap-2">
              {geselecteerdeSpelers.map((spelerId) => (
                <div
                  key={spelerId}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}
                >
                  <span>{getSpelerNaam(spelerId)}</span>
                  <button
                    onClick={() => handleSpelerToggle(spelerId)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locatie */}
        <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)] mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-md flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">location_on</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Locatie</p>
          </div>
          <select
            value={geselecteerdeLocatie}
            onChange={(e) => setGeselecteerdeLocatie(e.target.value)}
            className="w-full px-4 py-3 rounded-md border border-outline-variant bg-white/60 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm appearance-none cursor-pointer"
          >
            <option value="">Selecteer locatie...</option>
            {locaties.map(locatie => (
              <option key={locatie.id} value={locatie.id}>{locatie.straat}</option>
            ))}
          </select>
        </div>

        {/* Spelers lijst */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Spelers toevoegen
          </p>
          <div className="space-y-3">
            {spelers.map((speler) => {
              const selected = geselecteerdeSpelers.includes(speler.id);
              return (
                <div
                  key={speler.id}
                  onClick={() => handleSpelerToggle(speler.id)}
                  className={`glass-card rounded-xl p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(57,83,189,0.04)] cursor-pointer active:scale-[0.98] transition-all border-l-4 ${selected ? 'border-primary' : 'border-transparent'}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={selected
                        ? { background: 'linear-gradient(135deg, #3953bd, #72489e)' }
                        : { background: '#e0e9ef', color: '#444653' }
                      }
                    >
                      {getInitials(speler.naam)}
                    </div>
                    <p className="font-semibold text-on-surface">{speler.naam}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                    {selected && (
                      <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}>check</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Fixed Start button */}
      <div className="fixed bottom-0 left-0 w-full px-6 pb-8 pt-4 z-50" style={{ background: 'rgba(244,250,255,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-[428px] mx-auto">
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className={`w-full text-white py-4 rounded-md font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 ${canStart && !loading ? 'active:scale-[0.98] shadow-xl' : 'opacity-50 cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}
          >
            <span className="material-symbols-outlined">bolt</span>
            {loading ? 'Starten...' : 'Start Avond'}
          </button>
          {geselecteerdeSpelers.length < 4 && (
            <p className="text-center text-xs text-on-surface-variant mt-2">
              Minimaal {4 - geselecteerdeSpelers.length} speler{4 - geselecteerdeSpelers.length !== 1 ? 's' : ''} nog nodig
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default NieuweAvond;
