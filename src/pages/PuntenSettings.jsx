import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';

function PuntenSettings({ user, onLogout }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState([]);
  const [editedSettings, setEditedSettings] = useState({});
  const [hasActiefAvond, setHasActiefAvond] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadSettings();
    checkActiefAvond();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/settings/spel');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Fout bij laden settings:', err);
    }
  };

  const checkActiefAvond = async () => {
    try {
      const res = await apiFetch('/api/spelavond/actief');
      const data = await res.json();
      setHasActiefAvond(!!data);
    } catch (err) {
      console.error('Fout bij checken actieve avond:', err);
    }
  };

  const handlePuntenChange = (puntenId, field, value) => {
    if (!isAdmin) {
      alert('Alleen admins kunnen punten instellingen wijzigen');
      return;
    }
    setEditedSettings({
      ...editedSettings,
      [puntenId]: { 
        ...editedSettings[puntenId], 
        [field]: parseInt(value) || 0
      }
    });
  };

  const getValue = (setting, field) => {
    return editedSettings[setting.punten_id]?.[field] ?? setting[field];
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert('Alleen admins kunnen punten instellingen opslaan');
      return;
    }
    if (hasActiefAvond) {
      alert('⚠️ Er is een actieve spelavond! Settings kunnen niet worden gewijzigd.');
      return;
    }

    setIsSaving(true);
    try {
      // Update alle gewijzigde punten settings
      for (const [puntenId, changes] of Object.entries(editedSettings)) {
        const setting = settings.find(s => s.punten_id === parseInt(puntenId));
        await apiFetch(`/api/settings/punten/${puntenId}`, {
          method: 'PUT',
          body: JSON.stringify({
            gemaakt: changes.gemaakt ?? setting.gemaakt,
            overslag: changes.overslag ?? setting.overslag,
            nat: changes.nat ?? setting.nat,
            onderslag: changes.onderslag ?? setting.onderslag
          })
        });
      }

      setEditedSettings({});
      loadSettings();
      alert('Punten instellingen opgeslagen');
    } catch (err) {
      console.error('Fout bij opslaan punten:', err);
      alert('Er is iets misgegaan bij het opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => Object.keys(editedSettings).length > 0;

  // Groepeer settings
  const metMaat = settings.filter(s => s.naam.includes('Rik') && !s.naam.includes('alleen'));
  const alleen = settings.filter(s => s.naam.includes('alleen'));
  const speciaal = settings.filter(s => !s.naam.includes('Rik') && !s.naam.includes('alleen'));

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen pb-24 page-container">
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-2xl font-bold">🎯 Punten Settings</h1>
      </div>

      {!isAdmin && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg text-blue-700 text-sm">
          ℹ️ Je bekijkt deze pagina in display modus. Alleen admins kunnen punten aanpassen.
        </div>
      )}

      {hasActiefAvond && isAdmin && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-700">
          ⚠️ Er is een actieve spelavond! Punten kunnen nu niet worden gewijzigd.
        </div>
      )}

      <div className="mt-3 space-y-6">
        {/* Warning banner als er een actieve avond is */}
        {hasActiefAvond && (
          <div className="card bg-gradient-to-r from-red-400 to-orange-400 text-white border-none">
            <p className="text-sm font-semibold text-center flex items-center justify-center gap-2">
              <span className="text-xl">🔒</span>
              Er is een actieve spelavond - Settings zijn read-only
            </p>
          </div>
        )}

        {/* Modern Info Banner */}
        <div className="card bg-gradient-soft border-2 border-rikken-accent/30">
          <p className="text-sm text-gray-600 text-center">
            ℹ️ {(hasActiefAvond || !isAdmin) ? 'Bekijk de puntenwaardes per spelvorm' : 'Pas de puntenwaardes aan per spelvorm'}
          </p>
        </div>

        {/* Met maat spelvormen */}
        <div className="card overflow-x-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🤝</span> Met Maat Spelvormen
          </h3>
          <div className="min-w-full">
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold text-gray-600 mb-3 px-2">
              <div>Naam</div>
              <div>Gemaakt</div>
              <div>Overslag</div>
              <div>Nat</div>
              <div>Onderslag</div>
            </div>
            <div className="space-y-2">
              {metMaat.map(spel => (
                <div key={spel.id} className="grid grid-cols-5 items-center gap-2 bg-gray-50 p-3 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                  {(hasActiefAvond || !isAdmin) ? (
                    <>
                      <span className="text-center font-bold text-green-600">{getValue(spel, 'gemaakt')}</span>
                      <span className="text-center font-bold text-blue-600">{getValue(spel, 'overslag')}</span>
                      <span className="text-center font-bold text-red-600">{getValue(spel, 'nat')}</span>
                      <span className="text-center font-bold text-orange-600">{getValue(spel, 'onderslag')}</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'gemaakt')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'gemaakt', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none font-bold text-green-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'overslag')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'overslag', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none font-bold text-blue-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'nat')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'nat', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-red-300 focus:border-red-500 focus:outline-none font-bold text-red-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'onderslag')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'onderslag', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none font-bold text-orange-600"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alleen spelvormen */}
        <div className="card overflow-x-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🎯</span> Alleen Spelvormen
          </h3>
          <div className="min-w-full">
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold text-gray-600 mb-3 px-2">
              <div>Naam</div>
              <div>Gemaakt</div>
              <div>Overslag</div>
              <div>Nat</div>
              <div>Onderslag</div>
            </div>
            <div className="space-y-2">
              {alleen.map(spel => (
                <div key={spel.id} className="grid grid-cols-5 items-center gap-2 bg-gray-50 p-3 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                  {(hasActiefAvond || !isAdmin) ? (
                    <>
                      <span className="text-center font-bold text-green-600">{getValue(spel, 'gemaakt')}</span>
                      <span className="text-center font-bold text-blue-600">{getValue(spel, 'overslag') || '-'}</span>
                      <span className="text-center font-bold text-red-600">{getValue(spel, 'nat') || '-'}</span>
                      <span className="text-center font-bold text-orange-600">{getValue(spel, 'onderslag') || '-'}</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'gemaakt')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'gemaakt', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none font-bold text-green-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'overslag')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'overslag', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none font-bold text-blue-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'nat')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'nat', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-red-300 focus:border-red-500 focus:outline-none font-bold text-red-600"
                      />
                      <input
                        type="number"
                        min="0"
                        value={getValue(spel, 'onderslag')}
                        onChange={(e) => handlePuntenChange(spel.punten_id, 'onderslag', e.target.value)}
                        className="w-full px-2 py-1 text-center rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none font-bold text-orange-600"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Speciale spelvormen */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>⭐</span> Speciale Spelvormen
          </h3>
          <div className="space-y-2">
            {speciaal.map(spel => (
              <div key={spel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                <div className="flex items-center gap-2">
                  {(hasActiefAvond || !isAdmin) ? (
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      {getValue(spel, 'gemaakt')} cent
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={getValue(spel, 'gemaakt')}
                      onChange={(e) => handlePuntenChange(spel.punten_id, 'gemaakt', e.target.value)}
                      className="w-16 px-2 py-1 text-sm text-center rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none font-bold text-purple-600"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && hasChanges() && !hasActiefAvond && (
        <div className="fixed bottom-6 right-6 flex gap-3">
          <button 
            onClick={() => setEditedSettings({})} 
            className="btn-secondary shadow-soft"
          >
            ✕ Annuleer
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary shadow-soft"
            disabled={isSaving}
          >
            {isSaving ? '⏳ Bezig...' : '✓ Opslaan'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PuntenSettings;

