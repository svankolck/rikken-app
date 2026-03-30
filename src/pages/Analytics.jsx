import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';

function Analytics({ user }) {
  const navigate = useNavigate();
  const [avonden, setAvonden] = useState([]);
  const [spelerStats, setSpelerStats] = useState([]);
  const [jaarOverzicht, setJaarOverzicht] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('avonden');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [avondenData, statsData, jaarData] = await Promise.all([
        apiFetch('/api/analytics/avonden'),
        apiFetch('/api/analytics/speler-stats'),
        apiFetch('/api/analytics/jaar-overzicht')
      ]);

      setAvonden(avondenData);
      setSpelerStats(statsData);
      setJaarOverzicht(jaarData);

      const topSpeler = statsData.length > 0 ? statsData[0] : null;
      setDashboard({
        totaalAvonden: avondenData.length,
        gemiddeldeScore: statsData.length > 0
          ? Math.round(statsData.reduce((sum, s) => sum + (s.gemiddelde_punten || 0), 0) / statsData.length)
          : 0,
        topSpeler: topSpeler
          ? { naam: topSpeler.naam, avonden: topSpeler.aantal_avonden || 0 }
          : { naam: 'Geen', avonden: 0 },
      });
    } catch (err) {
      console.error('Fout bij laden analytics:', err);
    }
  };

  const handleDeleteAvond = async (avondId) => {
    if (!user || user.role !== 'admin') {
      alert('Alleen admins kunnen avonden verwijderen');
      return;
    }
    setIsDeleting(true);
    try {
      await apiFetch(`/api/spelavond/delete/${avondId}`, { method: 'DELETE' });
      loadData();
      setShowDeleteConfirm(null);
    } catch (err) {
      alert(`Fout bij verwijderen: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDatum = (datum) => new Date(datum).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const tabs = [
    { id: 'avonden', icon: 'calendar_month', label: 'Avonden' },
    { id: 'spelers', icon: 'group', label: 'Spelers' },
    { id: 'jaar', icon: 'bar_chart', label: 'Jaar' },
  ];

  return (
    <div className="min-h-screen pb-32 text-on-surface">
      {/* TopAppBar */}
      <header className="top-nav">
        <button onClick={() => navigate('/')} className="text-indigo-700 active:scale-95 transition-transform">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3953bd] to-[#72489e] bg-clip-text text-transparent">
          Analytics
        </h1>
        <div className="w-6"></div>
      </header>

      <main className="pt-24 px-6 max-w-[428px] mx-auto">
        {/* Stats Summary */}
        {dashboard && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="glass-card rounded-xl p-4 text-center shadow-[0_8px_30px_rgba(57,83,189,0.04)]">
              <p className="text-2xl font-bold text-primary">{dashboard.totaalAvonden}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Avonden</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center shadow-[0_8px_30px_rgba(57,83,189,0.04)]">
              <p className="text-2xl font-bold text-tertiary">{dashboard.gemiddeldeScore}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Gem. Score</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center shadow-[0_8px_30px_rgba(57,83,189,0.04)]">
              <p className="text-xs font-bold text-primary truncate">{dashboard.topSpeler.naam}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Top Speler</p>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'glass-card text-on-surface-variant shadow-[0_4px_12px_rgba(57,83,189,0.06)]'
              }`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #3953bd, #72489e)' } : {}}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Avonden Tab */}
        {activeTab === 'avonden' && (
          <div className="space-y-4">
            {avonden.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">calendar_month</span>
                <p className="text-on-surface-variant mt-4">Nog geen voltooide avonden</p>
              </div>
            ) : (
              avonden.map(avond => (
                <div
                  key={avond.id}
                  onClick={() => navigate(`/eindstand/${avond.id}`)}
                  className="glass-card rounded-xl p-5 shadow-[0_8px_30px_rgba(57,83,189,0.04)] cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(avond.id); }}
                        className="w-8 h-8 bg-error/10 text-error rounded-full flex items-center justify-center flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                    <div className="w-14 h-14 rounded-md flex flex-col items-center justify-center text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                      <p className="text-lg font-bold leading-none">{avond.aantal_rondes}</p>
                      <p className="text-[9px] font-bold uppercase">rondes</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface">{formatDatum(avond.datum)}</p>
                      <p className="text-xs text-on-surface-variant truncate">{avond.locatie || 'Geen locatie'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-on-surface">{avond.totale_pot || 0}</p>
                      <p className="text-xs text-on-surface-variant">cent</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant/40">chevron_right</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Spelers Tab */}
        {activeTab === 'spelers' && (
          <div className="space-y-4">
            {spelerStats.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">group</span>
                <p className="text-on-surface-variant mt-4">Nog geen statistieken beschikbaar</p>
              </div>
            ) : (
              spelerStats.map((stat, index) => (
                <div
                  key={stat.naam}
                  onClick={() => navigate(`/speler-detail/${encodeURIComponent(stat.naam)}`)}
                  className="glass-card rounded-xl p-5 shadow-[0_8px_30px_rgba(57,83,189,0.04)] cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                        {stat.naam.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#f97316' }}>
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-on-surface">{stat.naam}</p>
                      <p className="text-xs text-on-surface-variant">
                        {stat.aantal_avonden} avonden · Gem. {Math.round(stat.gemiddelde_punten || 0)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant/40">chevron_right</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Jaar Tab */}
        {activeTab === 'jaar' && (
          <div className="space-y-6">
            {jaarOverzicht.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">bar_chart</span>
                <p className="text-on-surface-variant mt-4">Nog geen jaardata beschikbaar</p>
              </div>
            ) : (
              (() => {
                const perJaar = {};
                jaarOverzicht.forEach(item => {
                  if (!perJaar[item.jaar]) perJaar[item.jaar] = [];
                  perJaar[item.jaar].push(item);
                });

                return Object.keys(perJaar).sort((a, b) => b - a).map(jaar => (
                  <div key={jaar} className="glass-card rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(57,83,189,0.06)]">
                    <div className="px-6 py-4 text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #3953bd, #72489e)' }}>
                      {jaar}
                    </div>
                    <div className="p-4 space-y-3">
                      {perJaar[jaar]
                        .sort((a, b) => a.totaal_punten_jaar - b.totaal_punten_jaar)
                        .map((speler, index) => (
                          <div
                            key={speler.naam}
                            className={`flex justify-between items-center p-3 rounded-md ${
                              index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                              index === 1 ? 'bg-slate-50 border border-slate-200' :
                              index === 2 ? 'bg-orange-50 border border-orange-200' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold w-4 text-on-surface-variant">{index + 1}</span>
                              <span className="font-semibold text-on-surface">{speler.naam}</span>
                            </div>
                            <span className="font-bold text-primary">{speler.totaal_punten_jaar}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </main>

      {/* BottomNavBar */}
      <nav className="bottom-nav">
        <div className="nav-item cursor-pointer" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined mb-1">leaderboard</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scoreboard</span>
        </div>
        <div className="nav-item-active">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </div>
        <div className="nav-item cursor-pointer" onClick={() => navigate('/spel-settings')}>
          <span className="material-symbols-outlined mb-1">settings</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
        </div>
      </nav>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card-strong rounded-xl p-8 max-w-sm w-full">
            <h3 className="font-bold text-xl text-on-surface mb-3">Avond verwijderen?</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Dit verwijdert alle rondes, scores en data van deze avond. Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1" disabled={isDeleting}>
                Annuleren
              </button>
              <button
                onClick={() => handleDeleteAvond(showDeleteConfirm)}
                disabled={isDeleting}
                className="flex-1 text-white font-bold py-4 rounded-md active:scale-[0.98] transition-all"
                style={{ background: '#ba1a1a' }}
              >
                {isDeleting ? 'Bezig...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
