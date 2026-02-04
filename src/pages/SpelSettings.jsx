import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function SpelSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState([]);
  const [editedSettings, setEditedSettings] = useState({});
  const [hasActiefAvond, setHasActiefAvond] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkActiefAvond();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings/spel');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Fout bij laden settings:', err);
    }
  };

  const checkActiefAvond = async () => {
    try {
      const res = await fetch('/api/spelavond/actief');
      const data = await res.json();
      setHasActiefAvond(!!data);
    } catch (err) {
      console.error('Fout bij checken actieve avond:', err);
    }
  };

  const handleMinSlagenChange = (id, value) => {
    setEditedSettings({
      ...editedSettings,
      [id]: { ...editedSettings[id], minimaal_slagen: parseInt(value) }
    });
  };

  const handleSave = async () => {
    if (hasActiefAvond) {
      alert('⚠️ Er is een actieve spelavond! Settings kunnen niet worden gewijzigd.');
      return;
    }

    setIsSaving(true);
    try {
      // Update alle gewijzigde settings
      for (const [id, changes] of Object.entries(editedSettings)) {
        const setting = settings.find(s => s.id === parseInt(id));
        await fetch(`/api/settings/spel/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            naam: setting.naam,
            met_maat: setting.met_maat,
            minimaal_slagen: changes.minimaal_slagen
          })
        });
      }
      
      alert('✅ Instellingen succesvol opgeslagen!');
      setEditedSettings({});
      await loadSettings();
      navigate('/');
    } catch (err) {
      console.error('Fout bij opslaan:', err);
      alert('❌ Fout bij opslaan van instellingen');
    } finally {
      setIsSaving(false);
    }
  };

  const getMinSlagen = (setting) => {
    return editedSettings[setting.id]?.minimaal_slagen ?? setting.minimaal_slagen;
  };

  const hasChanges = () => {
    return Object.keys(editedSettings).length > 0;
  };

  // Groepeer settings
  const metMaat = settings.filter(s => s.naam.includes('Rik') && !s.naam.includes('alleen'));
  const alleen = settings.filter(s => s.naam.includes('alleen'));
  const speciaal = settings.filter(s => !s.naam.includes('Rik') && !s.naam.includes('alleen'));

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen pb-24 page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-2xl font-bold">⚙️ Spel Settings</h1>
      </div>

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
            ℹ️ {hasActiefAvond ? 'Bekijk de spelvormen en hun instellingen' : 'Pas het minimaal aantal slagen aan per spelvorm'}
          </p>
        </div>

        {/* Met maat spelvormen */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🤝</span> Met Maat Spelvormen
          </h3>
          <div className="space-y-2">
            {metMaat.map(spel => (
              <div key={spel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Min. slagen:</span>
                  {hasActiefAvond ? (
                    <span className="bg-white px-3 py-1 rounded-lg font-bold text-sm text-rikken-blue border-2 border-gray-200">
                      {getMinSlagen(spel)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="13"
                      value={getMinSlagen(spel)}
                      onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)}
                      className="w-14 px-2 py-1 text-sm rounded-lg font-bold text-rikken-blue border-2 border-rikken-accent/50 focus:border-rikken-accent focus:outline-none text-center"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alleen spelvormen */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🎯</span> Alleen Spelvormen
          </h3>
          <div className="space-y-2">
            {alleen.map(spel => (
              <div key={spel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Min. slagen:</span>
                  {hasActiefAvond ? (
                    <span className="bg-gradient-main text-white px-3 py-1 rounded-lg font-bold text-sm">
                      {getMinSlagen(spel)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="13"
                      value={getMinSlagen(spel)}
                      onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)}
                      className="w-14 px-2 py-1 text-sm rounded-lg font-bold text-white bg-gradient-main border-2 border-rikken-accent/50 focus:border-rikken-accent focus:outline-none text-center"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Speciale spelvormen - Read only */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>⭐</span> Speciale Spelvormen
          </h3>
          <p className="text-xs text-gray-500 mb-3">Deze spelvormen hebben een vast aantal slagen</p>
          <div className="space-y-2">
            {speciaal.map((spel) => {
              const minSlagen = getMinSlagen(spel);
              const displayValue = minSlagen !== null && minSlagen !== undefined ? minSlagen : 0;
              return (
                <div key={spel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-3 py-1 rounded-lg font-bold text-sm">
                    {displayValue} {displayValue === 1 ? 'slag' : 'slagen'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern Save knop - alleen zichtbaar als er wijzigingen zijn */}
      {hasChanges() && !hasActiefAvond && (
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

export default SpelSettings;

