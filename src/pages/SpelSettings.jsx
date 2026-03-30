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
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Spel Instellingen
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
      <div className="space-y-6">
        {/* Warning banner als er een actieve avond is */}
        {hasActiefAvond && (
          <div className="rounded-xl p-4 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(135deg, #ba1a1a, #ef4444)' }}>
            <span className="material-symbols-outlined flex-shrink-0">lock</span>
            <p className="text-sm font-semibold">Er is een actieve spelavond — instellingen zijn read-only</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-[0_8px_30px_rgba(57,83,189,0.04)]">
          <span className="material-symbols-outlined text-primary flex-shrink-0">info</span>
          <p className="text-sm text-on-surface-variant">
            {hasActiefAvond ? 'Bekijk de spelvormen en hun instellingen' : 'Pas het minimaal aantal slagen aan per spelvorm'}
          </p>
        </div>

        {/* Legenda */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-[0_8px_30px_rgba(57,83,189,0.04)] border border-error/20">
          <div className="w-3 h-3 rounded-full bg-error flex-shrink-0"></div>
          <p className="text-sm text-on-surface"><strong>Verdubbelaar terug:</strong> Als dit spel gewonnen wordt, krijgt de speler een verdubbelaar terug.</p>
        </div>

        {/* Met maat spelvormen */}
        <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">handshake</span>
            Met Maat Spelvormen
          </h3>
          <div className="space-y-2">
            {metMaat.map(spel => (
              <div key={spel.id} className="flex items-center justify-between p-3 bg-surface-container rounded-md">
                <span className="text-sm font-semibold text-on-surface">{spel.naam}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer" title="Geeft verdubbelaar terug bij winst">
                    <input
                      type="checkbox"
                      checked={getVerdubbelaar(spel)}
                      onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)}
                      disabled={hasActiefAvond}
                      className="w-4 h-4 accent-red-500 rounded"
                    />
                    <div className="w-2 h-2 rounded-full bg-error"></div>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-on-surface-variant">Min:</span>
                    {hasActiefAvond ? (
                      <span className="bg-white px-2 py-1 rounded-md font-bold text-xs text-primary border border-outline-variant">
                        {getMinSlagen(spel)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="13"
                        value={getMinSlagen(spel)}
                        onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)}
                        className="w-12 px-2 py-1 text-xs rounded-md font-bold text-primary border border-outline-variant focus:border-primary focus:outline-none text-center bg-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alleen spelvormen */}
        <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-purple-600">person</span>
            Alleen Spelvormen
          </h3>
          <div className="space-y-2">
            {alleen.map(spel => (
              <div key={spel.id} className="flex items-center justify-between p-3 bg-surface-container rounded-md">
                <span className="text-sm font-semibold text-on-surface">{spel.naam}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={getVerdubbelaar(spel)} onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)} disabled={hasActiefAvond} className="w-4 h-4 accent-red-500 rounded"/>
                      <div className="w-2 h-2 rounded-full bg-error"></div>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-on-surface-variant">Min:</span>
                      {hasActiefAvond ? (
                        <span className="bg-white px-2 py-1 rounded-md font-bold text-xs text-primary border border-outline-variant">{getMinSlagen(spel)}</span>
                      ) : (
                        <input type="number" min="1" max="13" value={getMinSlagen(spel)} onChange={(e) => handleMinSlagenChange(spel.id, e.target.value)} className="w-12 px-2 py-1 text-xs rounded-md font-bold text-primary border border-outline-variant focus:border-primary focus:outline-none text-center bg-white"/>
                      )}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Speciale spelvormen */}
        <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-orange-500">star</span>
            Speciale Spelvormen
          </h3>
          <p className="text-xs text-on-surface-variant/60 mb-4">Vaste slagen</p>
          <div className="space-y-2">
            {speciaal.map((spel) => {
              const minSlagen = getMinSlagen(spel);
              const displayValue = minSlagen !== null && minSlagen !== undefined ? minSlagen : 0;
              return (
                <div key={spel.id} className="flex items-center justify-between p-3 bg-surface-container rounded-md">
                  <span className="text-sm font-semibold text-on-surface">{spel.naam}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={getVerdubbelaar(spel)} onChange={(e) => handleVerdubbelaarChange(spel.id, e.target.checked)} disabled={hasActiefAvond} className="w-4 h-4 accent-red-500 rounded"/>
                      <div className="w-2 h-2 rounded-full bg-error"></div>
                    </label>
                    <span className="text-white px-2 py-1 rounded-md font-bold text-xs" style={{ background: 'linear-gradient(135deg, #72489e, #3953bd)' }}>
                      {displayValue} {displayValue === 1 ? 'slag' : 'slagen'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </main>

      {/* Save knop */}
      {hasChanges() && !hasActiefAvond && (
        <div className="fixed bottom-6 left-0 right-0 px-6 max-w-[428px] mx-auto flex gap-3 z-50">
          <button onClick={() => setEditedSettings({})} className="btn-secondary flex-1">
            <span className="material-symbols-outlined">close</span>
            Annuleer
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1">
            <span className="material-symbols-outlined">check</span>
            {isSaving ? 'Bezig...' : 'Opslaan'}
          </button>
        </div>
      )}
    </div>
  );
}

export default SpelSettings;
