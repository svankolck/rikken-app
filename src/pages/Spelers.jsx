import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';

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
      const data = await apiFetch('/api/spelers');
      setSpelers(data);
    } catch (err) {
      console.error('Fout bij laden spelers:', err);
    }
  };

  const handleToevoegen = async () => {
    if (!nieuweNaam.trim()) return;

    try {
      const res = await fetch('/api/spelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: nieuweNaam })
      });

      if (res.ok) {
        setNieuweNaam('');
        loadSpelers();
      } else {
        const error = await res.json();
        alert(error.error);
      }
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
      for (const id of geselecteerd) {
        await fetch(`/api/spelers/${id}`, { method: 'DELETE' });
      }
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
    try {
      const res = await fetch(`/api/spelers/${spelerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: editNaam })
      });

      if (res.ok) {
        setEditMode(false);
        setGeselecteerd(new Set());
        loadSpelers();
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (err) {
      console.error('Fout bij opslaan speler:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          <div className="space-y-2">
            {spelers.map((speler, index) => (
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
                  onChange={() => {}}
                />
                <span className="text-lg font-medium">{index + 1}. {speler.naam}</span>
              </div>
            ))}
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

export default Spelers;

