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

  useEffect(() => {
    loadData();
  }, []);

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

    try {
      // Create spelavond
      const { data: spelavond, error: spelavondError } = await supabase
        .from('spelavonden')
        .insert({
          datum,
          locatie_id: parseInt(geselecteerdeLocatie),
          status: 'actief'
        })
        .select()
        .single();

      if (spelavondError) throw spelavondError;

      // Create avond_spelers entries
      const avondSpelers = geselecteerdeSpelers.map((spelerId, index) => ({
        spelavond_id: spelavond.id,
        speler_id: spelerId,
        volgorde: index + 1,
        actief: true
      }));

      const { error: spelerError } = await supabase
        .from('avond_spelers')
        .insert(avondSpelers);

      if (spelerError) throw spelerError;

      navigate(`/spelavond/${spelavond.id}`);
    } catch (err) {
      console.error('Fout bij starten avond:', err);
      alert(`Fout bij starten avond: ${err.message}`);
    }
  };

  const getSpelerNaam = (id) => {
    const speler = spelers.find(s => s.id === id);
    return speler ? speler.naam : '';
  };

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">🎲 Nieuwe Avond</h1>
      </div>

      {/* Modern Informatie box */}
      <div className="mt-3 card space-y-4">
        {/* Datum */}
        <div>
          <label className="font-semibold block mb-2 text-gray-700 flex items-center gap-2">
            <span>📅</span> Datum:
          </label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full max-w-full px-4 py-3 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rikken-accent/50 text-base shadow-sm border border-gray-100 transition-all duration-200"
            style={{ maxWidth: '100%' }}
          />
        </div>

        {/* Geselecteerde spelers */}
        <div>
          <label className="font-semibold block mb-2 text-gray-700 flex items-center gap-2">
            <span>👥</span> Spelers vanavond ({geselecteerdeSpelers.length}/6):
          </label>
          <div className="space-y-1.5">
            {geselecteerdeSpelers.length === 0 ? (
              <p className="text-gray-400 italic text-center py-2">Geen spelers geselecteerd</p>
            ) : (
              geselecteerdeSpelers.map((spelerId, index) => (
                <div key={spelerId} className="flex items-center gap-2 p-2 bg-purple-600 text-white rounded-xl shadow-sm">
                  <span className="font-bold text-base w-6">{index + 1}.</span>
                  <span className="flex-1 font-medium text-sm">{getSpelerNaam(spelerId)}</span>
                  <button
                    onClick={() => handleSpelerToggle(spelerId)}
                    className="text-white hover:scale-125 transition-transform text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            Minimaal 4, maximaal 6 spelers
          </p>
        </div>

        {/* Spelers selectie */}
        {geselecteerdeSpelers.length < 6 && (
          <div>
            <label className="font-semibold block mb-2 text-gray-700">
              ➕ Voeg speler toe:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {spelers
                .filter(s => !geselecteerdeSpelers.includes(s.id))
                .map(speler => (
                  <button
                    key={speler.id}
                    onClick={() => handleSpelerToggle(speler.id)}
                    className="py-2.5 px-3 bg-white hover:bg-purple-100 text-gray-800 rounded-xl border-2 border-gray-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    {speler.naam}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Locatie */}
        <div>
          <label className="font-semibold block mb-2 text-gray-700 flex items-center gap-2">
            <span>📍</span> Locatie:
          </label>
          <select
            value={geselecteerdeLocatie}
            onChange={(e) => setGeselecteerdeLocatie(e.target.value)}
            className="input-field appearance-none cursor-pointer"
          >
            <option value="">Selecteer locatie...</option>
            {locaties.map(locatie => (
              <option key={locatie.id} value={locatie.id}>
                {locatie.straat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modern Start knop */}
      <div className="mt-4 mb-6 flex justify-center">
        <button
          onClick={handleStart}
          className={`btn-primary text-lg px-12 py-3.5 ${geselecteerdeSpelers.length < 4 || !geselecteerdeLocatie
            ? 'opacity-50 cursor-not-allowed'
            : ''
            }`}
          disabled={geselecteerdeSpelers.length < 4 || !geselecteerdeLocatie}
        >
          🎮 Start Avond
        </button>
      </div>
    </div>
  );
}

export default NieuweAvond;
