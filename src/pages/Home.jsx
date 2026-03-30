import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function Home({ user }) {
  const navigate = useNavigate();
  const [actiefAvond, setActiefAvond] = useState(null);
  const [recenteAvonden, setRecenteAvonden] = useState([]);

  useEffect(() => {
    const checkActief = async () => {
      try {
        const { data } = await supabase
          .from('spelavonden')
          .select('*, locaties(straat)')
          .eq('status', 'actief')
          .limit(1)
          .single();
        if (data) setActiefAvond(data);
      } catch {
        // Geen actieve avond
      }
    };

    const loadRecent = async () => {
      try {
        const { data } = await supabase
          .from('spelavonden')
          .select('*, locaties(straat)')
          .eq('status', 'afgerond')
          .order('datum', { ascending: false })
          .limit(3);
        if (data) setRecenteAvonden(data);
      } catch {
        // Geen recente avonden
      }
    };

    checkActief();
    loadRecent();
  }, []);

  const formatDatum = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-700 opacity-0">arrow_back</span>
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Rikken Score
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/account')}>
            <span className="material-symbols-outlined text-indigo-700">account_circle</span>
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
        {/* Active Session Banner */}
        {actiefAvond && (
          <section className="mb-10">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 p-8 shadow-2xl shadow-orange-200/50">
              <div className="relative z-10">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-white/80 mb-2 block">
                  Lopend Spel
                </span>
                <h2 className="text-2xl font-bold text-white mb-6">
                  Actieve spelavond – {formatDatum(actiefAvond.datum)}
                </h2>
                <button
                  onClick={() => navigate(`/spelavond/${actiefAvond.id}`)}
                  className="bg-white text-orange-600 font-bold px-8 py-3 rounded-md shadow-lg active:scale-95 transition-transform"
                >
                  Ga verder
                </button>
              </div>
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/5 rounded-full blur-3xl"></div>
            </div>
          </section>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-5 mb-10">
          {/* Spelers */}
          <div
            onClick={() => navigate('/spelers')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-md flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-blue-600 text-3xl">group</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">Spelers</span>
          </div>

          {/* Locaties */}
          <div
            onClick={() => navigate('/locaties')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-green-100 rounded-md flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-green-600 text-3xl">location_on</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">Locaties</span>
          </div>

          {/* Spel Instellingen */}
          <div
            onClick={() => navigate('/spel-settings')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-md flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-purple-600 text-3xl">settings</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">Spel Instellingen</span>
          </div>

          {/* Punten Instellingen */}
          <div
            onClick={() => navigate('/punten-settings')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-md flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-orange-600 text-3xl">emoji_events</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">Punten Instellingen</span>
          </div>

          {/* Nieuwe Avond */}
          <div
            onClick={() => navigate('/nieuwe-avond')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all bg-gradient-to-br from-[#3953bd]/5 to-[#72489e]/5 cursor-pointer"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
              <span className="material-symbols-outlined text-white text-3xl">add_circle</span>
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
              Nieuwe Avond
            </span>
          </div>

          {/* Analytics */}
          <div
            onClick={() => navigate('/analytics')}
            className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-[0_12px_40px_rgba(57,83,189,0.06)] active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-teal-100 rounded-md flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-teal-600 text-3xl">bar_chart</span>
            </div>
            <span className="text-sm font-semibold text-on-surface">Analytics</span>
          </div>
        </div>

        {/* Recent Gespeeld */}
        {recenteAvonden.length > 0 && (
          <div className="mb-10">
            <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-slate-400 mb-6">
              Recent Gespeeld
            </h3>
            {recenteAvonden.map((avond) => (
              <div
                key={avond.id}
                onClick={() => navigate(`/spelavond/${avond.id}`)}
                className="glass-card rounded-xl p-6 flex items-center justify-between mb-4 shadow-[0_8px_30px_rgba(57,83,189,0.04)] cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">history</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{avond.locaties?.straat || 'Onbekende locatie'}</p>
                    <p className="text-xs text-on-surface-variant">{formatDatum(avond.datum)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BottomNavBar */}
      <nav className="bottom-nav">
        <div className="nav-item-active">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scoreboard</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/analytics')}>
          <span className="material-symbols-outlined mb-1">history</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/spel-settings')}>
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
        </div>
      </nav>
    </div>
  );
}

export default Home;
