import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import apiFetch from '../utils/api';

function Eindstand({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eindstand, setEindstand] = useState([]);
  const [rondes, setRondes] = useState([]);
  const [scorebord, setScoreboard] = useState({});
  const [datum, setDatum] = useState('');
  const [stilzittersPerRonde, setStilzittersPerRonde] = useState({});
  const [schoppenMieRonde, setSchoppenMieRonde] = useState(null);
  const [verdubbeldeRondes, setVerdubbeldeRondes] = useState({});
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
      const data = await apiFetch(`/api/spelavond/eindstand/${id}`);
      console.log('Eindstand data:', data);
      
      // Handle different response formats
      if (data.eindstand) {
        // New format with nested eindstand
        setEindstand(data.eindstand || []);
        setRondes(data.rondes || []);
        setScoreboard(data.scorebord || {});
        setDatum(data.datum || '');
        setStilzittersPerRonde(data.stilzittersPerRonde || {});
        setSchoppenMieRonde(data.schoppenMieRonde || null);
        setVerdubbeldeRondes(data.verdubbeldeRondes || {});
      } else if (Array.isArray(data)) {
        // Old format - data is eindstand array directly
        setEindstand(data);
      } else {
        // Try to extract eindstand from data
        setEindstand(data.eindstand || []);
        setRondes(data.rondes || []);
        setScoreboard(data.scorebord || {});
        setDatum(data.datum || '');
        setStilzittersPerRonde(data.stilzittersPerRonde || {});
        setSchoppenMieRonde(data.schoppenMieRonde || null);
        setVerdubbeldeRondes(data.verdubbeldeRondes || {});
      }
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

  const getPodiumKleur = (index) => {
    if (index === 0) return 'bg-yellow-400'; // Goud
    if (index === 1) return 'bg-gray-300'; // Zilver
    if (index === 2) return 'bg-orange-400'; // Brons
    return 'bg-gray-100';
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      <div className="max-w-md mx-auto p-6 min-h-screen page-container">
        <div className="page-header justify-between">
          <button onClick={() => navigate('/')} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Eindstand</h1>
          <div className="w-10"></div>
        </div>
        <div className="mt-6 card">
          <div className="text-center py-8">
            <p className="text-red-600 font-semibold mb-4">Fout bij laden eindstand</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
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
        <button onClick={() => navigate('/')} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

        {/* Volledig Scorebord */}
        {rondes.length > 0 && (
          <div className="mb-8 overflow-x-auto">
            <div className="min-w-full">
              {/* Speler namen met medailles en totaal scores */}
              <div className="flex items-start gap-2 mb-2">
                <div className="w-12 flex-shrink-0"></div>
                <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${eindstand.length}, 1fr)` }}>
                  {eindstand.map((speler, index) => {
                    const displayNaam = eindstand.length > 4 
                      ? speler.naam.split(' ').map(n => n[0]).join('').toUpperCase()
                      : speler.naam;
                    return (
                      <div key={speler.avond_speler_id} className="text-center">
                        {/* Medaille of positienummer boven naam */}
                        <div className="text-2xl mb-1 h-8 flex items-center justify-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-base font-semibold text-gray-600">{index + 1}.</span>}
                        </div>
                        {/* Naam */}
                        <div className={`font-bold p-2 rounded-xl text-sm shadow-sm mb-1 ${
                          index === 0 ? 'bg-yellow-400' : 
                          index === 1 ? 'bg-gray-300' : 
                          index === 2 ? 'bg-orange-400' : 
                          'bg-gradient-card text-white'
                        }`}>
                          {displayNaam}
                        </div>
                        {/* Totaal score */}
                        <div className="text-lg font-bold text-gray-800">
                          {speler.totaal_punten || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rondes scores */}
              <div className="max-h-96 overflow-y-auto border-t pt-2">
                {rondes.map(rondeNummer => {
                  // Bereken cumulatieve scores tot deze ronde
                  const cumulatief = {};
                  eindstand.forEach(speler => {
                    let totaal = 0;
                    for (let r = 1; r <= rondeNummer; r++) {
                      totaal += scorebord[speler.avond_speler_id]?.[r] || 0;
                    }
                    cumulatief[speler.avond_speler_id] = totaal;
                  });

                  const isSchoppenMie = rondeNummer === schoppenMieRonde;
                  const stilzitters = stilzittersPerRonde[rondeNummer] || [];
                  const isVerdubbeld = verdubbeldeRondes[rondeNummer];

                  return (
                    <div key={rondeNummer} className="flex items-center gap-2 mb-1">
                      <div className={`w-12 text-center font-semibold text-gray-600 flex-shrink-0 text-sm ${
                        isVerdubbeld ? 'border border-red-500 bg-red-50/30 rounded' : ''
                      }`}>
                        {isSchoppenMie ? '🂭' : rondeNummer}
                      </div>
                      <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${eindstand.length}, 1fr)` }}>
                        {eindstand.map(speler => {
                          const isStilzitter = stilzitters.includes(speler.avond_speler_id);
                          return (
                            <div 
                              key={`${rondeNummer}-${speler.avond_speler_id}`} 
                              className={`text-center p-1 rounded-lg text-xs ${
                                isStilzitter ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              {cumulatief[speler.avond_speler_id]}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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

        <button
          onClick={() => navigate('/analytics')}
          className="w-full btn-secondary"
        >
          Bekijk Analytics
        </button>
      </div>
    </div>
  );
}

export default Eindstand;

