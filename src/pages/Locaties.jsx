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
    <div className="max-w-md mx-auto p-4 min-h-screen page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">📍 Locaties</h1>
      </div>

      {/* Toevoegen sectie met moderne styling */}
      <div className="mt-6 flex gap-3">
        <input
          type="text"
          className="input-field flex-1"
          placeholder="Voeg locatie toe..."
          value={nieuweStraat}
          onChange={(e) => setNieuweStraat(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleToevoegen()}
        />
        <button onClick={handleToevoegen} className="btn-primary px-6 whitespace-nowrap">
          + Toevoegen
        </button>
      </div>

      {/* Moderne lijst met locaties */}
      <div className="mt-6 card min-h-[350px]">
        {editMode && geselecteerd.size === 1 ? (
          <div className="p-2">
            <input
              type="text"
              className="input-field"
              value={editStraat}
              onChange={(e) => setEditStraat(e.target.value)}
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-2">
            {locaties.map((locatie, index) => (
              <div
                key={locatie.id}
                className={`flex items-center p-4 rounded-xl transition-all cursor-pointer
                  ${geselecteerd.has(locatie.id)
                    ? 'bg-gradient-card text-white shadow-button'
                    : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => handleSelecteer(locatie.id)}
              >
                <input
                  type="checkbox"
                  className="w-5 h-5 mr-4 cursor-pointer accent-rikken-accent"
                  checked={geselecteerd.has(locatie.id)}
                  onChange={() => { }}
                />
                <span className="text-lg font-medium">{index + 1}. {locatie.straat}</span>
              </div>
            ))}
          </div>
        )}
        {locaties.length === 0 && !editMode && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Geen locaties toegevoegd</p>
            <p className="text-gray-300 text-sm mt-2">Voeg je eerste locatie toe! 👆</p>
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
              className={`btn-primary flex-1 ${geselecteerd.size !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={geselecteerd.size !== 1}
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleWis}
              className={`btn-danger flex-1 ${geselecteerd.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={geselecteerd.size === 0}
            >
              🗑️ Wis
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Locaties;
