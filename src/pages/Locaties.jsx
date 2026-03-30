import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Locaties({ user, onLogout }) {
  const navigate = useNavigate();
  const [locaties, setLocaties] = useState([]);
  const [nieuweStraat, setNieuweStraat] = useState('');
  const [geselecteerd, setGeselecteerd] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editStraat, setEditStraat] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadLocaties();
  }, []);

  const loadLocaties = async () => {
    try {
      const { data, error } = await supabase
        .from('locaties')
        .select('*')
        .order('straat');

      if (error) throw error;
      setLocaties(data || []);
    } catch (err) {
      console.error('Fout bij laden locaties:', err);
    }
  };

  const handleToevoegen = async () => {
    if (!isAdmin) {
      alert('Alleen admins kunnen locaties toevoegen');
      return;
    }
    if (!nieuweStraat.trim()) return;

    try {
      const { error } = await supabase
        .from('locaties')
        .insert({ straat: nieuweStraat.trim() });

      if (error) {
        alert(error.message);
        return;
      }

      setNieuweStraat('');
      loadLocaties();
    } catch (err) {
      console.error('Fout bij toevoegen locatie:', err);
    }
  };

  const handleSelecteer = (id) => {
    const nieuweSelectie = new Set(geselecteerd);
    if (nieuweSelectie.has(id)) {
      nieuweSelectie.delete(id);
    } else {
      nieuweSelectie.add(id);
    }
    setGeselecteerd(nieuweSelectie);
  };

  const handleWis = async () => {
    if (!isAdmin) {
      alert('Alleen admins kunnen locaties verwijderen');
      return;
    }
    if (geselecteerd.size === 0) return;

    if (!window.confirm('Weet je zeker dat je de geselecteerde locaties wilt verwijderen?')) {
      return;
    }

    try {
      const ids = Array.from(geselecteerd);
      const { error } = await supabase
        .from('locaties')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setGeselecteerd(new Set());
      loadLocaties();
    } catch (err) {
      console.error('Fout bij verwijderen locaties:', err);
    }
  };

  const handleEdit = () => {
    if (geselecteerd.size !== 1) {
      alert('Selecteer exact 1 locatie om te bewerken');
      return;
    }
    const locatieId = Array.from(geselecteerd)[0];
    const locatie = locaties.find(l => l.id === locatieId);
    setEditStraat(locatie.straat);
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert('Alleen admins kunnen locaties wijzigen');
      return;
    }
    if (geselecteerd.size !== 1) return;
    if (!editStraat.trim()) return;

    const locatieId = Array.from(geselecteerd)[0];

    try {
      const { error } = await supabase
        .from('locaties')
        .update({ straat: editStraat.trim() })
        .eq('id', locatieId);

      if (error) {
        alert(error.message);
        return;
      }

      setEditMode(false);
      setEditStraat('');
      setGeselecteerd(new Set());
      loadLocaties();
    } catch (err) {
      console.error('Fout bij opslaan locatie:', err);
    }
  };

  return (
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Locaties
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
        {/* Toevoegen */}
        {isAdmin && (
          <div className="glass-card rounded-xl p-1 shadow-[0_12px_40px_rgba(57,83,189,0.06)] flex items-center gap-3 px-4 mb-8">
            <span className="material-symbols-outlined text-outline">location_on</span>
            <input
              className="bg-transparent border-none focus:ring-0 w-full py-3 text-on-surface placeholder:text-outline/60 focus:outline-none"
              placeholder="Voeg locatie toe..."
              type="text"
              value={nieuweStraat}
              onChange={(e) => setNieuweStraat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleToevoegen()}
            />
            <button
              onClick={handleToevoegen}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}
            >
              <span className="material-symbols-outlined text-base">add</span>
            </button>
          </div>
        )}

        {/* Edit mode input */}
        {editMode && geselecteerd.size === 1 && (
          <div className="glass-card rounded-xl p-4 shadow-[0_12px_40px_rgba(57,83,189,0.06)] mb-6">
            <input
              type="text"
              className="w-full px-4 py-3 rounded-md border border-outline-variant bg-white/60 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={editStraat}
              onChange={(e) => setEditStraat(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Locaties lijst */}
        <div className="space-y-3 mb-8">
          {locaties.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">location_off</span>
              <p className="text-on-surface-variant mt-4">Geen locaties toegevoegd</p>
            </div>
          ) : (
            locaties.map((locatie, index) => (
              <div
                key={locatie.id}
                onClick={() => handleSelecteer(locatie.id)}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 shadow-[0_8px_30px_rgba(57,83,189,0.04)] cursor-pointer active:scale-[0.98] transition-all border-l-4 ${
                  geselecteerd.has(locatie.id) ? 'border-primary' : 'border-transparent'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={geselecteerd.has(locatie.id)
                    ? { background: 'linear-gradient(135deg, #3953bd, #72489e)' }
                    : { background: '#e0e9ef', color: '#444653' }
                  }
                >
                  {index + 1}
                </div>
                <span className="font-semibold text-on-surface flex-1">{locatie.straat}</span>
                {geselecteerd.has(locatie.id) && (
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Actie knoppen */}
        {isAdmin && (
          <div className="flex gap-4">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">
                  <span className="material-symbols-outlined">close</span>
                  Annuleer
                </button>
                <button onClick={handleSave} className="btn-primary flex-1">
                  <span className="material-symbols-outlined">check</span>
                  Opslaan
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  disabled={geselecteerd.size !== 1}
                  className={`btn-secondary flex-1 ${geselecteerd.size !== 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="material-symbols-outlined">edit</span>
                  Bewerken
                </button>
                <button
                  onClick={handleWis}
                  disabled={geselecteerd.size === 0}
                  className={`flex-1 text-white font-bold py-4 rounded-md flex items-center justify-center gap-3 transition-all ${geselecteerd.size === 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                  style={{ background: '#ba1a1a' }}
                >
                  <span className="material-symbols-outlined">delete</span>
                  Verwijderen
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Locaties;
