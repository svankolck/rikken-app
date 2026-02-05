import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
      const { data, error } = await supabase
        .from('spel_settings')
        .select('*')
        .order('naam');

      if (error) throw error;
      setSettings(data || []);
    } catch (err) {
      console.error('Fout bij laden settings:', err);
    }
  };

  const checkActiefAvond = async () => {
    try {
      const { data } = await supabase
        .from('spelavonden')
        .select('id')
        .eq('status', 'actief')
        .limit(1);

      setHasActiefAvond(data && data.length > 0);
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

  const handleVerdubbelaarChange = (id, checked) => {
    setEditedSettings({
      ...editedSettings,
      [id]: { ...editedSettings[id], geeft_verdubbelaar_terug: checked }
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
        const updateData = {};
        if (changes.minimaal_slagen !== undefined) {
          updateData.minimaal_slagen = changes.minimaal_slagen;
        }
        if (changes.geeft_verdubbelaar_terug !== undefined) {
          updateData.geeft_verdubbelaar_terug = changes.geeft_verdubbelaar_terug;
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('spel_settings')
            .update(updateData)
            .eq('id', parseInt(id));

          if (error) throw error;
        }
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

  const getVerdubbelaar = (setting) => {
    return editedSettings[setting.id]?.geeft_verdubbelaar_terug ?? setting.geeft_verdubbelaar_terug ?? false;
  };

  const hasChanges = () => {
    return Object.keys(editedSettings).length > 0;
  };

  // Groepeer settings
  const metMaat = settings.filter(s => s.naam?.includes('Rik') && !s.naam?.includes('alleen'));
  const alleen = settings.filter(s => s.naam?.includes('alleen'));
  const speciaal = settings.filter(s => !s.naam?.includes('Rik') && !s.naam?.includes('alleen'));

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen pb-24 page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Legenda voor rode checkbox */}
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-gray-700 flex items-center gap-2">
            <span className="text-red-500 text-lg">🔴</span>
            <span><strong>Verdubbelaar terug:</strong> Als dit spel gewonnen wordt, krijgt de speler een verdubbelaar terug.</span>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer" title="Geeft verdubbelaar terug bij winst">
                    <input
                      type="checkbox"
                      checked={getVerdubbelaar(spel)}
                      onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)}
                      disabled={hasActiefAvond}
                      className="w-4 h-4 text-red-500 rounded focus:ring-red-400 accent-red-500"
                    />
                    <span className="text-xs text-red-500">🔴</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">Min:</span>
                    {hasActiefAvond ? (
                      <span className="bg-white px-2 py-1 rounded-lg font-bold text-xs text-rikken-blue border border-gray-200">
                        {getMinSlagen(spel)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="13"
                        value={getMinSlagen(spel)}
                        onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)}
                        className="w-12 px-2 py-1 text-xs rounded-lg font-bold text-rikken-blue border border-rikken-accent/50 focus:border-rikken-accent focus:outline-none text-center"
                      />
                    )}
                  </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{spel.naam}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer" title="Geeft verdubbelaar terug bij winst">
                    <input
                      type="checkbox"
                      checked={getVerdubbelaar(spel)}
                      onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)}
                      disabled={hasActiefAvond}
                      className="w-4 h-4 text-red-500 rounded focus:ring-red-400 accent-red-500"
                    />
                    <span className="text-xs text-red-500">🔴</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">Min:</span>
                    {hasActiefAvond ? (
                      <span className="bg-gradient-main text-white px-2 py-1 rounded-lg font-bold text-xs">
                        {getMinSlagen(spel)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="13"
                        value={getMinSlagen(spel)}
                        onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)}
                        className="w-12 px-2 py-1 text-xs rounded-lg font-bold text-white bg-gradient-main border border-rikken-accent/50 focus:border-rikken-accent focus:outline-none text-center"
                      />
                    )}
                  </div>
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
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer" title="Geeft verdubbelaar terug bij winst">
                      <input
                        type="checkbox"
                        checked={getVerdubbelaar(spel)}
                        onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)}
                        disabled={hasActiefAvond}
                        className="w-4 h-4 text-red-500 rounded focus:ring-red-400 accent-red-500"
                      />
                      <span className="text-xs text-red-500">🔴</span>
                    </label>
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-2 py-1 rounded-lg font-bold text-xs">
                      {displayValue} {displayValue === 1 ? 'slag' : 'slagen'}
                    </span>
                  </div>
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
