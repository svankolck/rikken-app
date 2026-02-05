import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';

function Eindstand({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eindstand, setEindstand] = useState([]);
  const [rondes, setRondes] = useState([]);
  const [scorebord, setScoreboard] = useState({});
  const [datum, setDatum] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const resultaatRef = useRef(null);

  useEffect(() => {
    loadEindstand();
  }, [id]);

  const loadEindstand = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load spelavond
      const { data: spelavondData, error: spelavondError } = await supabase
        .from('spelavonden')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (spelavondError) throw spelavondError;
      setDatum(spelavondData.datum);

      // Load avond_spelers with speler names
      const { data: avondSpelersData } = await supabase
        .from('avond_spelers')
        .select('*')
        .eq('spelavond_id', spelavondData.id)
        .order('volgorde');

      // Get all spelers to map names
      const { data: allSpelersData } = await supabase
        .from('spelers')
        .select('*');

      const spelersMap = {};
      (allSpelersData || []).forEach(s => {
        spelersMap[s.id] = s.naam;
      });

      // Load rondes with spel_settings and punten_settings
      const { data: rondesData } = await supabase
        .from('rondes')
        .select('*, spel_settings(id, naam, met_maat, minimaal_slagen, punten_settings(gemaakt, overslag, nat, onderslag))')
        .eq('spelavond_id', spelavondData.id)
        .order('ronde_nummer');

      // Helper function to get stilzitters for a specific round
      const avondSpelerIds = (avondSpelersData || []).map(as => as.id);
      const getStilzitters = (rondeNr) => {
        if (!spelavondData.start_deler) return [];
        const numSpelers = avondSpelerIds.length;
        if (numSpelers < 5) return [];

        const startIndex = avondSpelerIds.indexOf(spelavondData.start_deler);
        const delerIndex = (startIndex + (rondeNr - 1)) % numSpelers;
        const delerId = avondSpelerIds[delerIndex];

        if (numSpelers === 5) return [delerId];
        if (numSpelers === 6) {
          const tegenoverIndex = (delerIndex + 3) % numSpelers;
          return [delerId, avondSpelerIds[tegenoverIndex]];
        }
        return [];
      };

      // Calculate scores
      const scoreBoard = {};
      const spelerTotalen = {};
      (avondSpelersData || []).forEach(as => {
        scoreBoard[as.id] = {};
        spelerTotalen[as.id] = 0;
      });

      // Group rounds by number
      const roundsByNr = {};
      (rondesData || []).forEach(r => {
        if (!roundsByNr[r.ronde_nummer]) roundsByNr[r.ronde_nummer] = [];
        roundsByNr[r.ronde_nummer].push(r);
      });

      Object.keys(roundsByNr).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rondeNrStr => {
        const rondeNr = parseInt(rondeNrStr);
        const rows = roundsByNr[rondeNr];
        const currentStilzitters = getStilzitters(rondeNr);
        const actieveSpelersInRonde = avondSpelerIds.filter(id => !currentStilzitters.includes(id));

        rows.forEach(r => {
          const isMetMaat = r.spel_settings?.met_maat;
          const puntenConfig = r.spel_settings?.punten_settings?.[0] || { gemaakt: 5, overslag: 1, nat: -10, onderslag: -1 };
          const multiplier = r.verdubbeld ? 2 : 1;
          const rondeScores = [];

          if (rows.length === 1) {
            // Standard Solo or Maat
            if (r.spel_settings?.naam === 'Schoppen Mie') {
              const vrouwId = r.schoppen_vrouw_id;
              const laatsteId = r.laatste_slag_id;
              const basis = puntenConfig.gemaakt || 5;

              if (vrouwId && vrouwId === laatsteId) {
                // Bonus holder of both: 4x basis
                rondeScores.push({ id: vrouwId, p: basis * 4 * multiplier });
              } else {
                if (vrouwId) rondeScores.push({ id: vrouwId, p: (puntenConfig.gemaakt || 5) * multiplier });
                if (laatsteId) rondeScores.push({ id: laatsteId, p: (puntenConfig.gemaakt || 5) * multiplier });
              }
            } else if (r.gemaakt) {
              const uitdagers = [r.uitdager_id];
              if (r.maat_id) uitdagers.push(r.maat_id);
              const tegenspelers = actieveSpelersInRonde.filter(id => !uitdagers.includes(id));
              let base = puntenConfig.gemaakt || 5;
              if (r.minimaal_slagen && r.slagen_gehaald > r.minimaal_slagen) {
                base += (puntenConfig.overslag || 1) * (r.slagen_gehaald - r.minimaal_slagen);
              }
              const finalPoints = Math.round(base * multiplier);
              tegenspelers.forEach(id => rondeScores.push({ id, p: finalPoints }));
            } else {
              const uitdagers = [r.uitdager_id];
              if (r.maat_id) uitdagers.push(r.maat_id);
              let base = Math.abs(puntenConfig.nat || 10);
              if (r.minimaal_slagen && r.slagen_gehaald < r.minimaal_slagen) {
                base += Math.abs(puntenConfig.onderslag || 1) * (r.minimaal_slagen - r.slagen_gehaald);
              }
              const soloFactor = (!isMetMaat && !r.maat_id) ? 3 : 1;
              const finalPoints = Math.round(base * soloFactor * multiplier);
              uitdagers.forEach(id => rondeScores.push({ id, p: finalPoints }));
            }
          } else {
            // Meerdere
            if (r.gemaakt) {
              const anderen = actieveSpelersInRonde.filter(id => id !== r.uitdager_id);
              const finalPoints = Math.round((puntenConfig.gemaakt || 5) * multiplier);
              anderen.forEach(id => rondeScores.push({ id, p: finalPoints }));
            } else {
              const finalPoints = Math.round((puntenConfig.gemaakt || 5) * 3 * multiplier);
              rondeScores.push({ id: r.uitdager_id, p: finalPoints });
            }
          }

          // Apply to scoreboard and totals
          rondeScores.forEach(rs => {
            if (scoreBoard[rs.id]) {
              scoreBoard[rs.id][rondeNr] = (scoreBoard[rs.id][rondeNr] || 0) + rs.p;
              spelerTotalen[rs.id] += rs.p;
            }
          });
        });
      });

      // Build eindstand array sorted by total points (LOWEST score wins)
      const eindstandArr = (avondSpelersData || []).map(as => ({
        avond_speler_id: as.id,
        naam: spelersMap[as.speler_id] || 'Onbekend',
        totaal_punten: spelerTotalen[as.id] || 0
      })).sort((a, b) => a.totaal_punten - b.totaal_punten);

      // Unique round numbers
      const rondeNummers = Object.keys(roundsByNr).map(n => parseInt(n)).sort((a, b) => a - b);

      setEindstand(eindstandArr);
      setRondes(rondeNummers);
      setScoreboard(scoreBoard);

    } catch (err) {
      console.error('Fout bij laden eindstand:', err);
      setError(err.message || 'Onbekende fout bij laden eindstand');
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (datum) => {
    if (!datum) return '';
    return new Date(datum).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleWhatsAppShare = async () => {
    if (!resultaatRef.current) return;

    try {
      const canvas = await html2canvas(resultaatRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'rikken-eindstand.png', { type: 'image/png' });

        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: 'Rikken Eindstand',
              text: 'Bekijk de eindstand van vanavond!'
            });
          } catch (err) {
            console.log('Share geannuleerd', err);
          }
        } else {
          // Fallback: download image
          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = 'rikken-eindstand.png';
          link.href = url;
          link.click();
          alert('Screenshot gedownload! Deel deze in WhatsApp.');
        }
      });
    } catch (err) {
      console.error('Fout bij maken screenshot:', err);
      alert('Fout bij maken screenshot');
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Eindstand</h1>
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
      <div className="max-w-md mx-auto p-4 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Eindstand</h1>
          <div className="w-10"></div>
        </div>
        <div className="mt-6 card">
          <div className="text-center py-8">
            <p className="text-red-600 font-semibold mb-4">Fout bij laden eindstand</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Terug naar Home
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
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Eindstand</h1>
        <div className="w-10"></div>
      </div>

      {/* Resultaat (voor screenshot) */}
      <div ref={resultaatRef} className="mt-6 bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-rikken-blue mb-1">
            🏁 Eindstand 🚀
          </h2>
          {datum && (
            <p className="text-sm text-gray-600">
              {formatDatum(datum)}
            </p>
          )}
        </div>

        {/* Podium */}
        <div className="space-y-3">
          {eindstand.map((speler, index) => (
            <div
              key={speler.avond_speler_id}
              className={`flex items-center justify-between p-4 rounded-xl shadow-sm ${index === 0 ? 'bg-yellow-400' :
                index === 1 ? 'bg-gray-300' :
                  index === 2 ? 'bg-orange-400' :
                    'bg-gray-100'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                </span>
                <span className="font-bold text-lg">{speler.naam}</span>
              </div>
              <span className="font-bold text-xl">{speler.totaal_punten}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Acties */}
      <div className="mt-6 space-y-3">
        <button
          onClick={handleWhatsAppShare}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-button hover:shadow-soft hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-lg"
        >
          <span>📱</span>
          Deel via WhatsApp
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full btn-primary"
        >
          Terug naar Home
        </button>
      </div>
    </div>
  );
}

export default Eindstand;
