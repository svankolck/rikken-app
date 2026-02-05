import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Spelers({ user, onLogout }) {
  const navigate = useNavigate();
  const [spelers, setSpelers] = useState([]);
  const [nieuweNaam, setNieuweNaam] = useState('');
  const [geselecteerd, setGeselecteerd] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editNaam, setEditNaam] = useState('');

  useEffect(() => {
    loadSpelers();
  }, []);

  const loadSpelers = async () => {
    try {
      const { data, error } = await supabase
        .from('spelers')
        .select(`
          *,
          profiles(id, approved)
        `)
        .order('naam');

      if (error) {
        console.warn('Kon profiles niet joinen, fallback naar simpele fetch:', error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('spelers')
          .select('*')
          .order('naam');

        if (simpleError) throw simpleError;
        setSpelers(simpleData || []);
      } else {
        setSpelers(data || []);
      }
    } catch (err) {
      console.error('Fout bij laden spelers:', err);
    }
  };

  const handleToevoegen = async () => {
    if (!nieuweNaam.trim()) return;

    try {
      const { error } = await supabase
        .from('spelers')
        .insert({ naam: nieuweNaam.trim() });

      if (error) {
        alert(error.message);
        return;
      }

      setNieuweNaam('');
      loadSpelers();
    } catch (err) {
      console.error('Fout bij toevoegen speler:', err);
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
    if (geselecteerd.size === 0) return;

    const bevestig = window.confirm(`Weet je zeker dat je ${geselecteerd.size} speler(s) wilt verwijderen?`);
    if (!bevestig) return;

    try {
      const ids = Array.from(geselecteerd);
      const { error } = await supabase
        .from('spelers')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setGeselecteerd(new Set());
      loadSpelers();
    } catch (err) {
      console.error('Fout bij verwijderen spelers:', err);
    }
  };

  const handleEdit = () => {
    if (geselecteerd.size !== 1) {
      alert('Selecteer exact 1 speler om te bewerken');
      return;
    }
    const spelerId = Array.from(geselecteerd)[0];
    const speler = spelers.find(s => s.id === spelerId);
    setEditNaam(speler.naam);
    setEditMode(true);
  };

  const handleSave = async () => {
    if (geselecteerd.size !== 1) return;

    const spelerId = Array.from(geselecteerd)[0];
    const speler = spelers.find(s => s.id === spelerId);

    // Protection: Cannot edit linked player
    if (speler.profiles && speler.profiles.length > 0) {
      alert('Gekoppelde spelers kunnen niet worden bewerkt.');
      return;
    }

    try {
      const { error } = await supabase
        .from('spelers')
        .update({ naam: editNaam.trim() })
        .eq('id', spelerId);

      if (error) {
        alert(error.message);
        return;
      }

      setEditMode(false);
      setGeselecteerd(new Set());
      loadSpelers();
    } catch (err) {
      console.error('Fout bij opslaan speler:', err);
    }
  };

  const isLidSelected = () => {
    return Array.from(geselecteerd).some(id => {
      const s = spelers.find(sp => sp.id === id);
      return s && s.profiles && s.profiles.length > 0;
    });
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
        <h1 className="text-2xl font-bold">👥 Spelers</h1>
      </div>

      {/* Toevoegen sectie met moderne styling */}
      <div className="mt-6 flex gap-3">
        <input
          type="text"
          className="input-field flex-1"
          placeholder="Voeg speler toe..."
          value={nieuweNaam}
          onChange={(e) => setNieuweNaam(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleToevoegen()}
        />
        <button onClick={handleToevoegen} className="btn-primary px-6 whitespace-nowrap">
          + Toevoegen
        </button>
      </div>

      {/* Moderne lijst met spelers */}
      <div className="mt-6 card min-h-[350px]">
        {editMode && geselecteerd.size === 1 ? (
          <div className="p-2">
            <input
              type="text"
              className="input-field"
              value={editNaam}
              onChange={(e) => setEditNaam(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Geregistreerde Leden Section */}
            {spelers.filter(s => s.profiles && s.profiles.length > 0).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rikken-blue rounded-full"></span>
                  Geregistreerde Leden
                </h3>
                <div className="space-y-2">
                  {spelers.filter(s => s.profiles && s.profiles.length > 0).map((speler) => (
                    <div
                      key={speler.id}
                      className={`flex items-center p-4 rounded-xl transition-all cursor-pointer
                        ${geselecteerd.has(speler.id)
                          ? 'bg-gradient-card text-white shadow-button'
                          : 'bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50'}`}
                      onClick={() => handleSelecteer(speler.id)}
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 mr-4 cursor-pointer accent-white"
                        checked={geselecteerd.has(speler.id)}
                        readOnly
                      />
                      <span className="text-lg font-medium flex-1">
                        {speler.naam}
                        <span className="ml-2 text-xl" title="Gekoppeld account">👤</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${geselecteerd.has(speler.id) ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                        }`}>
                        Lid
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gasten Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-2 mt-4">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                Gasten
              </h3>
              <div className="space-y-2">
                {spelers.filter(s => !s.profiles || s.profiles.length === 0).map((speler) => (
                  <div
                    key={speler.id}
                    className={`flex items-center p-4 rounded-xl transition-all cursor-pointer
                      ${geselecteerd.has(speler.id)
                        ? 'bg-gradient-card text-white shadow-button'
                        : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => handleSelecteer(speler.id)}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 mr-4 cursor-pointer accent-rikken-accent"
                      checked={geselecteerd.has(speler.id)}
                      readOnly
                    />
                    <span className="text-lg font-medium flex-1">{speler.naam}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${geselecteerd.has(speler.id) ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                      Gast
                    </span>
                  </div>
                ))}
                {spelers.filter(s => !s.profiles || s.profiles.length === 0).length === 0 && (
                  <p className="text-center py-4 text-gray-400 italic text-sm">Geen gasten</p>
                )}
              </div>
            </div>
          </div>
        )}
        {spelers.length === 0 && !editMode && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Geen spelers toegevoegd</p>
            <p className="text-gray-300 text-sm mt-2">Voeg je eerste speler toe! 👆</p>
          </div>
        )}
      </div>

      {/* Moderne actie knoppen */}
      <div className="mt-6 flex gap-3 justify-center">
        {editMode ? (
          <>
            <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">
              Annuleer
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              ✓ Opslaan
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className={`btn-primary flex-1 ${geselecteerd.size !== 1 || isLidSelected() ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={geselecteerd.size !== 1 || isLidSelected()}
              title={isLidSelected() ? "Gekoppelde spelers kunnen niet bewerkt worden" : ""}
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleWis}
              className={`btn-danger flex-1 ${geselecteerd.size === 0 || isLidSelected() ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={geselecteerd.size === 0 || isLidSelected()}
              title={isLidSelected() ? "Gekoppelde spelers kunnen niet verwijderd worden" : ""}
            >
              🗑️ Wis
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Spelers;
