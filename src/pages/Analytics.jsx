import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../utils/api';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

const COLORS = ['#7C3AED', '#1B5E7E', '#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'];

function Analytics({ user, onLogout }) {
  const navigate = useNavigate();
  const [avonden, setAvonden] = useState([]);
  const [spelerStats, setSpelerStats] = useState([]);
  const [jaarOverzicht, setJaarOverzicht] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [scoreTrends, setScoreTrends] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visibleLines, setVisibleLines] = useState({});
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

      // Set dashboard data (simple summary)
      const topSpeler = statsData.length > 0 ? statsData[0] : null;
      setDashboard({
        totaalAvonden: avondenData.length,
        gemiddeldeScore: statsData.length > 0
          ? Math.round(statsData.reduce((sum, s) => sum + (s.gemiddelde_punten || 0), 0) / statsData.length)
          : 0,
        topSpeler: topSpeler ? {
          naam: topSpeler.naam,
          overwinningen: topSpeler.aantal_avonden || 0
        } : { naam: 'Geen', overwinningen: 0 },
        trends: {
          recent: avondenData.length > 0 ? avondenData[0].totale_pot : 0,
          verschil: avondenData.length > 1 ? avondenData[0].totale_pot - avondenData[1].totale_pot : 0,
          vorig: avondenData.length > 1 ? avondenData[1].totale_pot : 0
        },
        activiteit: [],
        topSpelvormen: []
      });

      // Set score trends (empty for now, can be enhanced later)
      setScoreTrends(null);
    } catch (err) {
      console.error('Fout bij laden analytics:', err);
      alert(`Fout bij laden analytics: ${err.message || 'Onbekende fout'}`);
    }
  };

  const handleLegendClick = (dataKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const handleDeleteAvond = async (avondId) => {
    if (!user || user.role !== 'admin') {
      alert('Alleen admins kunnen avonden verwijderen');
      return;
    }

    setIsDeleting(true);
    try {
      await apiFetch(`/api/spelavond/delete/${avondId}`, {
        method: 'DELETE'
      });

      // Herlaad de data
      loadData();
      setShowDeleteConfirm(null);
      alert('Avond succesvol verwijderd');
    } catch (err) {
      console.error('Fout bij verwijderen avond:', err);
      alert(`Er is iets misgegaan bij het verwijderen: ${err.message || 'Onbekende fout'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDatum = (datum) => {
    return new Date(datum).toLocaleDateString('nl-NL');
  };

  const formatMaand = (maandStr) => {
    const [jaar, maand] = maandStr.split('-');
    const datum = new Date(jaar, parseInt(maand) - 1);
    return datum.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen pb-24 page-container">
      {/* Modern Header */}
      <div className="page-header">
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">📊 Analytics</h1>
      </div>

      {/* Modern Tabs */}
      <div className="mt-6 flex gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-shrink-0 px-4 py-3 font-semibold rounded-xl transition-all ${activeTab === 'dashboard'
            ? 'bg-gradient-main text-white shadow-button'
            : 'text-gray-600 hover:bg-white/50'
            }`}
        >
          🎯 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('avonden')}
          className={`flex-shrink-0 px-4 py-3 font-semibold rounded-xl transition-all ${activeTab === 'avonden'
            ? 'bg-gradient-main text-white shadow-button'
            : 'text-gray-600 hover:bg-white/50'
            }`}
        >
          🎲 Avonden
        </button>
        <button
          onClick={() => setActiveTab('spelers')}
          className={`flex-shrink-0 px-4 py-3 font-semibold rounded-xl transition-all ${activeTab === 'spelers'
            ? 'bg-gradient-main text-white shadow-button'
            : 'text-gray-600 hover:bg-white/50'
            }`}
        >
          👥 Spelers
        </button>
        <button
          onClick={() => setActiveTab('jaar')}
          className={`flex-shrink-0 px-4 py-3 font-semibold rounded-xl transition-all ${activeTab === 'jaar'
            ? 'bg-gradient-main text-white shadow-button'
            : 'text-gray-600 hover:bg-white/50'
            }`}
        >
          📅 Jaar
        </button>
      </div>

      {/* Modern Content */}
      <div className="mt-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Personal Welcome for linked players */}
            {user?.speler_id && spelerStats.find(s => s.speler_id === user.speler_id) && (
              <div className="card bg-gradient-main text-white p-6 shadow-button animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">👤</div>
                  <div>
                    <h2 className="text-xl font-bold">Hoi {spelerStats.find(s => s.speler_id === user.speler_id).naam}! 👋</h2>
                    <p className="text-white/80 text-sm">Jouw statistieken staan klaar.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
                  <div>
                    <p className="text-xs text-white/60 uppercase font-bold">Gemiddeld</p>
                    <p className="text-2xl font-bold">{Math.round(spelerStats.find(s => s.speler_id === user.speler_id).gemiddelde_punten)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase font-bold">Avonden</p>
                    <p className="text-2xl font-bold">{spelerStats.find(s => s.speler_id === user.speler_id).aantal_avonden}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/speler-detail/${encodeURIComponent(spelerStats.find(s => s.speler_id === user.speler_id).naam)}`)}
                  className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all"
                >
                  Bekijk volledige details →
                </button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="card text-center bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <p className="text-4xl font-bold">{dashboard.totaalAvonden}</p>
                <p className="text-sm text-white/80">Totaal Avonden</p>
              </div>
              <div className="card text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <p className="text-4xl font-bold">{dashboard.gemiddeldeScore}</p>
                <p className="text-sm text-white/80">Gem. Score</p>
              </div>
              <div className="card text-center bg-gradient-to-br from-yellow-400 to-yellow-500 text-white col-span-2 md:col-span-1">
                <p className="text-2xl font-bold">{dashboard.topSpeler.naam}</p>
                <p className="text-sm text-white/80">{dashboard.topSpeler.overwinningen} overwinningen</p>
              </div>
            </div>

            {/* Trend Card */}
            <div className="card">
              <h3 className="text-xl font-bold mb-3 text-gray-800">📈 Trend Analyse</h3>
              <div className="flex items-center justify-between p-4 bg-gradient-soft rounded-xl">
                <div>
                  <p className="text-sm text-gray-600">Laatste 5 avonden gemiddelde</p>
                  <p className="text-3xl font-bold text-gray-800">{dashboard.trends.recent}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Verschil</p>
                  <p className={`text-3xl font-bold ${dashboard.trends.verschil < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dashboard.trends.verschil > 0 ? '+' : ''}{dashboard.trends.verschil}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Vorige 5 avonden</p>
                  <p className="text-3xl font-bold text-gray-800">{dashboard.trends.vorig}</p>
                </div>
              </div>
            </div>

            {/* Activiteit Heatmap */}
            {dashboard.activiteit.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4 text-gray-800">🗓️ Activiteit (Laatste 12 Maanden)</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dashboard.activiteit.map((item) => (
                    <div key={item.maand} className="flex-shrink-0 text-center">
                      <div
                        className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-white ${item.aantal_avonden >= 4 ? 'bg-green-600' :
                          item.aantal_avonden >= 2 ? 'bg-green-400' :
                            'bg-green-200 text-gray-700'
                          }`}
                      >
                        {item.aantal_avonden}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{formatMaand(item.maand)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Trends */}
            {scoreTrends && scoreTrends.trends.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4 text-gray-800">📈 Score Trends Over Tijd</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Eindscores per avond · Klik op legenda om spelers aan/uit te zetten
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={scoreTrends.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="datum" />
                    <YAxis label={{ value: 'Punten', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend
                      onClick={(e) => handleLegendClick(e.dataKey)}
                      wrapperStyle={{ cursor: 'pointer' }}
                    />
                    {scoreTrends.spelers.map((naam, index) => (
                      visibleLines[naam] && (
                        <Line
                          key={naam}
                          type="monotone"
                          dataKey={naam}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      )
                    ))}
                    {visibleLines['Totaal'] && (
                      <Line
                        type="monotone"
                        dataKey="Totaal"
                        stroke="#000000"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 5 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[...scoreTrends.spelers, 'Totaal'].map((naam, index) => {
                    const color = naam === 'Totaal' ? '#000000' : COLORS[index % COLORS.length];
                    return (
                      <button
                        key={naam}
                        onClick={() => handleLegendClick(naam)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${visibleLines[naam]
                          ? 'shadow-sm'
                          : 'opacity-50 grayscale'
                          }`}
                        style={{
                          backgroundColor: visibleLines[naam] ? color : '#E5E7EB',
                          color: visibleLines[naam] ? '#FFFFFF' : '#6B7280'
                        }}
                      >
                        {naam}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Spelvormen */}
            {dashboard.topSpelvormen.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-bold mb-4 text-gray-800">🎮 Top Spelvormen</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.topSpelvormen}>
                    <XAxis dataKey="naam" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="aantal" fill="#7C3AED" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Avonden Tab */}
        {activeTab === 'avonden' && (
          <div className="space-y-2">
            {avonden.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-400 text-lg">Nog geen voltooide avonden</p>
                <p className="text-gray-300 text-sm mt-2">Start je eerste avond! 🎲</p>
              </div>
            ) : (
              avonden.map(avond => (
                <div
                  key={avond.id}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-card p-4 border border-white/20 hover:shadow-soft transition-all cursor-pointer hover:scale-[1.01]"
                  onClick={() => navigate(`/eindstand/${avond.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {/* Delete button voor admins - links van ronde blokje */}
                    {user && user.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(avond.id);
                        }}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors flex-shrink-0"
                        title="Avond verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {/* Ronde nummer blokje links */}
                    <div className="text-center bg-gradient-main text-white px-3 py-2 rounded-xl flex-shrink-0">
                      <p className="text-xl font-bold">{avond.aantal_rondes}</p>
                      <p className="text-xs">rondes</p>
                    </div>

                    {/* Datum en locatie in het midden */}
                    <div className="flex-1">
                      <p className="font-bold text-base text-gray-800">{formatDatum(avond.datum)}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        📍 {avond.locatie || 'Geen locatie'}
                      </p>
                    </div>

                    {/* Totale pot rechts */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-800">{avond.totale_pot || 0}</p>
                      <p className="text-xs text-gray-500">cent</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'spelers' && (
          <div className="space-y-4">
            {spelerStats.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-400 text-lg">Nog geen statistieken beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {spelerStats.map(stat => (
                  <div
                    key={stat.naam}
                    className="card hover:shadow-soft transition-all cursor-pointer"
                    onClick={() => navigate(`/speler-detail/${encodeURIComponent(stat.naam)}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-gray-800">{stat.naam}</p>
                        <p className="text-sm text-gray-600">
                          {stat.aantal_avonden} avonden · Gem. {Math.round(stat.gemiddelde_punten || 0)} ·
                          Beste: {Math.round(stat.beste_score || 0)}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'jaar' && (
          <div className="space-y-5">
            {jaarOverzicht.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-400 text-lg">Nog geen jaardata beschikbaar</p>
              </div>
            ) : (
              (() => {
                // Groepeer per jaar
                const perJaar = {};
                jaarOverzicht.forEach(item => {
                  if (!perJaar[item.jaar]) {
                    perJaar[item.jaar] = [];
                  }
                  perJaar[item.jaar].push(item);
                });

                return Object.keys(perJaar).sort((a, b) => b - a).map(jaar => (
                  <div key={jaar} className="card">
                    <div className="bg-gradient-main text-white px-6 py-4 -mx-6 -mt-6 mb-6 rounded-t-3xl">
                      <h3 className="text-2xl font-bold">📅 {jaar}</h3>
                    </div>
                    <div className="space-y-3">
                      {perJaar[jaar]
                        .sort((a, b) => a.totaal_punten_jaar - b.totaal_punten_jaar)
                        .map((speler, index) => (
                          <div
                            key={speler.naam}
                            className={`flex justify-between items-center p-4 rounded-xl ${index === 0 ? 'bg-gradient-to-r from-yellow-200 to-yellow-300' :
                              index === 1 ? 'bg-gradient-to-r from-gray-200 to-gray-300' :
                                index === 2 ? 'bg-gradient-to-r from-orange-200 to-orange-300' :
                                  'bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                              </span>
                              <span className="font-bold text-gray-800">{speler.naam}</span>
                            </div>
                            <span className="text-xl font-bold bg-white px-4 py-2 rounded-xl shadow-sm">
                              {speler.totaal_punten_jaar} cent
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Avond verwijderen?</h3>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je deze avond wilt verwijderen? Dit verwijdert alle rondes, scores en gerelateerde data. Deze actie kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 btn-secondary"
                disabled={isDeleting}
              >
                Annuleren
              </button>
              <button
                onClick={() => handleDeleteAvond(showDeleteConfirm)}
                className="flex-1 btn-primary bg-red-500 hover:bg-red-600"
                disabled={isDeleting}
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

