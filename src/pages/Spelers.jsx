import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Spelers() {
  const navigate = useNavigate();
  const [spelers, setSpelers] = useState([]);
  const [zoekterm, setZoekterm] = useState('');
  const [showToevoegen, setShowToevoegen] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState('');
  const [editSpeler, setEditSpeler] = useState(null);
  const [editNaam, setEditNaam] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSpelers();
  }, []);

  const loadSpelers = async () => {
    try {
      const { data, error } = await supabase
        .from('spelers')
        .select('*, profiles(id, approved)')
        .order('naam');

      if (error) {
        const { data: simpleData } = await supabase.from('spelers').select('*').order('naam');
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
    setLoading(true);
    try {
      const { error } = await supabase.from('spelers').insert({ naam: nieuweNaam.trim() });
      if (error) { alert(error.message); return; }
      setNieuweNaam('');
      setShowToevoegen(false);
      loadSpelers();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerwijderen = async (speler) => {
    if (!window.confirm(`Weet je zeker dat je "${speler.naam}" wilt verwijderen?`)) return;
    try {
      const { error } = await supabase.from('spelers').delete().eq('id', speler.id);
      if (error) throw error;
      loadSpelers();
    } catch (err) {
      alert('Fout bij verwijderen: ' + err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editSpeler || !editNaam.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('spelers').update({ naam: editNaam.trim() }).eq('id', editSpeler.id);
      if (error) throw error;
      setEditSpeler(null);
      setEditNaam('');
      loadSpelers();
    } catch (err) {
      alert('Fout bij opslaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (naam) => naam.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isLid = (speler) => speler.profiles && speler.profiles.length > 0;

  const gefilterd = spelers.filter(s =>
    s.naam.toLowerCase().includes(zoekterm.toLowerCase())
  );
  const leden = gefilterd.filter(s => isLid(s));
  const gasten = gefilterd.filter(s => !isLid(s));

  return (
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Rikken Score
        </h1>
        <button className="text-indigo-700">
          <span className="material-symbols-outlined">check_circle</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-[428px] mx-auto">
        {/* Search Bar */}
        <div className="mb-10">
          <div className="glass-card rounded-xl p-1 shadow-[0_12px_40px_rgba(57,83,189,0.06)] flex items-center gap-3 px-4">
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 w-full py-3 text-on-surface placeholder:text-outline/60 focus:outline-none"
              placeholder="Zoek spelers..."
              type="text"
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
            />
          </div>
        </div>

        {/* Leden Section */}
        {leden.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="font-semibold tracking-tight text-on-surface-variant">Leden</h2>
              <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">
                {leden.length} Totaal
              </span>
            </div>
            <div className="space-y-4">
              {leden.map((speler) => (
                <SpelerItem
                  key={speler.id}
                  speler={speler}
                  label="Premium Lid"
                  labelColor="text-primary"
                  getInitials={getInitials}
                  onEdit={() => { setEditSpeler(speler); setEditNaam(speler.naam); }}
                  onDelete={() => handleVerwijderen(speler)}
                  isProtected={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Gasten Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="font-semibold tracking-tight text-on-surface-variant">Gasten</h2>
            {gasten.length > 0 && (
              <span className="text-xs font-bold text-on-surface-variant px-3 py-1 bg-surface-container rounded-full">
                {gasten.length}
              </span>
            )}
          </div>
          {gasten.length === 0 && (
            <p className="text-center text-on-surface-variant/60 text-sm italic py-6">Geen gasten gevonden</p>
          )}
          <div className="space-y-4">
            {gasten.map((speler) => (
              <SpelerItem
                key={speler.id}
                speler={speler}
                label="Tijdelijk"
                labelColor="text-on-surface-variant"
                getInitials={getInitials}
                onEdit={() => { setEditSpeler(speler); setEditNaam(speler.naam); }}
                onDelete={() => handleVerwijderen(speler)}
                isProtected={false}
              />
            ))}
          </div>
        </section>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowToevoegen(true)}
        className="fixed bottom-28 right-6 w-16 h-16 rounded-xl text-white shadow-[0_20px_40px_rgba(57,83,189,0.3)] flex items-center justify-center active:scale-90 transition-all duration-200 z-50"
        style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* BottomNavBar */}
      <nav className="bottom-nav">
        <div className="nav-item cursor-pointer" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined mb-1">leaderboard</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scoreboard</span>
        </div>
        <div className="nav-item-active">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/analytics')}>
          <span className="material-symbols-outlined mb-1">history</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </div>
      </nav>

      {/* Modal: Toevoegen */}
      {showToevoegen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card-strong w-full max-w-[428px] rounded-t-2xl p-8">
            <h3 className="font-bold text-xl text-on-surface mb-6">Speler toevoegen</h3>
            <input
              autoFocus
              type="text"
              className="w-full px-4 py-3 rounded-md border border-outline-variant bg-white/60 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 mb-6"
              placeholder="Naam van speler..."
              value={nieuweNaam}
              onChange={(e) => setNieuweNaam(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleToevoegen()}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowToevoegen(false)} className="btn-secondary flex-1">
                Annuleer
              </button>
              <button onClick={handleToevoegen} disabled={loading || !nieuweNaam.trim()} className="btn-primary flex-1">
                {loading ? 'Toevoegen...' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit */}
      {editSpeler && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card-strong w-full max-w-[428px] rounded-t-2xl p-8">
            <h3 className="font-bold text-xl text-on-surface mb-6">Naam bewerken</h3>
            <input
              autoFocus
              type="text"
              className="w-full px-4 py-3 rounded-md border border-outline-variant bg-white/60 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 mb-6"
              value={editNaam}
              onChange={(e) => setEditNaam(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="flex gap-4">
              <button onClick={() => setEditSpeler(null)} className="btn-secondary flex-1">
                Annuleer
              </button>
              <button onClick={handleSaveEdit} disabled={loading || !editNaam.trim()} className="btn-primary flex-1">
                {loading ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpelerItem({ speler, label, labelColor, getInitials, onEdit, onDelete, isProtected }) {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between shadow-[0_12px_40px_rgba(57,83,189,0.06)] border border-white/20 active:scale-[0.98] transition-all duration-200">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
          style={isProtected
            ? { background: 'linear-gradient(135deg, #3953bd, #72489e)' }
            : { background: '#e0e9ef', color: '#444653' }
          }
        >
          {getInitials(speler.naam)}
        </div>
        <div>
          <p className="font-semibold text-on-surface">{speler.naam}</p>
          <p className={`text-xs font-medium uppercase tracking-wider ${labelColor} ${!isProtected ? 'italic' : ''}`}>
            {label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isProtected && (
          <button
            onClick={onEdit}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
        )}
        {!isProtected && (
          <button
            onClick={onDelete}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-error-container/20 transition-colors text-error"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default Spelers;
