import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiFetch from '../utils/api';

function SpelerDetail({ user, onLogout }) {
  const { naam } = useParams();
  const navigate = useNavigate();
  const [speler, setSpeler] = useState(null);
  const [avonden, setAvonden] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSpelerData();
  }, [naam]);

  const loadSpelerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const decodedNaam = decodeURIComponent(naam);
      const data = await apiFetch(`/api/analytics/speler/${encodeURIComponent(decodedNaam)}`);
      setSpeler(data.speler);
      setAvonden(data.avonden || []);
      setStats(data.stats);
    } catch (err) {
      console.error('Fout bij laden speler data:', err);
      setError(err.message || 'Onbekende fout bij laden speler data');
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (datum) => {
    return new Date(datum).toLocaleDateString('nl-NL');
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/analytics')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Speler Details</h1>
          <div className="w-10"></div>
        </div>
        <div className="mt-6 card text-center py-16">
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/analytics')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Speler Details</h1>
          <div className="w-10"></div>
        </div>
        <div className="mt-6 card">
          <div className="text-center py-8">
            <p className="text-red-600 font-semibold mb-4">Fout bij laden speler data</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/analytics')} className="btn-primary">
              Terug naar Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!speler) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/analytics')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Speler Details</h1>
          <div className="w-10"></div>
        </div>
        <div className="mt-6 card">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Speler niet gevonden</p>
            <button onClick={() => navigate('/analytics')} className="btn-primary">
              Terug naar Analytics
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen page-container">
      {/* Header */}
      <div className="page-header justify-between">
        <button onClick={() => navigate('/analytics')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-2xl font-bold">{speler.naam}</h1>
        <div className="w-10"></div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="card text-center bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-3xl font-bold">{stats?.aantal_avonden || 0}</p>
          <p className="text-sm text-white/80">Avonden</p>
        </div>
        <div className="card text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-3xl font-bold">{Math.round(stats?.gemiddelde_punten || 0)}</p>
          <p className="text-sm text-white/80">Gem. Score</p>
        </div>
        <div className="card text-center bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-3xl font-bold">{Math.round(stats?.beste_score || 0)}</p>
          <p className="text-sm text-white/80">Beste Score</p>
        </div>
        <div className="card text-center bg-gradient-to-br from-red-500 to-red-600 text-white">
          <p className="text-3xl font-bold">{Math.round(stats?.slechtste_score || 0)}</p>
          <p className="text-sm text-white/80">Slechtste</p>
        </div>
      </div>

      {/* Avonden Lijst */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Gespeelde Avonden</h2>
        {avonden.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400">Nog geen avonden gespeeld</p>
          </div>
        ) : (
          <div className="space-y-2">
            {avonden.map(avond => (
              <div
                key={avond.id}
                className="card hover:shadow-soft transition-all cursor-pointer"
                onClick={() => navigate(`/eindstand/${avond.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{formatDatum(avond.datum)}</p>
                    <p className="text-sm text-gray-600">
                      {avond.locatie || 'Geen locatie'} · {avond.aantal_rondes} rondes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">{avond.totaal_punten || 0}</p>
                    <p className="text-xs text-gray-500">punten</p>
                  </div>
                  <div className="text-gray-400 ml-2">
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

      {/* Back Button */}
      <div className="mt-6">
        <button onClick={() => navigate('/analytics')} className="w-full btn-primary">
          Terug naar Analytics
        </button>
      </div>
    </div>
  );
}

export default SpelerDetail;

