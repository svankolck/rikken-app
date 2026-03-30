import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function PuntenSettings({ user, onLogout }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState([]);
  const [editedSettings, setEditedSettings] = useState({});
  const [hasActiefAvond, setHasActiefAvond] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Always allow editing for now (can add role check later)
  const canEdit = !hasActiefAvond;

  useEffect(() => {
    loadSettings();
    checkActiefAvond();
  }, []);

  const loadSettings = async () => {
    try {
      // Load spel_settings with their punten_settings
      const { data: spelData, error: spelError } = await supabase
        .from('spel_settings')
        .select('*, punten_settings(*)')
        .order('naam');

      if (spelError) throw spelError;

      // Flatten the data for display
      const flatData = (spelData || []).map(spel => ({
        id: spel.id,
        naam: spel.naam,
        met_maat: spel.met_maat,
        minimaal_slagen: spel.minimaal_slagen,
        punten_id: spel.punten_settings?.[0]?.id || null,
        gemaakt: spel.punten_settings?.[0]?.gemaakt || 0,
        overslag: spel.punten_settings?.[0]?.overslag || 0,
        nat: spel.punten_settings?.[0]?.nat || 0,
        onderslag: spel.punten_settings?.[0]?.onderslag || 0
      }));

      setSettings(flatData);
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

  const handlePuntenChange = (spelId, field, value) => {
    setEditedSettings({
      ...editedSettings,
      [spelId]: {
        ...editedSettings[spelId],
        [field]: parseInt(value) || 0
      }
    });
  };

  const getValue = (setting, field) => {
    return editedSettings[setting.id]?.[field] ?? setting[field];
  };

  const handleSave = async () => {
    if (hasActiefAvond) {
      alert('⚠️ Er is een actieve spelavond! Settings kunnen niet worden gewijzigd.');
      return;
    }

    setIsSaving(true);
    try {
      // Update punten settings for each changed spel
      for (const [spelId, changes] of Object.entries(editedSettings)) {
        const setting = settings.find(s => s.id === parseInt(spelId));

        if (setting.punten_id) {
          // Update existing punten_settings
          const { error } = await supabase
            .from('punten_settings')
            .update({
              gemaakt: changes.gemaakt ?? setting.gemaakt,
              overslag: changes.overslag ?? setting.overslag,
              nat: changes.nat ?? setting.nat,
              onderslag: changes.onderslag ?? setting.onderslag
            })
            .eq('id', setting.punten_id);

          if (error) throw error;
        } else {
          // Create new punten_settings
          const { error } = await supabase
            .from('punten_settings')
            .insert({
              spel_setting_id: parseInt(spelId),
              gemaakt: changes.gemaakt ?? 0,
              overslag: changes.overslag ?? 0,
              nat: changes.nat ?? 0,
              onderslag: changes.onderslag ?? 0
            });

          if (error) throw error;
        }
      }

      setEditedSettings({});
      loadSettings();
      alert('✅ Punten instellingen opgeslagen!');
    } catch (err) {
      console.error('Fout bij opslaan punten:', err);
      alert('Er is iets misgegaan bij het opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => Object.keys(editedSettings).length > 0;

  // Groepeer settings
  const metMaat = settings.filter(s => s.naam?.includes('Rik') && !s.naam?.includes('alleen'));
  const alleen = settings.filter(s => s.naam?.includes('alleen'));
  const speciaal = settings.filter(s => !s.naam?.includes('Rik') && !s.naam?.includes('alleen'));

  const renderInputRow = (spel) => (
    <div key={spel.id} className="grid grid-cols-5 items-center gap-1 bg-surface-container p-2 rounded-md">
      <span className="text-xs font-semibold text-on-surface truncate">{spel.naam}</span>
      {canEdit ? (
        <>
          <input
            type="number"
            value={getValue(spel, 'gemaakt')}
            onChange={(e) => handlePuntenChange(spel.id, 'gemaakt', e.target.value)}
            className="w-full px-2 py-1 text-center rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none font-bold text-green-600"
          />
          <input
            type="number"
            value={getValue(spel, 'overslag')}
            onChange={(e) => handlePuntenChange(spel.id, 'overslag', e.target.value)}
            className="w-full px-2 py-1 text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none font-bold text-blue-600"
          />
          <input
            type="number"
            value={getValue(spel, 'nat')}
            onChange={(e) => handlePuntenChange(spel.id, 'nat', e.target.value)}
            className="w-full px-2 py-1 text-center rounded-lg border-2 border-red-300 focus:border-red-500 focus:outline-none font-bold text-red-600"
          />
          <input
            type="number"
            value={getValue(spel, 'onderslag')}
            onChange={(e) => handlePuntenChange(spel.id, 'onderslag', e.target.value)}
            className="w-full px-2 py-1 text-center rounded-lg border-2 border-orange-300 focus:border-orange-500 focus:outline-none font-bold text-orange-600"
          />
        </>
      ) : (
        <>
          <span className="text-center font-bold text-green-600">{getValue(spel, 'gemaakt')}</span>
          <span className="text-center font-bold text-blue-600">{getValue(spel, 'overslag')}</span>
          <span className="text-center font-bold text-red-600">{getValue(spel, 'nat')}</span>
          <span className="text-center font-bold text-orange-600">{getValue(spel, 'onderslag')}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Punten Instellingen
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
        {hasActiefAvond && (
          <div className="rounded-xl p-4 flex items-center gap-3 text-white mb-6" style={{ background: 'linear-gradient(135deg, #ba1a1a, #ef4444)' }}>
            <span className="material-symbols-outlined flex-shrink-0">lock</span>
            <p className="text-sm font-semibold">Er is een actieve spelavond — punten zijn read-only</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-[0_8px_30px_rgba(57,83,189,0.04)]">
            <span className="material-symbols-outlined text-primary flex-shrink-0">info</span>
            <p className="text-sm text-on-surface-variant">
              {hasActiefAvond ? 'Bekijk de puntenwaardes per spelvorm' : 'Pas de puntenwaardes aan per spelvorm'}
            </p>
          </div>

          {/* Kolom header */}
          <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-2">
            <div className="text-left">Naam</div>
            <div className="text-green-600">Gem.</div>
            <div className="text-blue-600">Over.</div>
            <div className="text-error">Nat</div>
            <div className="text-orange-500">Onder.</div>
          </div>

          {/* Met maat spelvormen */}
          <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">handshake</span>
              Met Maat
            </h3>
            <div className="space-y-2">
              {metMaat.map(spel => renderInputRow(spel))}
            </div>
          </div>

          {/* Alleen spelvormen */}
          <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-purple-600">person</span>
              Alleen
            </h3>
            <div className="space-y-2">
              {alleen.map(spel => renderInputRow(spel))}
            </div>
          </div>

          {/* Speciale spelvormen */}
          <div className="glass-card rounded-xl p-6 shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-orange-500">star</span>
              Speciaal
            </h3>
            <div className="space-y-2">
              {speciaal.map(spel => renderInputRow(spel))}
            </div>
          </div>
        </div>
      </main>

      {hasChanges() && canEdit && (
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

export default PuntenSettings;
