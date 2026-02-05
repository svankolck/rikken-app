import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import apiFetch from '../utils/api';

const COLORS = ['#7C3AED', '#1B5E7E', '#DC2626', '#F59E0B', '#10B981', '#3B82F6'];

function AvondDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await apiFetch(`/api/analytics/avond/${id}/details`);
      const jsonData = await res.json();
      setData(jsonData);
      setLoading(false);
    } catch (err) {
      console.error('Fout bij laden avond details:', err);
      setLoading(false);
    }
  };

  const formatDatum = (datum) => {
    return new Date(datum).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Transform data voor line chart (score evolutie)
  const getScoreEvolutieData = () => {
    if (!data?.scoreEvolutie) return [];

    const rondeNummers = [...new Set(data.scoreEvolutie.map(s => s.ronde_nummer))];

    return rondeNummers.map(rondeNummer => {
      const punt = { ronde: rondeNummer };
      data.spelers.forEach(speler => {
        const score = data.scoreEvolutie.find(
          s => s.ronde_nummer === rondeNummer && s.naam === speler.naam
        );
        punt[speler.naam] = score ? score.cumulatief : 0;
      });
      return punt;
    });
  };

  // Transform data voor bar chart (eindstand)
  const getEindstandData = () => {
    if (!data?.spelers) return [];
    return data.spelers.map(speler => ({
      naam: speler.naam,
      punten: speler.totaal_punten || 0
    }));
  };

  // Transform data voor pie chart (spelvormen)
  const getSpelvormenData = () => {
    if (!data?.spelvormen) return [];
    return data.spelvormen.map(s => ({
      name: s.spelvorm,
      value: s.aantal
    }));
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-screen page-container">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-rikken-blue"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-screen page-container">
        <div className="text-center py-20">
          <p className="text-gray-600">Geen data gevonden</p>
        </div>
      </div>
    );
  }

  const scoreEvolutieData = getScoreEvolutieData();
  const eindstandData = getEindstandData();
  const spelvormenData = getSpelvormenData();

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen pb-24 page-container">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/analytics')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">📊 Avond Details</h1>
      </div>

      {/* Avond Info */}
      <div className="mt-6 card bg-gradient-main text-white">
        <h2 className="text-2xl font-bold mb-2">{formatDatum(data.avond.datum)}</h2>
        <p className="text-white/80">📍 {data.avond.locatie || 'Geen locatie'}</p>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-rikken-blue">{data.rondes.length}</p>
          <p className="text-sm text-gray-600">Rondes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-rikken-blue">{data.spelers.length}</p>
          <p className="text-sm text-gray-600">Spelers</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-rikken-blue">{data.verdubbelaarStats.aantal_verdubbeld}</p>
          <p className="text-sm text-gray-600">Verdubbeld</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-rikken-blue">{data.spelvormen.length}</p>
          <p className="text-sm text-gray-600">Spelvormen</p>
        </div>
      </div>

      {/* Score Evolutie */}
      <div className="mt-6 card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">📈 Score Evolutie</h3>
        <p className="text-sm text-gray-600 mb-4">Cumulatieve scores per ronde</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreEvolutieData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ronde" label={{ value: 'Ronde', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Punten', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {data.spelers.map((speler, index) => (
              <Line
                key={speler.naam}
                type="monotone"
                dataKey={speler.naam}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Eindstand Bar Chart */}
      <div className="mt-6 card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">🏆 Eindstand</h3>
        <p className="text-sm text-gray-600 mb-4">Totale scores (laagste wint)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={eindstandData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="naam" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="punten" fill="#7C3AED">
              {eindstandData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  index === 0 ? '#FFD700' : // Goud
                    index === 1 ? '#C0C0C0' : // Zilver
                      index === 2 ? '#CD7F32' : // Brons
                        COLORS[index % COLORS.length]
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        {/* Spelvormen Pie Chart */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 text-gray-800">🎮 Spelvormen</h3>
          <p className="text-sm text-gray-600 mb-4">Verdeling gespeelde spellen</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={spelvormenData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {spelvormenData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Spelvormen Lijst */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4 text-gray-800">📋 Spelvormen Details</h3>
          <div className="space-y-3">
            {data.spelvormen.map((spelvorm, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-800">{spelvorm.spelvorm}</p>
                  <p className="text-sm text-gray-600">
                    {spelvorm.successrate ? `${spelvorm.successrate.toFixed(0)}% succes` : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-rikken-blue">{spelvorm.aantal}x</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rondes Tabel */}
      <div className="mt-6 card">
        <h3 className="text-xl font-bold mb-4 text-gray-800">📝 Rondes Overzicht</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-soft">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Spelvorm</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Uitdager</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Maat</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Resultaat</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">2x</th>
              </tr>
            </thead>
            <tbody>
              {data.rondes.map((ronde) => (
                <tr key={ronde.ronde_nummer} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold">{ronde.ronde_nummer}</td>
                  <td className="py-3 px-4">{ronde.spelvorm}</td>
                  <td className="py-3 px-4">{ronde.uitdager}</td>
                  <td className="py-3 px-4">{ronde.maat || '-'}</td>
                  <td className="text-center py-3 px-4">
                    {ronde.gemaakt === 1 ? (
                      <span className="text-green-600 font-semibold">✓ Gemaakt</span>
                    ) : ronde.gemaakt === 0 ? (
                      <span className="text-red-600 font-semibold">✗ Nat</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    {ronde.verdubbeld === 1 ? (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">2x</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actieknoppen */}
      <div className="mt-6 space-y-3">
        <button
          onClick={() => navigate(`/eindstand/${id}`)}
          className="w-full btn-primary"
        >
          🏆 Bekijk Eindstand
        </button>
        <button
          onClick={() => navigate('/analytics')}
          className="w-full btn-secondary"
        >
          ← Terug naar Analytics
        </button>
      </div>
    </div>
  );
}

export default AvondDetail;


